/**********
 * LEGACY *
 **********
 *
 * use api.go instead!
 */

package feline

import (
	"encoding/json"
	"errors"
	"html/template"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ruuzia/lynx/feline/database"
)

var lynxSessions = map[database.UserId]*Session {}

//--------------------------------------------------------

type Session struct {
    username string;
    id database.UserId;
    builderPage BuilderPage;
}
type SessionToken string

type BuilderPage struct {
    Title string `json:"title"`
    Text string `json:"text"`
    ReturnTo string
    ErrorMsg string
}

type HomePage struct {
    LineSets []database.LineSetInfo
}

//---------------------------------------------------------

func StartSession(w http.ResponseWriter, r *http.Request, user database.User) (err error) {
    debug.Printf("Starting session %s\n", user.Name)
    err = Login(w, &user)
	if err != nil {
		debug.Println("[StartSession] error:", err.Error())
		return err
	}
	getOrCreateSession(user.Id)
    http.Redirect(w, r, "/", http.StatusFound)
	return
}

func ActiveSession(w http.ResponseWriter, r *http.Request) (*Session, error) {
    userId, err := CheckAuth(w, r)
	debug.Printf("[ActiveSesson] userId=%d\n", int(userId))
    if err != nil {
        return nil, err
    }
    return getOrCreateSession(userId), nil
}

func getOrCreateSession(userId database.UserId) *Session {
	if _, exists := lynxSessions[userId]; !exists {
		username, err := database.GetUsername(userId);
		if err != nil {
			debug.Println("[getOrCreateSession] ERROR querying database")
			return nil;
		}
		lynxSessions[userId] = &Session{
			username: username,
			id: userId,
		}
	}
	return lynxSessions[userId]
}

//----------------------------------------------------------------
// BUILDER {{{

func handleUpdateBuilder(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    err = json.NewDecoder(r.Body).Decode(&session.builderPage)
    if err != nil {
        debug.Println(err.Error())
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    debug.Printf("title: %s\n", session.builderPage.Title)

    
    w.WriteHeader(http.StatusOK)
}

func handleFinishBuilder(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    tempFile := session.username + "lineset" + strconv.FormatInt(time.Now().Unix(), 10);
    f, err := os.Create(tempFile)
    if err != nil {
        debug.Println("Error: failed to write to file")
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    f.WriteString(session.builderPage.Text);
    f.Close();

    err = database.AddLineSet(session.id, session.builderPage.Title)
    if err != nil {
        http.Error(w, "Error adding set " + err.Error(), http.StatusInternalServerError)
        return
    }

    lines, err := parseLineData(session.builderPage.Text)
    for _, line := range lines {
		lineSetId, err := database.GetLineSetId(session.id, session.builderPage.Title);
		if err != nil {
			http.Error(w, "Error adding set " + err.Error(), http.StatusInternalServerError)
			return
		}
		err = database.AddLine(session.id, lineSetId, &line)
		if err != nil {
			http.Error(w, "Error adding set " + err.Error(), http.StatusInternalServerError)
			return
		}
    }

    err = os.Remove(tempFile)
    if err != nil {
        debug.Println(err)
    }

    http.Redirect(w, r, "/#home", http.StatusFound)
}

func parseLineData(data string) (lineData []database.LineData, err error) {
    chunks := strings.Split(data, "\n\n")
    for _,chunk := range chunks {
        lines := strings.Split(chunk, "\n")
        if len(lines) == 0 {
            continue;
        } else if len(lines) < 2 {
            return nil, errors.New("Invalid line file!")
        }
        cue := lines[0]
        text := strings.Join(lines[1:], "\n")
        item := database.LineData {
            Index: len(lineData),
            Cue: cue,
            Line: text,
            Starred: false,
            Notes: "",
        }
        lineData = append(lineData, item)
    }
    return lineData, err
}

// END BUILDER
// }}} ----------------------------------------------------------------

func handleLineNotes(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r) 
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    type LineNotesPayload struct {
        Line int `json:"line"`
        Notes string `json:"text"`
    }
    var payload LineNotesPayload;
    err = json.NewDecoder(r.Body).Decode(&payload)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    debug.Println("line: ", payload.Line)
    debug.Println("notes: ", payload.Notes)
    err = database.LineSetNotes(session.id, payload.Line, payload.Notes);
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

/******************************
******************************/

func serveBuilder(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }

    r.ParseForm()
    if r.Form.Get("returnTo") != "" {
        session.builderPage.ReturnTo = "/" + r.Form.Get("returnTo")
    }

    t, err := template.ParseFiles("./web/templates/builder.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    debug.Println(session.builderPage)
    t.Execute(w, &session.builderPage)
}

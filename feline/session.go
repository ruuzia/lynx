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
    save SessionData;
    builderPage BuilderPage;
}
type SessionToken string
type UserId int

type SessionData struct {
    LineFile string `json:"lineSet"`
    ReviewMethod string `json:"reviewMethod"`
}

type BuilderPage struct {
    Title string `json:"title"`
    Text string `json:"text"`
    ReturnTo string
    ErrorMsg string
}

type HomePage struct {
    Name string
    State SessionData
    LineSets []string
}

//---------------------------------------------------------

func StartSession(w http.ResponseWriter, r *http.Request, user database.User) {
    debug.Printf("Starting session %s\n", user.Name)
    Login(w, &user)
    if _, exists := lynxSessions[user.Id]; !exists {
        lynxSessions[user.Id] = &Session{
            username: user.Name,
            id: user.Id,
            save: SessionData{
                LineFile: "",
                ReviewMethod: "",
            },
        }
    }

    http.Redirect(w, r, "/", http.StatusFound)
}


/******************************
 *** SESSION API HANDLERS *****
 *******************************/

func handleStarLine(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r) 
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    type StarLinePayload struct {
        Line int `json:"line"`
        Starred bool `json:"starred"`
    }
    var payload StarLinePayload;
    err = json.NewDecoder(r.Body).Decode(&payload)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    debug.Println("handleStarLine")
    debug.Println("starred: ", payload.Starred)
    debug.Println("line: ", payload.Line)

    err = database.LineSetFlagged(session.id, payload.Line, payload.Starred)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func handleListLineSets(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    names, err := database.GetLineSets(session.id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(&names)
}

func handleGetLineData(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    r.ParseForm()
    title := r.Form.Get("title")
    debug.Println("handleGetLineData", title, r.Form)

    lines, err := database.GetLineData(session.id, title)
    if err != nil {
        debug.Println(err.Error())
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    if (r.Form.Get("setCurrent") == "true") {
        session.save.LineFile = title;
        debug.Println("Saving line set as current", session.save.LineFile);
    }

    json.NewEncoder(w).Encode(&lines)
}

//-------------------
// State load/save

func handlePullSessionState(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    err = json.NewEncoder(w).Encode(&session.save)
    if err != nil {
        debug.Println(err.Error())
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
}

func handlePushSessionState(w http.ResponseWriter, r *http.Request) {
    debug.Println("handlePushSessionState");
    session, err := ActiveSession(w, r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    var data SessionData
    err = json.NewDecoder(r.Body).Decode(&data)
    debug.Println("PushSessionState", data)
    if err != nil {
        debug.Println(err.Error())
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    session.save = data
    w.WriteHeader(http.StatusOK)
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
        database.AddLine(session.id, session.builderPage.Title, &line)
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
            Id: len(lineData),
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

func serveHome(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    lineSets, err  := database.GetLineSets(session.id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    data := HomePage {
        Name: session.username,
        State: session.save,
        LineSets: lineSets,
    }
    debug.Println("serveHome", data, session.save.LineFile);

    t, err := template.ParseFiles("./web/templates/index.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, data)
}

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

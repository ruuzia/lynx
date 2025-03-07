package feline

import (
	"encoding/json"
	"errors"
	"html/template"
	"net/http"
	"os"
	"os/exec"
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

    // DEPRECATE
    location string;
    file string;
    page interface{};
    builderPage BuilderPage;
}
type SessionToken string
type UserId int

type SessionData struct {
    LineFile string `json:"lineSet"`
    ReviewMethod string `json:"reviewMethod"`
}

type IndexPage struct {
    Name string
}

type BuilderPage struct {
    Title string `json:"title"`
    Text string `json:"text"`
    ReturnTo string
    ErrorMsg string
}

type LineReviewerPage struct {
    Lines []database.LineData
    ReviewMethod string
}

type HomePage struct {
    ActiveSession string
    Name string
    State SessionData
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

/**********************************
 *** SESSION PAGE DISPATCHERS *****
 **********************************/

func dispatchSettings(w http.ResponseWriter, r *http.Request, session *Session) {
    type ReviewTypeDesc struct {
        Code string
        Title string
        Description string
    }

    type SettingsPage struct {
        Options []ReviewTypeDesc
    }

    session.location = "settings"
    session.page = SettingsPage{
        []ReviewTypeDesc{
            {
                Code: "in_order",
                Title: "In order",
                Description: "Review lines in order",
            },
            {
                Code: "random",
                Title: "Random order",
                Description: "Review lines from cues in a random order",
            },
            {
                Code: "cues",
                Title: "Cues from lines",
                Description: "Advanced: recall cues from lines",
            },
            {
                Code: "no_cues",
                Title: "No cues",
                Description: "Advanced: recall lines only based on order",
            },
        },
    }
    
    sessionUpdatePage(w, r)
}

type FileSelectPage struct {
    Files []string
}

func dispatchFileSelect(w http.ResponseWriter, r *http.Request, session *Session) {
    debug.Println("dispatchFileSelect")

    files, err := getFileList(session)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
    debug.Print(files)

    session.location = "fileselect"
    session.page = FileSelectPage {
        Files: files,
    }
    sessionUpdatePage(w, r)
}

func dispatchLineReviewer(w http.ResponseWriter, r *http.Request, session *Session, reviewMethod string) {
    lines, err := database.GetLineData(session.id, session.file)
    if err != nil {
        debug.Println(err.Error())
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    session.location = "linereviewer"
    session.page = LineReviewerPage {
        Lines: lines,
        ReviewMethod: reviewMethod,
    }
    sessionUpdatePage(w, r)

}

type SessionFinishedPage struct {
}

func dispatchSessionFinished(w http.ResponseWriter, r *http.Request, session *Session) {
    session.location = "sessionfinished"
    session.page = SessionFinishedPage { }
    sessionUpdatePage(w, r)
}

/******************************
 *******************************/

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
    out, err := runLynxCommand(session.username, "add-set", session.builderPage.Title, "../" + tempFile)
    debug.Printf("add-set: %s\n", out)
    if err != nil {
        message := string(err.(*exec.ExitError).Stderr)
        debug.Println(err.Error(), message)
        session.builderPage.ErrorMsg = "Error in format. " + message
        http.Redirect(w, r, "/builder", http.StatusFound)
        return
    }

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

    if session.builderPage.ReturnTo == "/session" && session.location == "fileselect" {
        session.file = session.builderPage.Title
        dispatchSettings(w, r, session)
    }

    http.Redirect(w, r, session.builderPage.ReturnTo, http.StatusFound)
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

func handleStartSession(w http.ResponseWriter, r *http.Request) {
    userId, err := CheckAuth(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    dispatchFileSelect(w, r, lynxSessions[userId])
}

func handleSettings(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    if session.location != "settings" {
        sendPage(w, session)
        return
    }

    r.ParseForm()
    debug.Println(r.Form)
    reviewType := r.Form.Get("reviewtype")
    if reviewType == "" {
        http.Error(w, "Expected reviewtype", http.StatusInternalServerError)
        return
    }

    dispatchLineReviewer(w, r, session, reviewType)
}

func handleFileSelect(w http.ResponseWriter, r *http.Request) {
    debug.Println("handleFileSelect")
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    if session.location != "fileselect" {
        sendPage(w, session)
        return
    }

    r.ParseForm();
    file := r.Form.Get("file")
    if file == "" {
        http.Error(w, "Missing file", http.StatusBadRequest)
        return
    }
    index, err := strconv.Atoi(file);
    if err != nil {
        http.Error(w, "Invalid index", http.StatusBadRequest)
        return
    }

    data := session.page.(FileSelectPage)

    session.file = data.Files[index]
    dispatchSettings(w, r, session)
}

/******************************
******************************/

func serveHome(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    data := HomePage {
        Name: session.username,
        ActiveSession: session.save.LineFile,
        State: session.save,
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

func sessionUpdatePage(w http.ResponseWriter, r *http.Request) {
    // We redirect because the requests made through html forms
    // require it
    http.Redirect(w, r, "/session", http.StatusFound)
}


// Serves the current page in our session
// or redirects to login if not authenticated
func sessionPage(w http.ResponseWriter, r *http.Request) {
    session, err := ActiveSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    
    sendPage(w, session)
    return
}

func sendPage(w http.ResponseWriter, session *Session) {
    t, err := template.ParseFiles("web/templates/" + session.location + ".html")
    if err != nil {
        debug.Println("Error parsing template file")
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, session.page)
}

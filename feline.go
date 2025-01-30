package main

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

    "context"
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
    "golang.org/x/crypto/bcrypt"
)

type Session struct {
    username string;
    location string;
    file string;
    page interface{};
    builderPage BuilderPage;
}

type SessionToken string
type UserId string

var loginSessions = map[SessionToken] UserId {}
var lynxSessions = map[UserId]*Session {}
var db *sql.DB
var debug = log.New(os.Stdout, "debug: ", log.Lshortfile)

type IndexPage struct {
    Name string
}

type LoginPage struct {
    ErrorMessage string
}

type SignupPage struct {
    ErrorMessage string
}

type BuilderPage struct {
    Title string `json:"title"`
    Text string `json:"text"`
    ErrorMsg string
}

type Credentials struct {
    Host string `json:"host"`
    User string `json:"user"`
    Passsword string `json:"password"`
    Database string `json:"database"`
}

func main() {
    openDatabase()
    buildLynx()
    http.HandleFunc("/", serveHome)
    http.HandleFunc("/builder", serveBuilder)
    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == "GET" {
            serveLogin(w, LoginPage{})
        } else {
            handleLogin(w, r)
        }
    })
    http.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == "GET" {
            serveSignup(w, SignupPage{})
        } else {
            handleSignup(w, r)
        }
    })
    fs := http.FileServer(http.Dir("./web/static/"))
    http.Handle("/static/", http.StripPrefix("/static/", fs))
    http.HandleFunc("/session", sessionPage)

    http.HandleFunc("/feline/logout", handleLogout)
    http.HandleFunc("/feline/fileselect", handleFileSelect)
    http.HandleFunc("/feline/reviewselect", handleReviewSelect)
    http.HandleFunc("/feline/startsession", handleStartSession)
    http.HandleFunc("/feline/starline", handleStarLine)
    http.HandleFunc("/feline/linenotes", handleLineNotes)
    http.HandleFunc("/feline/updatebuilder", handleUpdateBuilder)
    http.HandleFunc("/feline/finishbuilder", handleFinishBuilder)

    fmt.Println("Listening to localhost:2323")
    log.Fatal(http.ListenAndServe(":2323", nil))
}

func serveLogin(w http.ResponseWriter, data LoginPage) {
    t, err := template.ParseFiles("./web/templates/login.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, data)
}

func serveSignup(w http.ResponseWriter, data SignupPage) {
    t, err := template.ParseFiles("./web/templates/signup.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, data)
}

func serveHome(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }

    type HomePage struct {
        ActiveSession bool
        Name string
    }
    data := HomePage {
        ActiveSession: session.location != "",
        Name: session.username,
    }

    t, err := template.ParseFiles("./web/templates/index.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, data)
}

func serveBuilder(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }

    t, err := template.ParseFiles("./web/templates/builder.html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    debug.Println(session.builderPage)
    t.Execute(w, &session.builderPage)
}

func redirectLogin(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/login", http.StatusFound)
}

func checkAuth(w http.ResponseWriter, r *http.Request) (UserId, error) {
    cookie, err := r.Cookie("session_token")
    if err != nil {
        if err == http.ErrNoCookie {
            debug.Println("No session_token cookie. Redirecting to /login")
            return "", err
        }
        log.Fatal(err)
    }

    token := SessionToken(cookie.Value)

    userId, is_authenticated := loginSessions[token]
    if !is_authenticated {
        debug.Println("Invalid session_token cookie. Redirecting to /login")
        return "", errors.New("Invalid token")
    }

    return userId, nil
}

func activeSession(w http.ResponseWriter, r *http.Request) (*Session, error) {
    userId, err := checkAuth(w, r)
    if err != nil {
        return nil, err
    }
    return lynxSessions[userId], nil
}

func sessionUpdatePage(w http.ResponseWriter, r *http.Request) {
    // We redirect because the requests made through html forms
    // require it
    http.Redirect(w, r, "/session", http.StatusFound)
}

// Serves the current page in our session
// or redirects to login if not authenticated
func sessionPage(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r)
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

// Just a helper function to run shell commands from a particular
// directory
func execute(dir string, exe string, arg ...string) {
    cmd := exec.Command(exe, arg...)
    cmd.Dir = dir
    out, err := cmd.CombinedOutput()
    fmt.Printf("%s\n", out)
    if err != nil {
        log.Fatal(err)
    }
    
}

// Mostly a convenience so that I don't have to do it myself :>
func buildLynx() {
    execute("", "mkdir", "-p", "build")
    execute("./build/", "cmake", "..", "-G", "Ninja")
    execute("./build/", "ninja")
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
    cookie, err := r.Cookie("session_token")
    if err != nil {
        if err == http.ErrNoCookie {
            // Not logged in
            redirectLogin(w, r)
            return
        }
        log.Fatal(err)
    }

    token := SessionToken(cookie.Value)

    delete(loginSessions, token)
    redirectLogin(w, r)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
    debug.Printf("handleLogin\n")
    r.ParseForm()
    fmt.Print(r.Form)
    username := r.Form.Get("username")
    password := r.Form.Get("password")
    if username == "" || password == "" {
        http.Error(w, "Missing user authentication", http.StatusBadRequest)
        return
    }

    user, err := GetUser(username)
    if err == sql.ErrNoRows {
        serveLogin(w, LoginPage{
            ErrorMessage: "Hmmm, this username was not found in the database.",
        })
        return
    } else if err != nil {
        log.Fatal(err)
    }

    if !verifyPassword(password, user.passwordHash) {
        serveLogin(w, LoginPage{
            ErrorMessage: "Sorry, password incorrect.",
        })
        return
    }

    startSession(w, r, UserId(username), username)
}

func handleSignup(w http.ResponseWriter, r *http.Request) {
    debug.Printf("handleSignup\n")
    r.ParseForm()
    username := r.Form.Get("username")
    password := r.Form.Get("password")

    if len(username) < 3 {
        http.Error(w, "Username must be at least 3 characters long!", http.StatusBadRequest)
        return
    }

    if _, err := GetUser(username); err == nil {
        serveSignup(w, SignupPage{
            ErrorMessage: "This user already exists!",
        })
        return
    }

    debug.Printf("[handleSignup] Adding new password: (%s, %s)\n", username, password)
    q := `INSERT INTO users (name, password_hash) VALUES (?, ?);`
    hashed, err := hashPassword(password);
    if err != nil {
        http.Error(w, "Error hashing password: " + err.Error(), http.StatusInternalServerError)
        return
    }
    _, err = db.Exec(q, username, hashed)
    if err != nil {
        http.Error(w, "Error accessing database: " + err.Error(), http.StatusInternalServerError)
        return
    }

    startSession(w, r, UserId(username), username)
}

/**********************************
 *** SESSION PAGE DISPATCHERS *****
 **********************************/

func dispatchReviewSelect(w http.ResponseWriter, r *http.Request, session *Session) {
    type ReviewTypeDesc struct {
        Code string
        Title string
        Description string
    }

    type ReviewSelectPage struct {
        Options []ReviewTypeDesc
    }

    session.location = "reviewselect"
    session.page = ReviewSelectPage{
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

    files, err := get_file_list(session)
    if err != nil {
        log.Fatal(err)
    }
    debug.Print(files)

    session.location = "fileselect"
    session.page = FileSelectPage {
        Files: files,
    }
    sessionUpdatePage(w, r)
}

func dispatchLineReviewer(w http.ResponseWriter, r *http.Request, session *Session) {
    out, err := runLynxCommand(session.username, "lines", "--file", session.file)
    if err != nil {
        debug.Fatal(err)
    }
    var lines []LineData
    err = json.Unmarshal(out, &lines)
    if err != nil {
        debug.Fatal(err)
    }

    type LineReviewerPage struct {
        Lines []LineData
    }

    session.location = "linereviewer"
    session.page = LineReviewerPage {
        Lines: lines,
    }
    sessionUpdatePage(w, r)

}

type LineData struct {
    Id int `json:"id"`
    Cue string `json:"cue"`
    Line string `json:"line"`
    Starred bool `json:"starred"`
    Notes string `json:"notes"`
};


type SessionFinishedPage struct {
}

func dispatchSessionFinished(w http.ResponseWriter, r *http.Request, session *Session) {
    session.location = "sessionfinished"
    session.page = SessionFinishedPage { }
    sessionUpdatePage(w, r)
}


/******************************
 *** SESSION API HANDLERS *****
 *******************************/

func handleStarLine(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r) 
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
    debug.Println("starred: ", payload.Starred)
    debug.Println("line: ", strconv.Itoa(payload.Line))

    out, err := runLynxCommand(session.username, "set-flagged", session.file, strconv.Itoa(payload.Line), strconv.FormatBool(payload.Starred))
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    debug.Println(string(out))
}

func handleUpdateBuilder(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r)
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
    session, err := activeSession(w, r)
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

    err = os.Remove(tempFile)
    if err != nil {
        debug.Println(err)
    }

    http.Redirect(w, r, "/", http.StatusFound)
}

func handleLineNotes(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r) 
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
    runLynxCommand(session.username, "set-notes", session.file, strconv.Itoa(payload.Line), payload.Notes)
}

func handleStartSession(w http.ResponseWriter, r *http.Request) {
    userId, err := checkAuth(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    dispatchFileSelect(w, r, lynxSessions[userId])
}

func handleReviewSelect(w http.ResponseWriter, r *http.Request) {
    session, err := activeSession(w, r)
    if err != nil {
        redirectLogin(w, r)
        return
    }
    if session.location != "reviewselect" {
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

    dispatchLineReviewer(w, r, session)
}

func handleFileSelect(w http.ResponseWriter, r *http.Request) {
    debug.Println("handleFileSelect")
    session, err := activeSession(w, r)
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
    dispatchLineReviewer(w, r, session)
    // TODO: implement review select
    // dispatchReviewSelect(w, r, session)
}

func generateSessionToken() SessionToken {
    randomBytes := make([]byte, 16)
    rand.Read(randomBytes)
    token := base32.StdEncoding.EncodeToString(randomBytes)
    fmt.Printf("generateSessionToken: %s", token)
    return SessionToken(token)
}

func get_file_list(session *Session) ([]string, error) {
    debug.Println("get_file_list")
    var files []string
    out, err := runLynxCommand(session.username, "list-files")
    debug.Println(string(out))
    if err != nil {
        return nil, err
    }
    err = json.Unmarshal(out, &files)
    if err != nil {
        return nil, err
    }
    debug.Println(files)
    return files, nil
}

func runLynxCommand(user string, args... string) ([]byte, error) {
    var cmdArgs []string
    cmdArgs = append(cmdArgs, "--user")
    cmdArgs = append(cmdArgs, user)
    for _, arg := range args {
        cmdArgs = append(cmdArgs, arg)
    }
    fmt.Println("CMD: ./Lynx", strings.Join(cmdArgs, " "))
    cmd := exec.Command("./Lynx", cmdArgs...)
    cmd.Dir = "build"
    out, err := cmd.Output()
    if err != nil {
        fmt.Printf("Error: Code: %d Stderr: %s\n", err.(*exec.ExitError).ExitCode(), string(err.(*exec.ExitError).Stderr))
    }
    return out, err
}

/**
 * Opens and configures SQL database using credentials stored in
 * credentials.json. The credentials.json file must be created manually
 * on each machine.
 */
func openDatabase() {
    var err error
    credententialsFile, err := os.Open("credentials.json");
    if err != nil {
        log.Fatal(err)
    }
    var credentials Credentials
    err = json.NewDecoder(credententialsFile).Decode(&credentials);
    if err != nil {
        log.Fatal(err)
    }

    db, err = sql.Open("mysql", fmt.Sprintf("%s:%s@/%s", credentials.User, credentials.Passsword, credentials.Database))
    if err != nil {
        log.Fatal(err)
    }

    if err := db.PingContext(context.Background()); err != nil {
        log.Fatal(err)
    }
    db.SetConnMaxLifetime(time.Minute * 3)
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(10)
}

func hashPassword(password string) ([]byte, error) {
    return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

func verifyPassword(password string, hashed []byte) bool {
    return bcrypt.CompareHashAndPassword(hashed, []byte(password)) == nil
}

func startSession(w http.ResponseWriter, r *http.Request, userId UserId, username string) {
    debug.Printf("Starting session %s\n", username)
    token := generateSessionToken()
    http.SetCookie(w, &http.Cookie{
        Name: "session_token",
        Value: string(token),
        Path: "/",
    })
    // TODO: userId will be different from username
    id := userId
    loginSessions[SessionToken(token)] = id
    if _, exists := lynxSessions[id]; !exists {
        lynxSessions[id] = &Session{
            username: username,
        }
    }

    http.Redirect(w, r, "/", http.StatusFound)
    
}

type User struct {
    userId int;
    name string;
    passwordHash []byte;
}

func GetUser(username string) (User, error) {
    q := `
    SELECT id, name, password_hash
    FROM users
    WHERE name = ?;
    `
    row := db.QueryRow(q, username)
    debug.Println("db.QueryRow")

    var user User;
    err := row.Scan(&user.userId, &user.name, &user.passwordHash)
    return user, err;
}

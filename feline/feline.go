package feline

import (
	"database/sql"
	"fmt"
	"html/template"
	"log"
	"mime"
	"net/http"
	"os"
	"os/exec"

	"github.com/ruuzia/lynx/feline/database"
)

var debug = log.New(os.Stdout, "debug: ", log.Lshortfile)

func OpenServer(address string) {
    database.OpenDatabase()
	if (os.Getenv("LYNX_DEV") != "") {
		runTscWatch()
	}
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
	mime.AddExtensionType(".js", "application/javascript")
    fs := http.FileServer(http.Dir("./web/static/"))
    http.Handle("/static/", http.StripPrefix("/static/", fs))
    http.HandleFunc("/feline/logout", handleLogout)
    http.HandleFunc("/feline/starline", handleStarLine)
    http.HandleFunc("/feline/linenotes", handleLineNotes)
    http.HandleFunc("/feline/updatebuilder", handleUpdateBuilder)
    http.HandleFunc("/feline/finishbuilder", handleFinishBuilder)
    http.HandleFunc("/feline/list-line-sets", handleListLineSets)
    http.HandleFunc("/feline/get-line-data", handleGetLineData)
    http.HandleFunc("/feline/pull-session-state", handlePullSessionState)
    http.HandleFunc("/feline/push-session-state", handlePushSessionState)

    fmt.Println("Listening to localhost:2323")
    log.Fatal(http.ListenAndServe(address, nil))
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

func redirectLogin(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/login", http.StatusFound)
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

func runTscWatch() {
    fmt.Printf("Starting TS development server...\n")
    fmt.Printf("npx tsc --watch\n")
    cmd := exec.Command("npx", "tsc", "--watch");
    cmd.Dir = "./web/static/"
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    err := cmd.Start();
    if err != nil {
        log.Fatal(err)
    }
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

    user, err := database.GetUser(username)
    if err == sql.ErrNoRows {
        serveLogin(w, LoginPage{
            ErrorMessage: "Hmmm, this username was not found in the database.",
        })
        return
    } else if err != nil {
        log.Fatal(err)
    }

    if !VerifyPassword(password, user.PasswordHash) {
        serveLogin(w, LoginPage{
            ErrorMessage: "Sorry, password incorrect.",
        })
        return
    }

    StartSession(w, r, user)
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

    if _, err := database.GetUser(username); err == nil {
        serveSignup(w, SignupPage{
            ErrorMessage: "This user already exists!",
        })
        return
    }

    debug.Printf("[handleSignup] Adding new password: (%s, %s)\n", username, password)
    hashed, err := HashPassword(password);
    if err != nil {
        http.Error(w, "Error hashing password: " + err.Error(), http.StatusInternalServerError)
        return
    }

    user, err := database.AddUser(username, hashed)
    if err != nil {
        http.Error(w, "Error accessing database: " + err.Error(), http.StatusInternalServerError)
        return
    }

    StartSession(w, r, user)
}

type LoginPage struct {
    ErrorMessage string
}

type SignupPage struct {
    ErrorMessage string
}

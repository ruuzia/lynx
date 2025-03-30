package feline

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"

	"github.com/ruuzia/lynx/feline/credentials"
	"github.com/ruuzia/lynx/feline/database"
	"gopkg.in/gomail.v2"
)

var debug = log.New(os.Stdout, "debug: ", log.Lshortfile)
var domain string

func OpenServer(address string) {
	if os.Getenv("LYNX_DEV") != "" {
		runTscWatch()
	}
	domain = os.Getenv("LYNX_DOMAIN")
	if domain == "" {
		domain = address
	}
    database.OpenDatabase()
    http.HandleFunc("/", serveHome)
    http.HandleFunc("/builder", serveBuilder)
    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		cookie, _ := r.Cookie("session_token");
		debug.Println("GET serving /login", cookie.Value)
		if _, err := CheckAuth(w, r); err != nil {
			serveLogin(w, LoginPage{})
		} else {
			http.Redirect(w, r, "/", http.StatusFound)
		}
    })
	http.HandleFunc("/login/google", handleGoogleLogin)
	http.HandleFunc("/login/email", handleEmailLogin)
	http.HandleFunc("/login/email/confirm", handleEmailLoginConfirm)
    fs := http.FileServer(http.Dir("./web/static/"))
    http.Handle("/static/", http.StripPrefix("/static/", fs))
    http.HandleFunc("/feline/logout", handleLogout)
    http.HandleFunc("/feline/starline", handleStarLine)
    http.HandleFunc("/feline/linenotes", handleLineNotes)
    http.HandleFunc("/feline/updatebuilder", handleUpdateBuilder)
    http.HandleFunc("/feline/finishbuilder", handleFinishBuilder)
    http.HandleFunc("/feline/list-line-sets", handleListLineSets)
    http.HandleFunc("/feline/get-line-data", handleGetLineData)
	RegisterApiHandlers()

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

func redirectLogin(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: "session_token",
		Value: "",
		Path: "/",
	})
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
	fmt.Println("handleLogout")
    redirectLogin(w, r)
}

func handleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	debug.Printf("handleGoogleLogin\n")
	r.ParseForm()

	// Token and cookie values must match
	csrfToken := r.Form.Get("g_csrf_token")
	csrfCookie, err := r.Cookie("g_csrf_token")
	if csrfToken == "" || err != nil || csrfToken != csrfCookie.Value {
		serveLogin(w, LoginPage{
			ErrorMessage: "Bad request (Failed to verify double submit cookie)",
		})
	}

	username, err := VerifyGoogleIdToken(r.Form.Get("credential"));
	if err != nil {
		debug.Println("[handleLogin] failed verifying google id token: " + err.Error())
		serveLogin(w, LoginPage{
			ErrorMessage: "Failed to authenticate Google authentication token.",
		})
		return
	}

	user, err := database.GetUser(username)
	if err != nil {
		// Create user
		user, err = database.AddUser(username, []byte("google"));
		if err != nil {
			debug.Println("Error querying database: " + err.Error())
			serveLogin(w, LoginPage{
				ErrorMessage: "Error with sign-up.",
			})
			return
		}
	}

	StartSession(w, r, user)
}

func handleEmailLogin(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	if token := r.Form.Get("token"); token != "" {
		// Login
		debug.Println("Login with token!")
		claims, err := ParseJWT(token)
		if err != nil {
			http.Error(w, "Invalid token.", http.StatusBadRequest)
			return
		}
		fmt.Println("JWT claims", claims);

		user, err := database.GetUser(claims.Username)
		if err != nil {
			// Create user
			user, err = database.AddUser(claims.Username, []byte("email"));
			if err != nil {
				debug.Println("Error querying database: " + err.Error())
				serveLogin(w, LoginPage{
					ErrorMessage: "Error with sign-up.",
				})
				return
			}
		}

		StartSession(w, r, user)
	} else {
		referrer := r.Referer()
		if !strings.HasSuffix(referrer, "/login") {
			serveLogin(w, LoginPage{
				ErrorMessage: "Invalid referer.",
			})
			return

		}
		
		// Create login
		email := r.Form.Get("email")
		if email == "" {
			serveLogin(w, LoginPage{
				ErrorMessage: "Missing email",
			})
			return
		}
		token, err := GenerateJWT(email)
		if err != nil {
			debug.Println("Failed to generate JWT: " + err.Error())
			serveLogin(w, LoginPage{
				ErrorMessage: "Error logging in",
			})
			return
		}
		query := url.Values{}
		query.Set("token", token)
		url := referrer + "/email?" + query.Encode()

		config := credentials.GetEmailConfig()
		message := gomail.NewMessage()
		message.SetHeader("From", config.FromAddress)
		message.SetHeader("To", email)
		message.SetHeader("Subject", "Lynx access URL")
		message.SetBody("text/html", fmt.Sprintf(`
			Hello! This is your special account link. And can be used to log-on on any device.
			<a href="%s">%s</a>
			`, url, url))
		dialer := gomail.NewDialer(config.Server, config.Port, config.Username, config.Password)
		err = dialer.DialAndSend(message)

		if err != nil {
			debug.Println("Fail sending email " + err.Error())
			serveLogin(w, LoginPage{
				ErrorMessage: fmt.Sprintf("Failed to send email to \"%v\"", email),
			})
			return
		}
		debug.Println("Verification email sent to " + email)

		http.Redirect(w, r, "/login/email/confirm?address="+email, http.StatusFound)
	}
}

func handleEmailLoginConfirm(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	fmt.Println(r.Form)
	t, err := template.ParseFiles("./web/templates/verification.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	t.Execute(w, struct{ Address string }{ r.Form.Get("address") })
}
type LoginPage struct {
    ErrorMessage string
}

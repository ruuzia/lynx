package feline

import (
	"crypto/rand"
	"encoding/base32"
    "errors"
    "log"
    "net/http"
    "golang.org/x/crypto/bcrypt"
)

var loginSessions = map[SessionToken] UserId {}

func HashPassword(password string) ([]byte, error) {
    return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

func VerifyPassword(password string, hashed []byte) bool {
    return bcrypt.CompareHashAndPassword(hashed, []byte(password)) == nil
}

func ActiveSession(w http.ResponseWriter, r *http.Request) (*Session, error) {
    userId, err := CheckAuth(w, r)
    if err != nil {
        return nil, err
    }
    return lynxSessions[userId], nil
}

func Login(w http.ResponseWriter, user *User) {
    debug.Println("[auth] Login: Creating session token cookie")
    token := generateSessionToken()
    http.SetCookie(w, &http.Cookie{
        Name: "session_token",
        Value: string(token),
        Path: "/",
    })
    loginSessions[SessionToken(token)] = user.Id
}

func CheckAuth(_ http.ResponseWriter, r *http.Request) (UserId, error) {
    cookie, err := r.Cookie("session_token")
    if err != nil {
        if err == http.ErrNoCookie {
            debug.Println("No session_token cookie. Redirecting to /login")
            return -1, err
        }
        log.Fatal(err)
    }

    token := SessionToken(cookie.Value)

    userId, is_authenticated := loginSessions[token]
    if !is_authenticated {
        debug.Println("Invalid session_token cookie. Redirecting to /login")
        return -1, errors.New("Invalid token")
    }

    return userId, nil
}

func generateSessionToken() SessionToken {
    randomBytes := make([]byte, 16)
    rand.Read(randomBytes)
    token := base32.StdEncoding.EncodeToString(randomBytes)
    log.Printf("generateSessionToken: %s", token)
    return SessionToken(token)
}


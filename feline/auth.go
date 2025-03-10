package feline

import (
	"crypto/rand"
	"encoding/base32"
	"errors"
	"log"
	"net/http"

	"github.com/ruuzia/lynx/feline/database"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) ([]byte, error) {
    return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

func VerifyPassword(password string, hashed []byte) bool {
    return bcrypt.CompareHashAndPassword(hashed, []byte(password)) == nil
}

func Login(w http.ResponseWriter, user *database.User) (err error) {
    debug.Println("[Login] Creating session token cookie")
    token := generateSessionToken()
    http.SetCookie(w, &http.Cookie{
        Name: "session_token",
        Value: string(token),
        Path: "/",
    })
	err = database.AddSessionToken(user.Id, string(token))
	if err != nil {
		debug.Println("[Login] ERROR adding session token: ", err.Error())
		return err
	}
	return
}

func CheckAuth(_ http.ResponseWriter, r *http.Request) (database.UserId, error) {
    cookie, err := r.Cookie("session_token")
    if err != nil {
        if err == http.ErrNoCookie {
            debug.Println("No session_token cookie. Redirecting to /login")
            return -1, err
        }
        log.Fatal(err)
    }

    token := SessionToken(cookie.Value)

	found ,userId, created_date, err := database.LookupSessionToken(string(token));
	if err != nil {
		debug.Println("[CheckAuth] Error finding token: ", err.Error())
		return -1, err
	}
	debug.Println("[CheckAuth]:", found, userId, created_date)
	if !found {
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


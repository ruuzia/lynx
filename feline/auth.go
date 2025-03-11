package feline

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
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

type LynxClaims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func GenerateJWT(username string) (token_ string, err error) {
	claims := &LynxClaims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{},
	}
	key := os.Getenv("LYNX_SIGN_KEY")
	if key == "" { key = "pumpkin alphabet wanderer"; }
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(key))
}

func ParseJWT(tokenString string) (*LynxClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &LynxClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		key := os.Getenv("LYNX_SIGN_KEY")
		if key == "" { key = "pumpkin alphabet wanderer"; }
		return []byte(key), nil
	})
	return token.Claims.(*LynxClaims), err
}

func generateSessionToken() SessionToken {
    randomBytes := make([]byte, 16)
    rand.Read(randomBytes)
    token := base32.StdEncoding.EncodeToString(randomBytes)
    log.Printf("generateSessionToken: %s", token)
    return SessionToken(token)
}

//---------------------------------------
type GoogleClaims struct {
	Email string `json:"email"`
// email_verified:true
// family_name:Zia
// given_name:Rustum
// name:Rustum Zia
// picture:https://lh3.googleusercontent.com/a/ACg8ocLGTlaNWiEjKmzeSO9zAadL6J20Reafp-ycL6L6PpTVleDCLeFb=s96-c

	jwt.RegisteredClaims
}

func VerifyGoogleIdToken(tokenString string) (username string, err error) {
	publicKey, err := fetchGooglePublicKey()
	if err != nil {
		debug.Println("[VerifyGoogleIdToken] failed to fetch google public key")
		return "", err
	}
	_ = publicKey
	token, err := jwt.ParseWithClaims(tokenString, &GoogleClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return publicKey["kid"], nil
	})

	claims := token.Claims.(*GoogleClaims)
	debug.Println("[VerifyGoogleIdToken] claims:", claims)
	// TODO: check clams.GetAudience is equal to client ID
	if claims.Issuer != "accounts.google.com" && claims.Issuer != "https://accounts.google.com" {
		return "", fmt.Errorf("Invalid claims.Issue %v", claims.Issuer)
	}
	if claims.ExpiresAt.Time.Unix() < time.Now().Unix() {
		return "", fmt.Errorf("Google auth has expired: %v", claims.Issuer)
	}
	
	return claims.Email, nil
}

func fetchGooglePublicKey() (key map[string]string, err error) {
	res, err := http.Get("https://www.googleapis.com/oauth2/v3/certs")
	if err != nil {
		return
	}
	body, err := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode > 299 {
		debug.Println("[fetchGooglePublicKey] response failed " + res.Status)
		err = fmt.Errorf("Response failed %v", res.Status)
		return
	}
	if err != nil {
		return
	}
	var object map[string][]map[string]string
	err = json.Unmarshal(body, &object);
	if err != nil {
		debug.Println("[fetchGooglePublicKey] Failed parsing response")
		return
	}
	key = object["keys"][0]
	return
	// debug.Println("[fetchGooglePublicKey]", object)
	// return "", errors.New("unimplemented")
}


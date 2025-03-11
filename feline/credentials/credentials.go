package credentials

import (
	"fmt"
	"encoding/json"
	"log"
	"os"
)

var creds *credentials = nil

func GetHost() string {
	if creds == nil {
		log.Fatal("[GetHost] credentials not loaded")
	}
	return creds.Host
}

func GetUser() string {
	if creds == nil {
		log.Fatal("[GetUser] credentials not loaded")
	}
	return creds.User
}

func GetDatabase() string {
	if creds == nil {
		log.Fatal("[GetDatabase] credentials not loaded")
	}
	return creds.Database
}

func GetEmail() string {
	if creds == nil {
		log.Fatal("[GetEmail] credentials not loaded")
	}
	return creds.Email
}

func GetDatabasePassword() string {
	if creds == nil {
		log.Fatal("[GetPassword] credentials not loaded")
	}
	return creds.Password
}

func GetEmailPassword() string {
	if creds == nil {
		log.Fatal("[GetEmailPassword] credentials not loaded")
	}
	return creds.EmailPassword
}

func GetJwtPassword() string {
	if creds == nil {
		log.Fatal("[GetJwtPassword] credentials not loaded")
	}
	return creds.JwtPassword
}

func LoadCredentials() (err error) {
	credentialsFile := os.Getenv("LYNX_CREDENTIALS_FILE")
	if credentialsFile == "" {
		credentialsFile = "credentials.json"
	}
	creds = &credentials{}
	credententialsFile, err := os.Open(credentialsFile);
	if err != nil {
		log.Fatal(err)
	}
	defer credententialsFile.Close()
	err = json.NewDecoder(credententialsFile).Decode(creds);
	if err != nil {
		return fmt.Errorf("[GetCredentials] Invalid credentials file: %s", err.Error())
	}
	err = allowPullFromFile(&creds.Password, creds.PasswordFile)
	if err != nil {
		return fmt.Errorf("[GetCredentials] Invalid password: %s", err.Error())
	}
	err = allowPullFromFile(&creds.EmailPassword, creds.EmailPasswordFile)
	if err != nil {
		return fmt.Errorf("[GetCredentials] Invalid email_password: %s", err.Error())
	}
	err = allowPullFromFile(&creds.JwtPassword, creds.JwtPasswordFile)
	if err != nil {
		return fmt.Errorf("[GetCredentials] Invalid jwt_password: %s", err.Error())
	}
	return nil
}

func allowPullFromFile(item *string, filePath string) (err error) {
	if filePath == "" && *item == "" {
		return fmt.Errorf("Option not provided directly and not with _file")
	} else if filePath != "" && *item != "" {
		return fmt.Errorf("Option provided directly and with _file")
	} else if filePath != "" {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return err
		}
		*item = string(content)
	}
	return nil
}

type credentials struct {
    Host string `json:"host"`
    User string `json:"user"`
    Database string `json:"database"`
	Email string `json:"email"`
    Password string `json:"password,omitempty"`
    PasswordFile string `json:"password_file,omitempty"`
	EmailPassword string `json:"email_password,omitempty"`
	EmailPasswordFile string `json:"email_password_file,omitempty"`
	JwtPassword string `json:"jwt_secret,omitempty"`
	JwtPasswordFile string `json:"jwt_secret_file,omitempty"`
}

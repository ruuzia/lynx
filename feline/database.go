/// 

package feline

import (
    "context"
    "database/sql"
    "fmt"
    "encoding/json"
    "log"
    "os"
    "time"
    _ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

type User struct {
    Id UserId;
    Name string;
    PasswordHash []byte;
}

/**
 * Opens and configures SQL database using credentials stored in
 * credentials.json. The credentials.json file must be created manually
 * on each machine.
 */
func OpenDatabase() {
    var err error
    credententialsFile, err := os.Open("credentials.json");
    if err != nil {
        log.Fatal(err)
    }
    var credentials credentials
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

func GetLineSets(user_id UserId) ([]string, error) {
    var files []string
    q := `
    SELECT title FROM line_sets WHERE user_id = ?
    `
    rows, err := db.Query(q, int(user_id))
    if err != nil {
        return nil, err
    }
    for rows.Next() {
        var name string
        if err = rows.Scan(&name); err != nil {
            return nil, err
        }

        files = append(files, name)
    }
    return files, nil
}

func AddLineSet(user_id UserId, title string) error {
    q := `
    INSERT INTO line_sets (user_id, title) VALUES (?, ?)
    `
    _, err := db.Exec(q, user_id, title)
    return err
}

func GetUser(username string) (User, error) {
    q := `
    SELECT id, name, password_hash
    FROM users
    WHERE name = ?;
    `
    row := db.QueryRow(q, username)

    var user User;
    err := row.Scan(&user.Id, &user.Name, &user.PasswordHash)
    return user, err;
}

func AddUser(username string, passwordHash []byte) (User, error) {
    q := `INSERT INTO users (name, password_hash) VALUES (?, ?);`
    _, err := db.Exec(q, username, passwordHash)
    if err != nil {
        return User{}, err
    }
    return GetUser(username)
}

type credentials struct {
    Host string `json:"host"`
    User string `json:"user"`
    Passsword string `json:"password"`
    Database string `json:"database"`
}


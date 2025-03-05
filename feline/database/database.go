package database

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
var debug = log.New(os.Stdout, "database: ", log.Lshortfile)

type UserId int

type User struct {
    Id UserId;
    Name string;
    PasswordHash []byte;
}

type LineData struct {
    Id int `json:"id"`
    Cue string `json:"cue"`
    Line string `json:"line"`
    Starred bool `json:"starred"`
    Notes string `json:"notes"`
};

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

func GetLineSetId(user_id UserId, title string) (id int, err error) {
    row := db.QueryRow(`
        SELECT id FROM line_sets WHERE user_id = ? AND title = ?
    `, user_id, title)
    err = row.Scan(&id)
    return id, err
}

//-----------------------------------------------------------

func AddLine(user_id UserId, line_set string, item* LineData) (err error) {
    line_set_id, err := GetLineSetId(user_id, line_set);
    if err != nil {
        return err
    }
    q := `
    INSERT INTO line_data (user_id, line_set_id, line_number, location, cue, line, notes, starred)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    _, err = db.Exec(q, user_id, line_set_id, item.Id, "1", item.Cue, item.Line, item.Notes, item.Starred)
    return err
}

func GetLineData(user_id UserId, title string) (lineData []LineData, err error) {
    debug.Printf("GetLineData %d %s\n", user_id, title)
    line_set_id, err := GetLineSetId(user_id, title);
    if err != nil {
        return nil, err
    }
    q := `
    SELECT line_number, cue, line, notes, starred
    FROM line_data
    WHERE user_id = ? AND line_set_id = ?
    `
    rows, err := db.Query(q, user_id, line_set_id)
    if err != nil {
        return nil, err
    }
    for rows.Next() {
        var line LineData
        if err = rows.Scan(&line.Id, &line.Cue, &line.Line, &line.Notes, &line.Starred); err != nil {
            return nil, err
        }
        lineData = append(lineData, line)
    }
    return lineData, err
}

func LineSetFlagged(user_id UserId, line_id int, flagged bool) (err error) {
    q := `
    UPDATE line_data
    SET starred = ?
    WHERE user_id = ? AND line_number = ?
    `
    _, err = db.Exec(q, flagged, user_id, line_id)
    return err
}

func LineSetNotes(user_id UserId, line_id int, notes string) (err error) {
    q := `
    UPDATE line_data
    SET notes = ?
    WHERE user_id = ? AND line_number = ?
    `
    _, err = db.Exec(q, notes, user_id, line_id)
    return err
}

//-----------------------------------------------------------

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


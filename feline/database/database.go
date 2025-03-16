package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/ruuzia/lynx/feline/credentials"
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
    Index int `json:"index"`
    Cue string `json:"cue"`
    Line string `json:"line"`
    Starred bool `json:"starred"`
    Notes string `json:"notes"`
};

type LineSetInfo struct {
	Id int `json:"id"`
	Title string `json:"title"`
}

/**
 * Opens and configures SQL database using credentials stored in
 * credentials.json. The credentials.json file must be created manually
 * on each machine.
 */
func OpenDatabase() {
	var err error
	err = credentials.LoadCredentials()
	if err != nil {
        debug.Fatal("Error loading credentials " + err.Error())
	}
	db, err = sql.Open("mysql", fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?parseTime=true", credentials.GetUser(), credentials.GetDatabasePassword(), credentials.GetHost(), credentials.GetDatabase()))
    if err != nil {
        debug.Fatal(err)
    }

    if err := db.PingContext(context.Background()); err != nil {
        debug.Fatal(err)
    }
    db.SetConnMaxLifetime(time.Minute * 3)
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(10)
	if err = CreateTables(); err != nil {
        debug.Fatal("Error creating tables " + err.Error());
	}
}

func CreateTables() (err error) {
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);
	`)
	if err != nil {
		return err;
	}
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS line_sets (
    id int NOT NULL AUTO_INCREMENT,
    user_id int,
    title varchar(1024),
    PRIMARY KEY(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
	`)
	if err != nil {
		return err;
	}
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS line_data (
    id int NOT NULL AUTO_INCREMENT,
    user_id int,
    line_set_id int,
    line_number int,
    location VARCHAR(16),
    cue TEXT(65000),
    line TEXT(65000),
    notes TEXT(65000),
    starred boolean,
    PRIMARY KEY(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (line_set_id) REFERENCES line_sets(id)
);
	`);
	if err != nil {
		return err;
	}
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS login_sessions (
    id int NOT NULL AUTO_INCREMENT,
    user_id int,
	token VARCHAR(255),
	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
	`);
	if err != nil {
		return err;
	}
	return;
}

func GetLineSets(user_id UserId) ([]LineSetInfo, error) {
    var lineSets []LineSetInfo
    q := `
    SELECT id, title FROM line_sets WHERE user_id = ?
    `
    rows, err := db.Query(q, int(user_id))
    if err != nil {
        return nil, err
    }
    for rows.Next() {
        var item LineSetInfo
        if err = rows.Scan(&item.Id, &item.Title); err != nil {
            return nil, err
        }
        lineSets = append(lineSets, item)
	}
    return lineSets, nil
}

func AddLineSet(user_id UserId, title string) error {
    q := `
    INSERT INTO line_sets (user_id, title) VALUES (?, ?)
    `
    _, err := db.Exec(q, user_id, title)
    return err
}

func RenameLineSet(userId UserId, lineSet *LineSetInfo) error {
	_, err := db.Exec(`
		UPDATE line_sets
		SET title = ?
		WHERE id = ? AND user_id = ?
	`, lineSet.Title, lineSet.Id, userId)
	return err
}

func GetLineSetId(user_id UserId, title string) (id int, err error) {
    row := db.QueryRow(`
        SELECT id FROM line_sets WHERE user_id = ? AND title = ?
    `, user_id, title)
    err = row.Scan(&id)
    return id, err
}

func DeleteLineSet(userId UserId, lineSetId int) (err error) {
    _, err = db.Exec(`
        DELETE FROM line_sets WHERE user_id = ? AND id = ?
    `, userId, lineSetId)
    return err
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
    _, err = db.Exec(q, user_id, line_set_id, item.Index, "1", item.Cue, item.Line, item.Notes, item.Starred)
    return err
}

func UpdateLine(userId UserId, item *LineData) (err error) {
    q := `
    UPDATE line_data
	SET line_number = ?, cue = ?, line = ?, notes = ?, starred = ?
	WHERE user_id = ? AND id = ?
    `
    _, err = db.Exec(q, item.Index, item.Cue, item.Line, item.Notes, item.Starred, userId, item.Id)
    return err
}

func SetLineIndex(userId UserId, setId int, lineId int, index int) (err error) {
    q := `
    UPDATE line_data
	SET line_number = ?
	WHERE user_id = ? AND line_set_id = ? AND id = ?
    `
    _, err = db.Exec(q, index, userId, setId, lineId)
    return err
}

func GetLineDataByTitle(userId UserId, title string) (lineData []LineData, err error) {
    debug.Printf("GetLineData %d %s\n", userId, title)
    lineSetId, err := GetLineSetId(userId, title);
    if err != nil {
        return nil, err
    }
	return GetLineData(userId, lineSetId)
}

func GetLineData(userId UserId, lineSetId int) (lineData []LineData, err error) {
    q := `
    SELECT id, line_number, cue, line, notes, starred
    FROM line_data
    WHERE user_id = ? AND line_set_id = ?
	ORDER BY line_number
    `
    rows, err := db.Query(q, userId, lineSetId)
    if err != nil {
        return nil, err
    }
    for rows.Next() {
        var line LineData
        if err = rows.Scan(&line.Id, &line.Index, &line.Cue, &line.Line, &line.Notes, &line.Starred); err != nil {
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

func GetUsername(userId UserId) (username string, err error) {
    row := db.QueryRow(`SELECT name FROM users WHERE id = ?;`, userId)
    err = row.Scan(&username)
    return
}

func AddUser(username string, passwordHash []byte) (User, error) {
    q := `INSERT INTO users (name, password_hash) VALUES (?, ?);`
    _, err := db.Exec(q, username, passwordHash)
    if err != nil {
        return User{}, err
    }
    return GetUser(username)
}

//------------------------------------------------------------

func LookupSessionToken(token string) (found bool, userId UserId, created time.Time, err error) {
	row := db.QueryRow(`
		SELECT user_id, created FROM login_sessions WHERE token = ?
	`, token)
	err = row.Scan(&userId, &created)
	if err == sql.ErrNoRows {
		return false, 0, time.Time{}, nil
	}
	return true, userId, created, err
}

func AddSessionToken(user_id UserId, token string) (err error) {
	_, err = db.Exec(`
		INSERT INTO login_sessions (user_id, token)
		VALUES (?, ?);
		`, user_id, token)
	return err
}

func SessionLogout(token string) (err error) {
	result, err := db.Exec(`
		DELETE FROM login_sessions WHERE token = ?
	`, token)
	if err != nil {
		return err;
	}
	debug.Println("[SessionLogout]", result)
	rows_affected, err := result.RowsAffected()
	if err == nil && rows_affected < 1 {
		return errors.New("[SessionLogout] Failed to logout; token not found")
	}
	return nil;
}

//------------------------------------------------------------

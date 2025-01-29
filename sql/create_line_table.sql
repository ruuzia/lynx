CREATE TABLE line_data (
    id int NOT NULL AUTO_INCREMENT,
    user_id int,
    line_number int,
    cue TEXT(65000),
    line TEXT(65000),
    PRIMARY KEY(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

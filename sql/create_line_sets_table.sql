CREATE TABLE line_sets (
    id int NOT NULL AUTO_INCREMENT,
    user_id int,
    title varchar(1024),
    PRIMARY KEY(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

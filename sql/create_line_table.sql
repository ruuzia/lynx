CREATE TABLE line_data (
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

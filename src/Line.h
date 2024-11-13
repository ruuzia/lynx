#ifndef LINE_H
#define LINE_H
#include <string>

using std::istream, std::ostream, std::string;

/**
 * A Line object represents an actor's lines within
 * a script. This includes their text to say as well
 * as their cue for that line.
 */
class Line {
public:
    /**
     * Construct a line with a given cue, actual line
     * text, and id.
     */
    Line(string cue, string line, int id);

    // Getters
    string get_cue() const;
    string get_line() const;
    int get_id() const;
    bool get_is_flagged() const;
    string get_notes() const;

    // Setters
    void set_flagged(bool is_flagged);
    void set_notes(string notes);

    // Output
    friend ostream& operator<<(ostream& out, const Line& line);

private:
    string cue;
    string line;
    int id;
    bool is_flagged;
    string notes;
};
#endif // LINE_H

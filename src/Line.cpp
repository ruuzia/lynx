#include "Line.h"

using std::string;

Line::Line(string cue, string line, int id) :
    cue(cue),
    line(line),
    id(id) {
    is_flagged = false;
}

string Line::get_cue() const {
    return cue;
}

string Line::get_line() const {
    return line;
}

int Line::get_id() const {
    return id;
}

bool Line::get_is_flagged() const {
    return is_flagged;
}

void Line::set_flagged(bool flagged) {
    is_flagged = flagged;
}

string Line::get_notes() const {
    return notes;
}

void Line::set_notes(string s) {
    this->notes = s;
}

ostream& operator<<(ostream& out, const Line& line) {
    bool show_metadata = line.is_flagged || line.notes != "";
    if (show_metadata) {
        out << string("[");
        if (line.is_flagged) {
            out << string("flagged");
            if (line.notes != "") {
                out << string(", ");
            }
        }
        if (line.notes != "") {
            out << string("notes=") << string("\"") << line.notes << string("\"");
        }
        out << string("]\n");
    }
    out << line.get_cue() << string("\n")
        << line.get_line() << string("\n");
    return out;
}

#include "Lynx.h"
#include "SaveData.h"
#include <cstdlib>
#include <cstring>
#include <ios>
#include <iostream>
#include <fstream>
#include <map>
#include <ostream>
#include <sstream>
#include <string>

using std::cin, std::cout, std::endl, std::ofstream, std::map, std::stringstream, std::to_string;

ofstream debug("logs.txt", ofstream::app);

static string literal(string s) {
    string lit = "\"";
    for (char c : s) {
        if (c == '"') {
            lit.append("\\\"");
        } else if (c == '\\') {
            lit.append("\\\\");
        } else if (c == '\n') {
            lit.append("\\n");
        } else {
            lit.push_back(c);
        }
    }
    lit.push_back('\"');
    return lit;
}

static void output_json(vector<string> items) {
    cout << "[ ";
    for (size_t i = 0; i < items.size(); i++) {
        string separator = ", ";
        if (i == items.size() - 1) separator = "";
        cout << literal(items[i]) << separator;
    }
    cout << " ]" << endl;
}

bool Lynx::list_files() {
    debug << "INFO: list_files" << endl;
    vector<LineSet> line_files = savedata.get_line_files();
    vector<string> names;
    for (const auto& item : line_files) {
        names.push_back(item.title);
    }
    output_json(names);
    return true;
}

bool Lynx::list_lines(string file) {
    debug << "INFO: list_lines" << endl;
    vector<Line> lines;
    if (!savedata.load_line_data(file, lines)) {
        debug << "(list_lines) error loading line data" << endl;
        return false;
    }

    cout << "[";
    for (size_t i = 0; i < lines.size(); i++) {
        cout << "{\n";
        cout << "  \"id\": " << to_string(i) << ",\n";
        cout << "  \"cue\": " << literal(lines[i].get_cue()) << ",\n";
        cout << "  \"line\": " << literal(lines[i].get_line()) << ",\n";
        cout << "  \"starred\": " << std::boolalpha <<  lines[i].get_is_flagged() << ",\n";
        cout << "  \"notes\": " << literal(lines[i].get_notes()) << "\n";
        cout << "}";
        if (i + 1 < lines.size()) cout << ",\n";
    }
    cout << "]" << endl;
    return true;
}

bool Lynx::set_notes(string file, int line, string notes) {
    debug << "INFO: set_notes " << file << '\t' << line << '\t' << notes << endl;
    vector<Line> lines;
    if (!savedata.load_line_data(file, lines)) {
        debug << "Error: error loading line data" << endl;
        return false;
    }
    if (line < 0 || (size_t)line >= lines.size()) {
        debug << "Error: invalid line index" << endl;
        return false;
    }

    lines[line].set_notes(notes);

    if (!savedata.save_line_data(file, lines)) {
        debug << "Error: error saving line data" << endl;
        return false;
    }
    return true;
}

bool Lynx::set_flagged(string file, int line, bool is_flagged) {
    debug << "INFO: set_flagged " << file << '\t' << line << '\t' << is_flagged << endl;
    vector<Line> lines;
    if (!savedata.load_line_data(file, lines)) {
        debug << "Error: error loading line data" << endl;
        return false;
    }
    if (line < 0 || (size_t)line >= lines.size()) {
        debug << "Error: invalid line index" << endl;
        return false;
    }
    lines[line].set_flagged(is_flagged);
    if (!savedata.save_line_data(file, lines)) {
        debug << "Error: error saving line data" << endl;
        return false;
    }
    return true;
}

Lynx::Lynx(string user) : savedata(user) {
}

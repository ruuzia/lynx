#include "SaveData.h"
#include "Line.h"
#include <algorithm>
#include <cassert>
#include <filesystem>
#include <iostream>
#include <fstream>
#include <optional>
#include <sstream>
#include <utility>

using std::cout, std::cerr, std::endl, std::ifstream, std::nullopt, std::ofstream, std::optional, std::pair, std::stringstream, std::vector;


/**
 * Parse the line metadata of a file.
 * Accepts: the input file stream
 * Returns: nullopt if the text could not be parsed or a vector of key-value
 * pairs.
 * NOTE: we're using a vector of pairs rather than std::map because
 * we don't need a hashmap. We will want to iterate the vector
 * anyways in order to validate it fully.
 */
static optional<vector<pair<string, string>>> parse_metadata(ifstream &file);

SaveData::SaveData(string user_id) {
    save_dir = "../data/" + user_id + "/";
    std::filesystem::create_directory(save_dir);
}

vector<LineSet> SaveData::get_line_files() {
    ifstream file;
    vector<LineSet> items;
    file.open(save_dir / "Listing");
    if (!file) {
        return {};
    }
    while (file.peek() != EOF) {
        string title;
        getline(file, title);

        items.push_back({title});
    }
    file.close();
    return items;
}

void SaveData::save_listing(vector<LineSet> listing) {
    ofstream file(save_dir / "Listing");
    for (const auto& item : listing) {
        file << item.title << "\n";
    }
    file.close();
}

static bool has_line_format(stringstream line) {
    string role;
    while (isalpha(line.peek()) || line.peek() == '/') {
        role.push_back(line.get());
    }
    return role != "" && line.peek() == ':';
}

static bool file_load_line_data(const string& path, vector<Line>& lines) {
    ifstream line_file;
    line_file.open(path);
    lines.clear();
    if (!line_file) {
        cout << "Failed to open file " << path << endl;
        return false;
    }

    int line_id = 0;
    int line_count = 0;
    while (line_file.peek() != EOF) {
        string cue, line, empty;
        optional<vector<pair<string, string>>> metadata;
        if (line_file.peek() == '[') {
            metadata = parse_metadata(line_file);
            if (!metadata) {
                cout << "Failed to parse line file." << endl;
                return false;
            }
        }

        getline(line_file, cue);
        ++line_count;
        stringstream cue_ss;
        if (cue == "") {
            cerr << "Malformed line file. Expected cue at line "
                 << line_count << " but got empty string. Skipping." << endl;
            continue;
        } else if (!has_line_format(stringstream(cue))) {
            cerr << "Cue at line " << line_count << ": \"" << cue << "\" has invalid format." << endl;
            cerr << "Should have format:" << endl;
            cerr << "\tROLE: the line" << endl;
            return false;
        }

        getline(line_file, line);
        ++line_count;
        if (line == "") {
            cout << "Malformed line file. Expected line at line "
                 << line_count << " but got empty string. Skipping." << endl;
            continue;
        } else if (!has_line_format(stringstream(line))) {
            cerr << "Line at line " << line_count << " has invalid format." << endl;
            cerr << "Should have format:" << endl;
            cerr << "\tROLE: the line" << endl;
            return false;
        }

        getline(line_file, empty);
        ++line_count;
        if (empty != "") {
            cerr << "Expected empty line separating lines at line " << line_count << " but got \"" << empty << "\"" << endl;
        }

        Line item = Line(cue, line, line_id++);

        for (auto [key, value] : metadata.value_or(vector<pair<string, string>>{})) {
            if (key == "flagged") {
                item.set_flagged(true);
            } else if (key == "notes") {
                item.set_notes(value);
            } else {
                cout << "Line metadata: unknown field `" << key << "`" << endl;
            }

        }

        lines.push_back(item);
    }

    line_file.close();
    return true;
}

bool SaveData::load_line_data(const string& name, vector<Line>& lines) {
    return file_load_line_data(save_dir / "LineSets" / name, lines);
}

bool SaveData::save_line_data(const string& name, const vector<Line>& lines) {
    std::filesystem::create_directory(save_dir / "LineSets");
    ofstream file;
    file.open(save_dir / "LineSets" / name);
    if (!file) {
        cout << "Error: could not open file " << name << endl;
        return false;
    }
    for (const auto& line: lines) {
        file << line << endl;
    }
    file.close();
    return true;
}

bool SaveData::remove_line_file(string name) {
    auto listing = get_line_files();
    bool found = false;
    for (auto it = listing.begin(); it != listing.end(); it++) {
        if (it->title == name) {
            found = true;
            listing.erase(it);
            break;
        }
    }
    if (!found) return false;
    save_listing(listing);
    std::filesystem::remove(save_dir / "LineSets" / name);
    return true;
}

bool SaveData::add_line_file(string file, string name) {
    cout << "(add_line_file)" << endl;
    // We may want better validation in future
    if (name.find('/') != string::npos) {
        cout << "title << " << name << " has /" << endl;
        return false;
    }
    if (!std::filesystem::exists(file)) {
        cout << "File does not exist." << endl;
        return false;
    }
    // Try parsing
    vector<Line> lines;
    if (!file_load_line_data(file, lines)) {
        cout << "Error loading line data" << endl;
        return false;
    }

    auto listing = get_line_files();
    for (const LineSet& other : listing) {
        if (name == other.title) {
            cout << "File already in listing." << endl;
            return false;
        }
    }

    listing.insert(listing.begin(), LineSet{name});
    save_line_data(name, lines);
    save_listing(listing);

    return true;
}

static optional<vector<pair<string, string>>> parse_metadata(ifstream &file) {
    // Should only be called with file pointer at '['
    // Otherwise it is runtime error
    assert(file.get() == '[');
    vector<pair<string, string>> data;

    while (true) {
        string key, value;
        while (isspace(file.peek())) file.get();
        if (!isalpha(file.peek())) break;

        /* Get key */
        while (isalpha(file.peek())) {
            key.push_back(file.get());
        }
        
        while (isspace(file.peek())) file.get();

        if (file.peek() == '=') {
            file.get(); // '='
            while (isspace(file.peek())) file.get();
            if (file.peek() != '"') {
                cout << "Line metadata: expected '\"' after `=`. Did you include quotes around the value?" << endl;
                return nullopt;
            }
            file.get(); // '"'

            /* Get value */
            while (file.peek() != '"') {
                if (file.peek() == '\n') {
                    cout << "Line metadata: missing closing '\"'" << endl;
                    return nullopt;
                }
                value.push_back(file.get());
            }
            file.get(); // '"'
        }

        data.push_back(make_pair(key, value));

        if (file.peek() != ']' && file.peek() != ',') {
                cout << "Line metadata: expected ',' or ']' but got " << file.peek() << endl;
                return nullopt;
        } else if (file.peek() == ',') {
            file.get();
        }
    }
    if (file.peek() != ']') {
        cout << "Line metadata: expected ']' but got '" << file.peek() << "'" << endl;
        return nullopt;
    } else {
        string eol;
        getline(file, eol);
        return data;
    }
}

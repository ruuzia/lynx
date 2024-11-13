#include "Lynx.h"
#include <cstring>
#include <iostream>
#include <ostream>
#include <sstream>

using std::cerr, std::endl, std::ofstream, std::ostream, std::string, std::stringstream;

extern ostream debug;

static char *exe;
void usage(ostream &out) {
    out << "Usage:" << endl;
    out << exe << " --platform (console|feline) --user <name>" << endl;
}

bool handle_arguments(char **argv) {
    string user;
    for (; *argv != nullptr; argv++) {
        if (strcmp(*argv, "--user") == 0) {
            argv++;
            if (*argv == nullptr) {
                cerr << "Error: expected username after --user" << endl;
                return false;
            }
            user = *argv;
        } else {
            break;
        }
    }
    if (user == "") {
        cerr << "Error: expected --user" << endl;
        return false;
    }

    Lynx program(user);

    string command = *argv;
    if (command == "list-files") {
        return program.list_files();
    } else if (command == "lines") {
        string file{};
        ++argv;
        for (; *argv != nullptr; argv++) {
            if (strcmp(*argv, "--file") == 0) {
                file = *++argv;
            } else {
                debug << "Unknown argument for lines: " << *argv << endl;
                exit(1);
            }
        }
        if (file == "") {
            debug << "Error: expected file argument" << endl;
            exit(1);
        }
        return program.list_lines(file);
    } else if (command == "set-flagged") {
        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected file" << endl;
        }
        string file = *argv;

        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected line" << endl;
        }
        stringstream a(*argv);
        int line;
        a >> line;
        if (!a || !a.eof() || line < 0) {
            debug << "Error: (set-flagged) invalid line number" << endl;
            exit(1);
        }

        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected is_flagged" << endl;
            exit(1);
        }
        string b = *argv;
        if (b != "true" && b != "false") {
            debug << "Error: (set-flagged) invalid is_starred boolean" << endl;
            exit(1);
        }
        bool is_flagged = string(*argv) == "true";
        return program.set_flagged(file, line, is_flagged);
    } else if (command == "set-notes") {
        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected file" << endl;
            return false;
        }
        string file = *argv;

        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected line" << endl;
            return false;
        }
        stringstream a(*argv);
        int line;
        a >> line;

        if (*++argv == nullptr) {
            debug << "Error: (set-flagged) expected notes" << endl;
            return false;
        }

        string notes = *argv;

        return program.set_notes(file, line, notes);

    } else if (command == "remove-set") {
        debug << "INFO: remove-set" << endl;
        if (*++argv == nullptr) {
            debug << "Error: (remove-set) expected title" << endl;
            return false;
        }
        string title = *argv;
        return program.savedata.remove_line_file(title);
    } else if (command == "add-set") {
        if (*++argv == nullptr) {
            debug << "Error: (add-set) expected title" << endl;
            return false;
        }
        string title = *argv;

        if (*++argv == nullptr) {
            debug << "Error: (add-set) expected file" << endl;
            return false;
        }
        string file = *argv;
        debug << "INFO: add-set " << title << " " << file << endl;
        return program.savedata.add_line_file(file, title);
    } else {
        debug << "Unknown command" << endl;
        exit(1);
    }

    return true;
}

int main(int argc, char **argv) {
    (void)argc;
    exe = *argv++;
    if (!handle_arguments(argv)) {
        return 1;
    }
    return 0;
}

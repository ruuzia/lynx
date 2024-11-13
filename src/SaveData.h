#ifndef SAVE_DATA_H
#define SAVE_DATA_H

#include "Line.h"
#include <filesystem>
#include <string>
#include <vector>
using std::filesystem::path, std::string, std::vector;

struct LineSet {
    // May add more data in future
    string title;
};

/**
 * SaveData encapsulates the saving and loading of user data.
 */
class SaveData {
public:
    /**
     * Create an object to save and load data for a
     * particular user.
     */
    SaveData(string user_id);

    /**
     * Pull available line files.
     */
    vector<LineSet> get_line_files();

    /**
     * Add line files to saved listing.
     */
    bool add_line_file(string file, string name);

    /**
     * Delete data and remove line file from listing.
     */
    bool remove_line_file(string name);

    /**
     * Parse line file into given vector of lines.
     * Returns true on success. On failure, prints
     * error to console and returns false;
     */
    bool load_line_data(const string& name, vector<Line>& lines);

    /**
     * Save line data to file of given name.
     * Returns true on success, false otherwise.
     */
    bool save_line_data(const string& name, const vector<Line>& lines);

private:
    path save_dir;

    /**
     * Helper method to save modified line file listing.
     */
    void save_listing(vector<LineSet> listing);
};

#endif // SAVE_DATA_H

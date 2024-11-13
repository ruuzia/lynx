#ifndef FELINE_APP_H
#define FELINE_APP_H

#include "SaveData.h"

/**
 * Lynx provides an API to carry out specific actions for a user
 * in the backend.
 */
class Lynx {
public:
    /**
     * Create an object with permission to modify user's data.
     */
    Lynx(string user);

    /**
     * List all line data in a given file.
     */
    bool list_lines(string file);

    /**
     * List existing line sets for auser.
     */
    bool list_files();

    /**
     * Set flagged or unflagged.
     */
    bool set_flagged(string file, int line, bool is_flagged);

    /**
     * Change a note for a particular line.
     */
    bool set_notes(string file, int line, string notes);

    SaveData savedata;
private:
};

#endif // FELINE_APP_H

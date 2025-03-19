# Lynx

Lynx is a tool with robust features for memorizing lines. I originally built it with a simple terminal interface to help me review my lines for a theatre production. Interested in its potential, I rewrote a functional web prototype for a course project. Users are able to type up their lines and cues for play productions in a simple text format. They can then review, flag, and manage their lines from a desktop or mobile device.

## Installation

The project requires Go to be installed on your system. The Go program starts up the HTTP server and calls the C++ back-end. It also compiles the C++ automatically, but you will need CMake and Ninja installed.

Dependencies: go mysql driver and go std crypto extension

To install dependencies: Change to the repository directory and run `go get github.com/ruuzia/lynx`.

Finally, you will need to set-up the MySQL server: see [initial-setup.md](sql/initial-setup.md).

## Running

To run program: `go run feline.go`

Then go to http://localhost:2323 for the demo website.

## Architecture

The project is made of three parts:

- Lynx: the C++ backend
- Feline: the Go web server
- WebLynx: the front-end in HTML, CSS, and JavaScript

## TODO

- [x] Web prototype
- [x] Support different settings and strategies for reviewing lines
- [ ] Host on UVM silk servers
- [x] MySQL database
- [x] Support user sign-up and password storage
- [ ] Public line scripts
- [x] Page to browse through script
- [ ] Annotate Lines
- [ ] Support more line metadata
- [ ] Implement more user-friendly line set creation
- [ ] Monologue learning setting
- [ ] Audio support (recording, saving, TTS, listen to lines)
- [ ] Scanning in pages of lines

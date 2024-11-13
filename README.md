# Lynx

Lynx is a tool with robust features for memorizing lines. I originally built it with a simple terminal interface to help me review my lines for a theatre production. Interested in its potential, I rewrote a functional web prototype for a course project.

## Running

The project requires Go to be installed on your system. The Go program starts up the HTTP server and calls the C++ back-end. It also compiles the C++ automatically, but you will need CMake and Ninja installed. There are no third party dependencies.

`go run feline.go`

Then go to http://localhost:2323 for the demo website.

## Architecture

The project is made of three parts:

- Lynx: the C++ backend
- Feline: the Go web server
- WebLynx: the front-end in HTML, CSS, and JavaScript

## TODO

- [x] Web prototype
- [ ] Support different settings and strategies for reviewing lines
- [ ] Host on server
- [ ] Move database to mySQL
- [ ] Support user sign-up and password storage
- [ ] Page to browse through lines
- [ ] Support more line metadata
- [ ] Implement more user-friendly line set creation
- [ ] Monologue learning setting
- [ ] Audio support (recording, saving, TTS, listen to lines)
- [ ] Scanning in pages of lines

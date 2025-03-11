package main

import (
	"os"
	"github.com/ruuzia/lynx/feline"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "2323"
	}
    feline.OpenServer("0.0.0.0:"+port)
}


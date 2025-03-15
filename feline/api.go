/**
 * REST API for Lynx/Feline. We started as a MPA, and as we transition
 * to a single-page application, it is time to follow proper REST
 * standards.
 */
package feline

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/ruuzia/lynx/feline/database"
)

func RegisterApiHandlers() {
	http.HandleFunc("/feline/item", handler(handleItem))
	http.HandleFunc("/feline/lineset", handler(handleLineset))
}

func handleItem(userId database.UserId, r *http.Request) (any, error) {
	switch r.Method {
	case "GET":
		return nil, fmt.Errorf("GET /feline/item not implemented")
	case "POST":
		return nil, fmt.Errorf("POST /feline/item not implemented")
	case "PUT":
		return nil, fmt.Errorf("POST /feline/item not implemented")
	case "PATCH":
		return nil, fmt.Errorf("PATCH /feline/item not implemented")
	case "DELETE":
		return nil, fmt.Errorf("DELETE /feline/item not implemented")
	}
	return nil, nil
}

func handleLineset(userId database.UserId, r *http.Request) (any, error) {
	_ = userId
	switch r.Method {
	case "GET":
		return nil, fmt.Errorf("GET /feline/lineset not implemented")
	case "POST":
		return nil, fmt.Errorf("POST /feline/lineset not implemented")
	case "PUT":
		return nil, fmt.Errorf("POST /feline/lineset not implemented")
	case "PATCH":
		return nil, fmt.Errorf("PATCH /feline/lineset not implemented")
	case "DELETE":
		return nil, fmt.Errorf("DELETE /feline/lineset not implemented")
	}
	return nil, nil
}

func handler(fn func(database.UserId, *http.Request) (response any, err error)) func(http.ResponseWriter, *http.Request) {
	return (func(w http.ResponseWriter, r *http.Request) {
		userId, err := CheckAuth(w, r)
		if err != nil {
			debug.Println("Auth failed: " + err.Error())
			http.Error(w, "Failed to authenticate request", http.StatusBadRequest)
		}

		resp, err := fn(userId, r);
		if err != nil {
			debug.Println("Request failed: ", err.Error())
			debug.Println("REQUEST:",r)
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		err = json.NewEncoder(w).Encode(resp);
		if err != nil {
			debug.Println("Failed to encode response!")
			debug.Println("RESPONSE:", resp)
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
	})
}

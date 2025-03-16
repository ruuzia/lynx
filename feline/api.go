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
	"strconv"

	"github.com/ruuzia/lynx/feline/database"
)

func RegisterApiHandlers() {
	http.HandleFunc("/feline/items/{id}", handler(handleItem))
	http.HandleFunc("/feline/linesets", handler(handleLinesets))
	http.HandleFunc("/feline/linesets/{id}", handler(handleSingleLineset))
	http.HandleFunc("/feline/linesets/{id}/items", handler(handleLinesetItems))
	http.HandleFunc("/feline/linesets/{id}/items/ordering", handler(handleLinesetItemsOrdering))
}

func handleLinesetItemsOrdering(userId database.UserId, r *http.Request) (any, error) {
	setId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return nil, fmt.Errorf("Request URL expected integer {id}")
	}
	switch r.Method {
	case "POST":
		var lines []int
		err = json.NewDecoder(r.Body).Decode(&lines)
		if err != nil{
			return nil, fmt.Errorf("Failed to decode payload: %s", err.Error())
		}
		for index, lineId := range lines {
			err = database.SetLineIndex(userId, setId, lineId, index)
			if err != nil {
				// note: not atomic in error
				return nil, fmt.Errorf("Failed setting line index: %s", lineId, index, err.Error())
			}
		}
		return map[string]string{}, nil
	default:
		return nil, fmt.Errorf("%s not supported", r.Method)
	}
}

func handleLinesetItems(userId database.UserId, r *http.Request) (any, error) {
	setId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return nil, fmt.Errorf("Request URL expected integer {id}")
	}

	switch r.Method {
	case "GET":
		lines, err := database.GetLineData(userId, setId)
		if err != nil {
			return nil, fmt.Errorf("Failed fetching line data: %s", err.Error())
		}
		return &lines, nil
	case "POST":
		var item database.LineData
		err = json.NewDecoder(r.Body).Decode(&item)
		if err != nil {
			return nil, fmt.Errorf("Failed to parse line item: %s", err.Error())
		}
		err = database.AddLine(userId, setId, &item);
		if err != nil {
			return nil, fmt.Errorf("Failed to inserting item: %s", err.Error())
		}
		id, err := database.LastInsertId()
		if err != nil {
			return nil, fmt.Errorf("Failed to inserting item: %s", err.Error())
		}
		type ReturnPayload struct {
			Id int `json:"id"`
		}
		return &ReturnPayload{ Id: id }, err
		
	default:
		return nil, fmt.Errorf("%s unsupported", r.Method)
	}
}

func handleItem(userId database.UserId, r *http.Request) (any, error) {
	itemId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return nil, fmt.Errorf("Request URL expected integer {lineId}")
	}
	fmt.Println("handleItem()", itemId)
	switch r.Method {
	case "GET":
		return nil, fmt.Errorf("GET /feline/item not implemented")
	case "POST":
		return nil, fmt.Errorf("POST /feline/item not implemented")
	case "PUT":
		var item database.LineData
		err = json.NewDecoder(r.Body).Decode(&item)
		if err != nil {
			return nil, fmt.Errorf("Failed to parse line item: %s", err.Error())
		}
		if itemId != item.Id {
			return nil, fmt.Errorf("PUT can not change item id")
		}
		return map[string]string{}, database.UpdateLine(userId, &item)
	case "PATCH":
		return nil, fmt.Errorf("PATCH /feline/item not implemented")
	case "DELETE":
		return nil, fmt.Errorf("DELETE /feline/item not implemented")
	default:
		return nil, fmt.Errorf("%s not valid", r.Method)
	}
}

func handleLinesets(userId database.UserId, r *http.Request) (any, error) {
	switch r.Method {
	case "GET":
		names, err := database.GetLineSets(userId)
		if err != nil {
			return nil, fmt.Errorf("Failed getting linesets for user: %s", err.Error())
		}
		return &names, nil
	case "POST":
		var options database.LineSetInfo
		err := json.NewDecoder(r.Body).Decode(&options)
		if err != nil {
			return nil, fmt.Errorf("Failed decoding payload: %s", err.Error())
		}
		err = database.AddLineSet(userId, options.Title)
		if err != nil {
			return nil, fmt.Errorf("Unable to create line set: %s", err.Error())
		}
		return map[string]string{}, nil
	default:
		return nil, fmt.Errorf("%s /feline/linesets not unimplimented", r.Method)
	}
}

func handleSingleLineset(userId database.UserId, r *http.Request) (any, error) {
	itemId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return nil, fmt.Errorf("Request URL expected line set ID")
	}
	switch r.Method {
	case "GET":
		return nil, fmt.Errorf("GET /feline/lineset not implemented")
	case "POST":
		return nil, fmt.Errorf("POST /feline/lineset not implemented")
	case "PATCH":
		return nil, fmt.Errorf("PATCH /feline/lineset not implemented")
	case "PUT":
		var info database.LineSetInfo
		err := json.NewDecoder(r.Body).Decode(&info)
		if err != nil {
			return nil, fmt.Errorf("Failed decoding lineset info %s", err.Error())
		}
		info.Id = itemId;
		if err = database.RenameLineSet(userId, &info); err != nil {
			return nil, fmt.Errorf("Failed renaming line set: %s", err.Error())
		}
		return map[string]string{}, nil
	case "DELETE":
		if err = database.DeleteLineSet(userId, itemId); err != nil {
			return nil, fmt.Errorf("Failed deleting line set: %s", err.Error())
		}
		return map[string]string{}, nil
	default:
		return nil, fmt.Errorf("%s not valid", r.Method)
	}
}

//------------------------------------------

func handler(fn func(database.UserId, *http.Request) (response any, err error)) func(http.ResponseWriter, *http.Request) {
	return (func(w http.ResponseWriter, r *http.Request) {
		userId, err := CheckAuth(w, r)
		if err != nil {
			debug.Println("Auth failed: " + err.Error())
			http.Error(w, "Failed to authenticate request", http.StatusUnauthorized)
		}
		debug.Printf("%s %s", r.Method, r.URL.Path)
		resp, err := fn(userId, r)
		if err != nil {
			debug.Println("Request failed: ", err.Error())
			debug.Println("REQUEST:", r)
			http.Error(w, err.Error(), http.StatusNotFound)
		}
		err = json.NewEncoder(w).Encode(resp)
		if err != nil {
			debug.Println("Failed to encode response!")
			debug.Println("RESPONSE:", resp)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
}

FROM golang:1.22.10-alpine
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .
RUN go build -o /feline
EXPOSE 8080
CMD [ "/app/docker/init.sh" ]

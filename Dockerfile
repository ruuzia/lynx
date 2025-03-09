FROM golang:1.22.10-alpine
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o /feline
EXPOSE 8080
CMD [ "/app/init.sh" ]

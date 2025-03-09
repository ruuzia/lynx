FROM golang:1.22.10-alpine AS build
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .
RUN go build -o /feline

FROM alpine
COPY --from=build /feline /feline
COPY --from=build /app/docker /app/docker
COPY --from=build /app/web /app/web
EXPOSE 8080
CMD [ "/app/docker/init.sh" ]

FROM golang:1.22.10-alpine AS build
WORKDIR /app
RUN apk add npm
COPY go.mod .
RUN go mod download
COPY /web/static/package.json ./web/static/
RUN cd ./web/static && npm i
COPY . .
RUN go build -o /feline
RUN cd ./web/static && npx tsc

FROM alpine
COPY --from=build /feline /feline
COPY --from=build /app/docker /app/docker
COPY --from=build /app/web /app/web
EXPOSE 8080
CMD [ "/app/docker/init.sh" ]

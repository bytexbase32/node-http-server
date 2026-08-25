# node-http-server

A minimal HTTP server built from scratch using Node.js core APIs.

## Features

* Custom HTTP router
* GET, POST, PUT, and DELETE routes
* Middleware support
* JSON request body parsing
* CORS support
* In-memory users API
* Static `.txt` and `.html` file serving

## Run

```bash
node src/server.js
```

The server runs on port `8080` by default.

## Routes

```text
GET    /
GET    /about
GET    /users
GET    /users/:id
POST   /users
PUT    /users/:id
DELETE /users/:id
GET    /files/:file
```

## Project Structure

```text
.
├── public/
│   ├── index.html
│   └── test.txt
├── src/
│   └── server.js
├── LICENSE
└── README.md
```

import http from "node:http";
import fs from "node:fs";

const PORT = process.env.PORT || 8080;

console.log(PORT);
let users = [
    { id: 1, name: "Jhon", age: 27, salary: 2000 },
    { id: 2, name: "Jhon", age: 27, salary: 2000 },
];

let MAX_ID = 3;

class Router {
    constructor() {
        this.routes = [];
    }

    get(path, handler) {
        this.routes.push({
            method: "GET",
            path,
            handler,
        });
    }

    post(path, handler) {
        this.routes.push({
            method: "POST",
            path,
            handler,
        });
    }

    put(path, handler) {
        this.routes.push({
            method: "PUT",
            path,
            handler,
        });
    }

    delete(path, handler) {
        this.routes.push({
            method: "DELETE",
            path,
            handler,
        });
    }

    handle(req, res, next) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const urlParts = url.pathname.split("/").slice(1);

            for (const route of this.routes) {
                if (route.method !== req.method) continue;

                const routeParts = route.path.split("/").slice(1);

                if (routeParts.length !== urlParts.length) continue;

                let matched = true;
                let params = {};

                for (let i = 0; i < routeParts.length; i++) {
                    const routePart = routeParts[i];
                    const urlPart = urlParts[i];

                    if (routePart.startsWith(":")) {
                        const paramName = routePart.slice(1);
                        params[paramName] = urlPart;
                    } else if (routePart !== urlPart) {
                        matched = false;
                        break;
                    }
                }

                if (!matched) continue;

                req.params = params;
                return route.handler(req, res, next);
            }
            res.statusCode = 404;
            res.end("Not Found");
        } catch (error) {
            next(error);
        }
    }
}

function runner(req, res, router, errorHandler, ...middlewares) {
    let index = 0;

    function next(error) {
        if (error != undefined) {
            errorHandler(error, req, res);
            return;
        }

        if (index < middlewares.length) {
            const middleware = middlewares[index];
            index++;
            middleware(req, res, next);
        } else {
            router.handle(req, res);
        }
    }

    next();
}

function isValidNumber(val) {
    return typeof val === "number" && Number.isFinite(val);
}

function isValidString(val) {
    return typeof val === "string" && val.trim().length > 0;
}

function middleware1(req, res, next) {
    console.log(req.method, " ", req.url);
    next();
}

function middleware2(req, res, next) {
    console.log("Host: ", req.headers.host);
    next();
}

function corsMiddleware(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader("Access-control-Allow-Headers", "Content-type, Connection");

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
    }
    next();
}

function errorHandler(error, req, res) {
    console.log(error);
    res.statusCode = error.message.startsWith("Invalid") ? 400 : 500;
    res.end(error.message);
}

function jsonBodyMiddleware(req, res, next) {
    if (req.method === "POST" || req.method === "PUT") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                req.body = data;
                next();
            } catch (error) {
                next(new Error("Invalid JSON body"));
            }
        });

        req.on("error", (error) => {
            next(error);
        });
    } else next();
}

function handleHome(req, res) {
    res.setHeader("content-type", "text/html");
    res.write("Home Page.\n");
    res.end();
}

function handleAbout(req, res) {
    res.setHeader("content-type", "text/html");
    res.end("About Page.");
}

function handleGetUsers(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    let newUsers = users;
    if (url.searchParams.has("name")) {
        newUsers = newUsers.filter(
            (user) => user.name === url.searchParams.get("name"),
        );
    }
    if (url.searchParams.has("age")) {
        newUsers = newUsers.filter(
            (user) => user.age === Number(url.searchParams.get("age")),
        );
    }
    if (url.searchParams.has("salary")) {
        newUsers = newUsers.filter(
            (user) => user.salary === Number(url.searchParams.get("salary")),
        );
    }
    if (url.searchParams.has("id")) {
        newUsers = newUsers.filter(
            (user) => user.id === Number(url.searchParams.get("id")),
        );
    }

    res.setHeader("content-type", "application/json");
    res.write(JSON.stringify(newUsers));
    res.end();
}

function handleGetUser(req, res) {
    const id = Number(req.params.id);
    if (!isValidNumber(id)) {
        res.statusCode = 400;
        res.end("Id is not a number.");
        return;
    }
    let user = users.find((user) => user.id === id);
    if (user === undefined) {
        res.statusCode = 404;
        res.end("User not found.");
        return;
    }
    const text = JSON.stringify(user);
    res.setHeader("content-type", "application/json");
    res.end(text);
}

function handleCreateUser(req, res) {
    if (
        !isValidString(req.body.name) ||
        !isValidNumber(req.body.age) ||
        !isValidNumber(req.body.salary)
    ) {
        res.statusCode = 400;
        res.end("Bad request.");
        return;
    }
    let user = req.body;
    user.id = MAX_ID++;
    users.push(user);
    res.statusCode = 201;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(user));
}

function handleUpdateUser(req, res) {
    const id = Number(req.params.id);
    if (!isValidNumber(id)) {
        res.statusCode = 400;
        res.end("Id is not a number.");
        return;
    }

    let user = users.find((user) => user.id === id);
    if (user === undefined) {
        res.statusCode = 404;
        res.end("User not found.");
        return;
    }

    if (
        !isValidString(req.body.name) ||
        !isValidNumber(req.body.age) ||
        !isValidNumber(req.body.salary)
    ) {
        res.statusCode = 400;
        res.end("Bad request.");
        return;
    }
    users = users.map((usermap) => {
        if (usermap.id === id) {
            usermap.name = req.body.name;
            usermap.age = req.body.age;
            usermap.salary = req.body.salary;
        }
        return usermap;
    });
    user = users.find((user) => user.id === id);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(user));
}

function handleDeleteUser(req, res) {
    const id = Number(req.params.id);
    if (!isValidNumber(id)) {
        res.statusCode = 400;
        res.end("Id is not a number.");
        return;
    }
    let user = users.find((user) => user.id === id);
    if (user === undefined) {
        res.statusCode = 404;
        res.end("User not found.");
        return;
    }
    users = users.filter((user) => {
        return user.id !== id;
    });
    res.statusCode = 200;
    res.end("User successfully deleted");
}

function handleFile(req, res) {
    const file = req.params.file;
    if (!file.endsWith(".txt") && !file.endsWith(".html")) {
        res.statusCode = 404;
        res.end("File not found.");
        return;
    }
    try {
        const stream = fs.createReadStream(`./public/${file}`, "utf-8");

        res.statusCode = 200;
        if (file.endsWith(".txt")) res.setHeader("content-type", "text/plain");
        else res.setHeader("content-type", "text/html");

        stream.on("data", (chunk) => {
            res.write(chunk);
        });

        stream.on("end", () => {
            res.end();
        });

        stream.on("error", (error) => {
            res.statusCode = 404;
            res.end("File not found.");
        });
    } catch (error) {
        res.statusCode = 404;
        res.end("File not found.");
    }
}

const router = new Router();

router.get("/", handleHome);
router.get("/about", handleAbout);

router.get("/users", handleGetUsers);
router.get("/users/:id", handleGetUser);

router.post("/users", handleCreateUser);

router.put("/users/:id", handleUpdateUser);

router.delete("/users/:id", handleDeleteUser);

router.get("/files/:file", handleFile);

const server = http.createServer((req, res) => {
    runner(
        req,
        res,
        router,
        errorHandler,
        middleware1,
        middleware2,
        corsMiddleware,
        jsonBodyMiddleware,
    );
});

server.listen(PORT, () => {
    console.log("Server is listening on port 3000.");
});

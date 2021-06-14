const http = require('http')
const httpServer = http.createServer()

const webSocketServer = require('websocket').server

httpServer.listen(9090, () => {
    console.log("Listening to 9090")
})

const wsServer = new webSocketServer({"httpServer": httpServer})

const clients = {};
const games = {};
const colors = {
    "0": "#FEA47F",
    "1": "#25CCF7",
    "2": "#EAB543",
    "3": "#FD7272"
}

wsServer.on("request", (request) => {
    //connect
    const connection = request.accept(null, request.origin)

    connection.on("open", () => {
        console.log("Opened")
    })

    connection.on("close", () => {
        console.log("Closed")
    })

    connection.on("message", (msg) => {
        const result = JSON.parse(msg.utf8Data)
        // a user want to create a new game
        if (result.method === 'create') {
            const clientId = result.clientId
            const gameId = guid()
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            }

            const payload = {
                "method": "create",
                "clientId": clientId,
                "game": games[gameId]
            }
            clients[clientId].connection.send(JSON.stringify(payload))
        } else if (result.method === 'join') {
            const clientId = result.clientId
            const gameId = result.gameId
            const game = games[gameId]
            if (game.clients.length >= 4) {
                const payload = {
                    "method": "normal_error",
                    "clientId": clientId,
                    "errorMsg": "Players Limit reached"
                }
                clients[clientId].connection.send(JSON.stringify(payload))
                return
            }
            game.clients.push({"clientId": clientId, "color": colors[game.clients.length]})

            const payload = {
                "method": "join",
                "game": game
            }
            if (game.clients.length === 4) {
                updateGameState()
            }
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payload))
            })
        } else if (result.method === 'play') {
            const clientId = result.clientId
            const gameId = result.gameId
            const ballId = result.ballId
            const color = result.color
            let state = games[gameId].state
            if (!state) {
                state = {}
            }
            state[ballId] = color
            games[gameId].state = state

            const payload = {
                "method": "play",
                "game": games[gameId]
            }
            // games[gameId].clients.forEach(c => {
            //     clients[c.clientId].connection.send(JSON.stringify(payload))
            // })
        }
    })

    //generate a new client ID
    const clientId = guid()
    clients[clientId] = {
        "connection": connection
    }

    const payload = {
        "method": "connect",
        "clientId": clientId,
    }

    //send back the client connect.
    connection.send(JSON.stringify(payload))
})

function updateGameState() {
    for (const g of Object.keys(games)) {
        const payload = {
            "method": "update",
            "game": games[g]
        }
        games[g].clients.forEach(c => {
           clients[c.clientId].connection.send(JSON.stringify(payload))
        })
    }
    setTimeout(updateGameState, 500)
}


const app = require("express")()

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.listen(9091, () => {
    console.log("Listening to 9091")
})

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();

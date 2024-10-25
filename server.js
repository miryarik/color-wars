const WebSocket = require('ws');
let clients = {};
const cols = 8;
const rows = 8;
let board;
let turn;
let isGameOver = false;

function checkGameOver(client1, client2) {
    let player0Count = 0;
    let player1Count = 0;

    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
            if (board[i][j] !== null) {
                if (board[i][j].playerNum === 0)
                    player0Count ++;
                else
                    player1Count++;
            }
        }

    if (player0Count === 0) {
        client1.socket.send(toClient('gameOver', `1`));
        client2.socket.send(toClient('gameOver', `1`));
        isGameOver = true;
    }

    if (player1Count === 0) {
        client1.socket.send(toClient('gameOver', `0`));
        client2.socket.send(toClient('gameOver', `0`));
        isGameOver = true;
    }

}

// handle split
function handleSplit(row, col) {
    console.error("handlesplit called");
    
    
    if (board[row][col].count > 3) {
        board[row][col] = null;
        
        
        for (let i of [-1, 1]) {
        
            if (row + i >= 0 && row + i < rows) {  
                if (board[row + i][col] === null) {
                    board[row + i][col] = {count : 1, playerNum : turn}; 
                }
                else {
                    board[row + i][col].count++;
                    board[row + i][col].playerNum = turn;
                    handleSplit(row + i, col);
                }
            }
            
        
            if (col + i >= 0 && col + i < cols) {
                if (board[row][col + i] === null) {
                    board[row][col + i] = {count : 1, playerNum : turn};
                }
                else {
                    board[row][col + i].count++;
                    board[row][col + i].playerNum = turn;
                    handleSplit(row, col + i);
                }
            }
        }
    }
}

const clientReady = function (clientAddress) {
    
    clients[clientAddress].ready = true;

    if (Object.keys(clients).length !== 2) return;

    const [client1, client2] = Object.values(clients);

    if (client1.ready && client2.ready) {
        isGameOver = false;
        playerNum = Number(Math.random() >= 0.5);
        client1.playerNum = playerNum;
        client2.playerNum = 1 - playerNum;
        
        client1.socket.send(JSON.stringify({
            event: "init",
            msg: client1.playerNum,
        }));

        client2.socket.send(JSON.stringify({
            event: "init",
            msg: client2.playerNum,
        }));


        board = [];
        for (let i = 0; i < rows; i++) {
            board.push([]);
            
            for (let j = 0; j < cols; j++) {
              board[i].push(null);
            }
        }

        turn = 0;
        console.log("ready called");
    }
}

function checkMove(row, col, id) {



    if(row >= rows || col >= cols)
        return;

    console.log("Check move called by :", clients[id].playerNum);

    if (clients[id].playerNum !== turn || isGameOver) return;
    const [client1, client2] = Object.values(clients);

    console.log("player", clients[id].playerNum, "started", clients[id].started);
    console.log("clicked coord",row, col);
    console.log("clicked :", board[row][col]);
    

    if (!clients[id].started && board[row][col] === null) {
        
        console.log("turn ", turn);
        
        client1.socket.send(toClient('move', `${row},${col},${turn}`));
        client2.socket.send(toClient('move', `${row},${col},${turn}`));
        
        board[row][col] = {count: 3, playerNum: turn};
        
        turn = Number(!turn);
        clients[id].started = true;
        console.log("first turn played : ");
        console.log(clients[id].playerNum, clients[id].started);
        
        return;
    }
    
    const cell = board[row][col];
    if (cell === null || cell.playerNum !== turn) {
        console.log("Not my cell or turn");
        return;
    }

    cell.count++;

    client1.socket.send(toClient('move', `${row},${col},${turn}`));
    client2.socket.send(toClient('move', `${row},${col},${turn}`));
    
    console.log("move granted");
    
    handleSplit(row, col);
    checkGameOver(client1, client2);
    turn = Number(!turn);
}

function toClient(event, msg) {
    return JSON.stringify({
        event,
        msg,
    });
}

const server = new WebSocket.Server({port: 3000});

server.on("connection",
    (socket) => {
        if (Object.keys(clients).length === 2) {
            socket.send("max connections reached");
            socket.close();
            return;
        }
        
        const clientAddress = `${socket._socket.remoteAddress}:${socket._socket.remotePort}`;

        socket.on('close', () => {
            console.log("connection closed");
            delete clients[clientAddress];
        })
        

        clients[clientAddress] = {
            socket: socket,
            playerNum: null,
            ready: false,
            started: false,
        };

        console.log(`New connection from ${clientAddress}`);
        
        socket.on('message', (data) => {
            const clientRequest = JSON.parse(data.toString());
            
            switch (clientRequest.event) {
                case 'checkMove':
                    const [row, col] = clientRequest.msg.split(',');
                    checkMove(Number(row), Number(col), clientAddress);
                    break;
                
                case 'ready':
                    clientReady(clientAddress);
                    
                    break;
            }

        });
    }
);
let socket;
const moveRequest = {}
let clr = null;
const clr1 = "#EA4335";
const clr2 = "#4285F4";
const backgroundClr = "#1F1F1F";
const rectClr = "#2F2F2F";
const cols = 8;
const rows = 8;
let myTurn;

function gameOver(winner) {
  const infoHeader = document.querySelector("#info-header");

  const msg = myTurn === Number(winner) ? "You win" : "You lose";
  console.log(typeof winner, winner);
  console.log(typeof myTurn, myTurn);
  
  
  infoHeader.innerText = msg;

}

function showTurn(myTurn, turn = 0) {
  console.log("show turn called", myTurn, turn);
  
  const infoHeader = document.querySelector("#info-header");

  if (myTurn === turn)
    {
      infoHeader.innerText = "Your turn";
    }
  else
    {
      infoHeader.innerText = "Opponent's turn";
    }
}

function init(msg) {
  myTurn = msg;
  clr = msg === 0 ? clr1 : clr2;
  showTurn(myTurn);
  console.log("I am ", myTurn);
  console.log("my color is ", clr);
  
}

function toServer(event, msg) {
    return JSON.stringify({
        event,
        msg,
    });
}


function onMessageReceived(event) {
    const serverData = JSON.parse(event.data);

    switch (serverData.event) {
        case "init":
            init(serverData.msg);
            break;
        
        case "move":
            const [row, col, turn] = serverData.msg.split(',');
            move(Number(row), Number(col), Number(turn));
            console.log("server turn", turn);
            showTurn(myTurn, Number(!Number(turn)));
            break;

        case "gameOver":
            gameOver(serverData.msg);
            break;
    }
}


// drawing
let cellSize = 80;
const outerPadding = 10;
const innerPadding = 0.05 * cellSize;
const board = [];


function setup() {
  socket = new WebSocket('wss://color-wars.onrender.com');
  socket.onmessage = onMessageReceived;

  const marginFactor = 0.8;
  const gridWidth = Math.min(windowWidth, windowHeight) * marginFactor;
  cellSize = gridWidth / cols ;

  const borderOffset = 20;
  const canvasSize = cellSize * cols + borderOffset;
  createCanvas(canvasSize, canvasSize);
  
  for (let i = 0; i < rows; i++) {
    board.push([]);
    
    for (let j = 0; j < cols; j++) {
      board[i].push(null);
    }
  }

  socket.onopen = () => {
    socket.send(toServer('ready', ''));
  }
}


function makeCircle(row, col, count = 3, clr = clr1) {
  const x = outerPadding + col * cellSize + cellSize / 2;
  const y = outerPadding + row * cellSize + cellSize / 2;
  const dotSize = cellSize * 0.15;
  const fact = 1.25;
  fill(clr);
  stroke('white');
  circle(x, y, cellSize * 0.75);
  fill('white');
  stroke('white');
  
  switch (count) {
    case 1:
      circle(x, y, dotSize);
      break;
      
    case 2:
      circle(x - fact * dotSize, y, dotSize);
      circle(x + fact * dotSize, y, dotSize);
      break;
      
    case 3:
      circle(x, y - fact * dotSize, dotSize);
      circle(x + fact * dotSize * cos(PI / 6), y + fact * dotSize * sin(PI / 6), dotSize);
      circle(x - fact * dotSize * cos(PI / 6), y + fact * dotSize * sin(PI / 6), dotSize);
      break;
    
    case 4:
      for (let i of [-1, 1])
        for (let j of [-1, 1])
          circle(x + i * fact * dotSize, y + j * fact * dotSize, dotSize);
  }
}

function draw() {

  background(myTurn === 0 ? clr1 : clr2);
  fill(backgroundClr);
  stroke('black');
  rect(outerPadding, outerPadding, cellSize * cols, cellSize * rows);
  
  // for (let i = 1; i < rows; i++) {
  //   line(padding, i * cellSize + padding, padding + cellSize * cols, i * cellSize + padding);
  // }
  
  // for (let i = 1; i < cols; i++) {
  //   line(i * cellSize + padding, padding, i * cellSize + padding, rows * cellSize + padding);
  // }

  for(let i = 0; i < rows; i++) {
    for(let j = 0; j < cols; j++) {
      fill(rectClr);
      rect(outerPadding + innerPadding + i * cellSize, outerPadding + innerPadding + j * cellSize, cellSize - 2 * innerPadding, cellSize - 2 * innerPadding, 0.2 * cellSize);
    }
  }
  
  for (let i = 0; i < rows; i++) {    
    for (let j = 0; j < cols; j++) {
      const cell = board[i][j]
      if (cell !== null)
        makeCircle(i, j, cell.count, cell.clr);
    }
  }
  
}

function mouseClicked() {

  if (clr === null) return;
  if (mouseX < outerPadding || mouseX > cellSize * cols + outerPadding || mouseY < outerPadding || mouseY > cellSize * rows + outerPadding) return;
    
    
  const row = floor(mouseY / cellSize);
  const col = floor(mouseX / cellSize);

  if(row >= rows || col >= cols)
      return;
    
  socket.send(toServer('checkMove', `${row},${col}`));

}

function move(row, col, turn) {
  console.log("move called by server");
  
  const otherClr = clr === clr1 ? clr2 : clr1;

  turn = Number(turn);
  
  if (board[row][col] === null) {
      board[row][col] = { count: 3, clr: turn === myTurn ? clr : otherClr };
      return;
  }

  board[row][col].count++;

  console.log("Move granted by server - turn is ", turn);
  handleSplit(row, col, turn === myTurn ? clr : otherClr);
}

// passed turn is a color
function handleSplit(row, col, turn) {
  console.log(row, col);
  if (board[row][col].count > 3) {
    board[row][col] = null;
    
    
    for (let i of [-1, 1]) {
      
      if (row + i >= 0 && row + i < rows) {  
        if (board[row + i][col] === null) {
           board[row + i][col] = {count : 1, clr : turn};
            
        }
        else {
          board[row + i][col].count++;
          board[row + i][col].clr = turn;
          handleSplit(row + i, col, turn);
        }
      }
        
      
      if (col + i >= 0 && col + i < cols) {
        if (board[row][col + i] === null) {
          board[row][col + i] = {count : 1, clr : turn};
        }
        else {
          board[row][col + i].count++;
          board[row][col + i].clr = turn;
          handleSplit(row, col + i, turn);
        }
      }
    }
  }
}
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Parse JSON bodies
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Email configuration (using Gmail)
let emailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });
    console.log('Email service configured');
} else {
    console.log('Email service not configured - set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
}

// Twilio configuration for SMS
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Notification recipients
const NOTIFICATION_EMAIL = 'neilteje@gmail.com';
const NOTIFICATION_PHONE = '+14693602509';

// Send notification function
async function sendNotification() {
    const results = { email: false, sms: false };
    
    // Send email
    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: process.env.GMAIL_USER,
                to: NOTIFICATION_EMAIL,
                subject: 'Neil, wya? Eshana wants to playyy!',
                html: `
                    <h2>Game Invitation!</h2>
                    <p>Eshana is waiting for you to join the game!</p>
                    <p><a href="${process.env.GAME_URL || 'https://creamsodagames.vercel.app'}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">hurrry join now jaldi</a></p>
                    <p style="margin-top: 20px; color: #666;">Come play Tic Tac Toe or Connect 4!</p>
                `
            });
            results.email = true;
            console.log('Email sent successfully');
        } catch (error) {
            console.error('Email error:', error.message);
        }
    } else {
        console.log('Email not configured - skipping email notification');
    }
    
    return results;
}

// API endpoint for sending invite
app.post('/api/invite', async (req, res) => {
    try {
        const results = await sendNotification();
        res.json({ 
            success: true, 
            email: results.email, 
            sms: results.sms,
            message: 'Notification sent!' 
        });
    } catch (error) {
        console.error('Invite error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send notification' 
        });
    }
});

// Game state management
const gameState = {
  players: [],
  waitingPlayer: null,
  activeGames: new Map(),
  waitingPairs: new Map() // Store pairs waiting for game selection
};

// Tic Tac Toe game logic
function checkTicTacToeWinner(board) {
  const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]              // diagonals
  ];

  for (let condition of winConditions) {
    const [a, b, c] = condition;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== null)) {
    return 'draw';
  }

  return null;
}

// Connect 4 game logic
function checkConnect4Winner(board, row, col, player) {
  const rows = 6;
  const cols = 7;
  
  // Check horizontal
  let count = 1;
  for (let c = col - 1; c >= 0 && board[row * cols + c] === player; c--) count++;
  for (let c = col + 1; c < cols && board[row * cols + c] === player; c++) count++;
  if (count >= 4) return player;

  // Check vertical
  count = 1;
  for (let r = row - 1; r >= 0 && board[r * cols + col] === player; r--) count++;
  for (let r = row + 1; r < rows && board[r * cols + col] === player; r++) count++;
  if (count >= 4) return player;

  // Check diagonal (top-left to bottom-right)
  count = 1;
  for (let r = row - 1, c = col - 1; r >= 0 && c >= 0 && board[r * cols + c] === player; r--, c--) count++;
  for (let r = row + 1, c = col + 1; r < rows && c < cols && board[r * cols + c] === player; r++, c++) count++;
  if (count >= 4) return player;

  // Check diagonal (top-right to bottom-left)
  count = 1;
  for (let r = row - 1, c = col + 1; r >= 0 && c < cols && board[r * cols + c] === player; r--, c++) count++;
  for (let r = row + 1, c = col - 1; r < rows && c >= 0 && board[r * cols + c] === player; r++, c--) count++;
  if (count >= 4) return player;

  // Check for draw (board full)
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }

  return null;
}

function dropPiece(board, col, player) {
  const rows = 6;
  const cols = 7;
  
  for (let row = rows - 1; row >= 0; row--) {
    const index = row * cols + col;
    if (board[index] === null) {
      board[index] = player;
      return { row, col, index };
    }
  }
  return null; // Column is full
}

function createGame(player1, player2, gameType) {
  const gameId = `${player1.id}-${player2.id}`;
  
  let board, boardConfig;
  if (gameType === 'tictactoe') {
    board = Array(9).fill(null);
    boardConfig = { rows: 3, cols: 3 };
  } else { // connect4
    board = Array(42).fill(null); // 6 rows x 7 cols
    boardConfig = { rows: 6, cols: 7 };
  }
  
  const game = {
    id: gameId,
    type: gameType,
    board: board,
    boardConfig: boardConfig,
    currentPlayer: 'X',
    playerX: player1.id,
    playerO: player2.id,
    status: 'playing'
  };

  gameState.activeGames.set(gameId, game);
  return game;
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Matchmaking: pair players
  if (gameState.waitingPlayer === null) {
    // First player - wait for opponent
    gameState.waitingPlayer = socket.id;
    socket.emit('waiting', { message: 'Waiting for another player...' });
    console.log('Player waiting:', socket.id);
  } else {
    // Second player found - show game selection
    const player1 = { id: gameState.waitingPlayer };
    const player2 = { id: socket.id };
    const pairId = `${player1.id}-${player2.id}`;
    
    gameState.waitingPairs.set(pairId, { player1, player2 });
    
    // Notify both players to show game selection
    console.log('Emitting showGameSelection to player1:', player1.id);
    console.log('Emitting showGameSelection to player2:', player2.id);
    io.to(player1.id).emit('showGameSelection', { isPlayer1: true });
    io.to(player2.id).emit('showGameSelection', { isPlayer1: false });
    
    console.log('Players paired, waiting for game selection:', pairId);
    gameState.waitingPlayer = null;
  }

  // Handle game selection
  socket.on('selectGame', (data) => {
    const { gameType } = data;
    
    // Find the pair this player belongs to
    let pairId = null;
    let pair = null;
    
    for (let [id, p] of gameState.waitingPairs.entries()) {
      if (p.player1.id === socket.id || p.player2.id === socket.id) {
        pairId = id;
        pair = p;
        break;
      }
    }
    
    if (!pair) {
      socket.emit('error', { message: 'Pair not found' });
      return;
    }
    
    // Create game with selected type
    const game = createGame(pair.player1, pair.player2, gameType);
    gameState.waitingPairs.delete(pairId);
    
    // Notify both players
    io.to(pair.player1.id).emit('gameStart', {
      gameId: game.id,
      gameType: game.type,
      symbol: 'X',
      board: game.board,
      boardConfig: game.boardConfig,
      currentPlayer: game.currentPlayer
    });
    
    io.to(pair.player2.id).emit('gameStart', {
      gameId: game.id,
      gameType: game.type,
      symbol: 'O',
      board: game.board,
      boardConfig: game.boardConfig,
      currentPlayer: game.currentPlayer
    });

    console.log('Game started:', game.id, 'Type:', gameType);
  });

  // Handle move
  socket.on('move', (data) => {
    const { gameId, cellIndex, column } = data;
    const game = gameState.activeGames.get(gameId);

    if (!game || game.status !== 'playing') {
      socket.emit('error', { message: 'Invalid game or game finished' });
      return;
    }

    // Check if it's the player's turn
    const playerSymbol = socket.id === game.playerX ? 'X' : 'O';
    if (playerSymbol !== game.currentPlayer) {
      socket.emit('error', { message: 'Not your turn!' });
      return;
    }

    let moveResult = null;
    let winner = null;

    if (game.type === 'tictactoe') {
      // Tic Tac Toe move
      if (game.board[cellIndex] !== null) {
        socket.emit('error', { message: 'Cell already taken!' });
        return;
      }
      game.board[cellIndex] = game.currentPlayer;
      winner = checkTicTacToeWinner(game.board);
    } else if (game.type === 'connect4') {
      // Connect 4 move
      if (column === undefined || column < 0 || column >= game.boardConfig.cols) {
        socket.emit('error', { message: 'Invalid column!' });
        return;
      }
      
      moveResult = dropPiece(game.board, column, game.currentPlayer);
      if (!moveResult) {
        socket.emit('error', { message: 'Column is full!' });
        return;
      }
      
      winner = checkConnect4Winner(game.board, moveResult.row, moveResult.col, game.currentPlayer);
    }
    
    if (winner) {
      game.status = winner === 'draw' ? 'draw' : 'finished';
      game.winner = winner === 'draw' ? null : winner;
      
      // Notify both players
      io.to(game.playerX).emit('gameOver', {
        winner: game.winner,
        board: game.board,
        isDraw: winner === 'draw',
        gameType: game.type
      });
      io.to(game.playerO).emit('gameOver', {
        winner: game.winner,
        board: game.board,
        isDraw: winner === 'draw',
        gameType: game.type
      });
    } else {
      // Switch turns
      game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
      
      // Notify both players
      const moveData = {
        board: game.board,
        currentPlayer: game.currentPlayer,
        gameType: game.type
      };
      
      if (moveResult) {
        moveData.droppedPiece = moveResult;
        moveData.droppedPiece.player = game.currentPlayer === 'X' ? 'O' : 'X'; // The player who just moved
      }
      
      io.to(game.playerX).emit('moveMade', moveData);
      io.to(game.playerO).emit('moveMade', moveData);
    }
  });

  // Handle rematch request
  socket.on('rematch', (data) => {
    const { gameId } = data;
    const game = gameState.activeGames.get(gameId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Reset game
    if (game.type === 'tictactoe') {
      game.board = Array(9).fill(null);
    } else {
      game.board = Array(42).fill(null);
    }
    game.currentPlayer = 'X';
    game.status = 'playing';
    game.winner = null;

    // Notify both players
    io.to(game.playerX).emit('gameStart', {
      gameId: game.id,
      gameType: game.type,
      symbol: 'X',
      board: game.board,
      boardConfig: game.boardConfig,
      currentPlayer: game.currentPlayer
    });
    
    io.to(game.playerO).emit('gameStart', {
      gameId: game.id,
      gameType: game.type,
      symbol: 'O',
      board: game.board,
      boardConfig: game.boardConfig,
      currentPlayer: game.currentPlayer
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // If waiting player disconnects, clear waiting state
    if (gameState.waitingPlayer === socket.id) {
      gameState.waitingPlayer = null;
    }

    // Remove player from waiting pairs
    for (let [pairId, pair] of gameState.waitingPairs.entries()) {
      if (pair.player1.id === socket.id || pair.player2.id === socket.id) {
        gameState.waitingPairs.delete(pairId);
        const otherPlayerId = pair.player1.id === socket.id ? pair.player2.id : pair.player1.id;
        io.to(otherPlayerId).emit('opponentDisconnected', { message: 'Your opponent disconnected' });
      }
    }

    // Remove player from active games
    for (let [gameId, game] of gameState.activeGames.entries()) {
      if (game.playerX === socket.id || game.playerO === socket.id) {
        gameState.activeGames.delete(gameId);
        // Notify other player
        const otherPlayerId = game.playerX === socket.id ? game.playerO : game.playerX;
        io.to(otherPlayerId).emit('opponentDisconnected', { message: 'Your opponent disconnected' });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


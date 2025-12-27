// Initialize Socket.io connection
const socket = io();

// Game selection handlers - use event delegation
function setupGameSelectionHandlers() {
    // Use event delegation on the game selection container
    const gameSelectionContainer = document.querySelector('.game-options') || gameSelectionEl;
    if (gameSelectionContainer) {
        gameSelectionContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.game-option');
            if (!option) return;
            
            console.log('Game option clicked:', option.dataset.game);
            if (option.disabled) {
                console.log('Option is disabled, ignoring');
                return;
            }
            
            const gameType = option.dataset.game;
            if (!gameType) {
                console.error('No game type found on option');
                return;
            }
            
            console.log('Emitting selectGame with type:', gameType);
            socket.emit('selectGame', { gameType: gameType });
            
            // Disable options while waiting
            document.querySelectorAll('.game-option').forEach(opt => {
                opt.disabled = true;
                opt.style.opacity = '0.6';
            });
        });
        console.log('Game selection handlers set up');
    } else {
        console.error('Game selection container not found!');
    }
}

// Ensure everything is hidden on page load
window.addEventListener('DOMContentLoaded', () => {
    hideGameSelection();
    hideGame();
    setupGameSelectionHandlers();
});

// Game state
let gameState = {
    gameId: null,
    gameType: null,
    symbol: null,
    board: null,
    boardConfig: null,
    currentPlayer: 'X'
};

// DOM elements
const statusEl = document.getElementById('status');
const gameSelectionEl = document.getElementById('gameSelection');
const gameInfoEl = document.getElementById('gameInfo');
const gameBoardEl = document.getElementById('gameBoard');
const connect4ColumnsEl = document.getElementById('connect4Columns');
const gameOverEl = document.getElementById('gameOver');
const errorEl = document.getElementById('error');
const errorTextEl = document.getElementById('errorText');
const playerBadgeEl = document.getElementById('playerBadge');
const playerSymbolTextEl = document.getElementById('playerSymbolText');
const turnTextEl = document.getElementById('turnText');
const gameOverMessageEl = document.getElementById('gameOverMessage');
const rematchBtnEl = document.getElementById('rematchBtn');
const backToSelectionBtnEl = document.getElementById('backToSelectionBtn');
const selectionHintEl = document.getElementById('selectionHint');
const inviteSectionEl = document.getElementById('inviteSection');
const inviteBtnEl = document.getElementById('inviteBtn');

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateStatus('Connected! Waiting for another player...', 'waiting');
});

socket.on('waiting', (data) => {
    updateStatus(data.message, 'waiting');
    hideGameSelection();
    hideGame();
    showInviteButton();
});

socket.on('showGameSelection', (data) => {
    console.log('showGameSelection received:', data);
    updateStatus('Player found! Choose a game to play.', 'connected');
    hideGame(); // Make sure game is hidden
    hideInviteButton(); // Hide invite button when player found
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        showGameSelection(data.isPlayer1);
        // Re-setup handlers in case they weren't ready
        setupGameSelectionHandlers();
    }, 100);
});

socket.on('gameStart', (data) => {
    gameState.gameId = data.gameId;
    gameState.gameType = data.gameType;
    gameState.symbol = data.symbol;
    gameState.board = data.board;
    gameState.boardConfig = data.boardConfig;
    gameState.currentPlayer = data.currentPlayer;

    updateStatus('Game started!', 'connected');
    hideGameSelection();
    hideInviteButton();
    showGame();
    updatePlayerInfo();
    renderBoard();
    updateTurnIndicator();
});

socket.on('moveMade', (data) => {
    gameState.board = data.board;
    gameState.currentPlayer = data.currentPlayer;
    renderBoard();
    updateTurnIndicator();
    
    // Animate dropped piece for Connect 4
    if (data.droppedPiece && gameState.gameType === 'connect4') {
        animateDrop(data.droppedPiece);
    }
});

socket.on('gameOver', (data) => {
    gameState.board = data.board;
    renderBoard();
    showGameOver(data.winner, data.isDraw);
});

socket.on('opponentDisconnected', (data) => {
    updateStatus(data.message + ' Waiting for a new opponent...', 'waiting');
    hideGameSelection();
    hideGame();
    gameState = {
        gameId: null,
        gameType: null,
        symbol: null,
        board: null,
        boardConfig: null,
        currentPlayer: 'X'
    };
});

socket.on('error', (data) => {
    showError(data.message);
});

// UI update functions
function updateStatus(message, className = '') {
    statusEl.textContent = message;
    statusEl.className = `status-message ${className}`;
}

function showGameSelection(isPlayer1) {
    console.log('=== showGameSelection called ===');
    console.log('isPlayer1:', isPlayer1);
    console.log('gameSelectionEl:', gameSelectionEl);
    console.log('gameSelectionEl exists?', !!gameSelectionEl);
    
    // Hide game first
    hideGame();
    
    // Show selection - use block display
    if (!gameSelectionEl) {
        console.error('gameSelectionEl not found! Trying to find it...');
        const found = document.getElementById('gameSelection');
        console.log('Found by ID:', found);
        if (!found) {
            console.error('CRITICAL: gameSelection element does not exist in DOM!');
            return;
        }
    }
    
    gameSelectionEl.style.display = 'block';
    console.log('Game selection display set to block');
    
    if (selectionHintEl) {
        selectionHintEl.textContent = isPlayer1 
            ? 'You choose the game! (Both players will play the selected game)' 
            : 'Waiting for opponent to choose a game...';
    }
    
    // Enable/disable game options based on whether this player can choose
    const gameOptions = document.querySelectorAll('.game-option');
    console.log('Found game options:', gameOptions.length);
    
    if (gameOptions.length === 0) {
        console.error('CRITICAL: No game options found!');
    }
    
    gameOptions.forEach((option, index) => {
        console.log(`Option ${index}:`, option.dataset.game, 'disabled:', option.disabled);
        if (isPlayer1) {
            option.disabled = false;
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
        } else {
            option.disabled = true;
            option.style.opacity = '0.6';
            option.style.cursor = 'not-allowed';
        }
    });
    
    console.log('=== showGameSelection complete ===');
}

function hideGameSelection() {
    gameSelectionEl.style.display = 'none';
}

function showGame() {
    gameInfoEl.style.display = 'flex';
    gameBoardEl.style.display = 'grid';
    gameOverEl.style.display = 'none';
    errorEl.classList.remove('show');
    
    // Always hide column buttons - we click cells directly now
    connect4ColumnsEl.style.display = 'none';
}

function hideGame() {
    gameInfoEl.style.display = 'none';
    gameBoardEl.style.display = 'none';
    connect4ColumnsEl.style.display = 'none';
    gameOverEl.style.display = 'none';
}

function updatePlayerInfo() {
    playerBadgeEl.className = `player-badge ${gameState.symbol.toLowerCase()}`;
    playerBadgeEl.textContent = gameState.symbol;
    playerSymbolTextEl.textContent = gameState.symbol;
}

function updateTurnIndicator() {
    const isMyTurn = gameState.currentPlayer === gameState.symbol;
    turnTextEl.textContent = isMyTurn ? 'Your turn!' : "Opponent's turn";
    turnTextEl.className = isMyTurn ? 'turn-indicator your-turn' : 'turn-indicator opponent-turn';
    
    if (gameState.gameType === 'tictactoe') {
        // Enable/disable cells for Tic Tac Toe
        const cells = gameBoardEl.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            if (gameState.board[index] || !isMyTurn) {
                cell.classList.add('disabled');
            } else {
                cell.classList.remove('disabled');
            }
        });
    } else if (gameState.gameType === 'connect4') {
        // Enable/disable cells for Connect 4 based on column
        const cells = gameBoardEl.querySelectorAll('.cell.connect4');
        const cols = gameState.boardConfig.cols;
        
        cells.forEach((cell) => {
            const col = parseInt(cell.dataset.col);
            const isColumnFull = isConnect4ColumnFull(col);
            
            if (isColumnFull || !isMyTurn) {
                cell.classList.add('disabled');
                cell.style.cursor = 'not-allowed';
            } else {
                cell.classList.remove('disabled');
                cell.style.cursor = 'pointer';
            }
        });
    }
}

function isConnect4ColumnFull(col) {
    const rows = gameState.boardConfig.rows;
    const cols = gameState.boardConfig.cols;
    return gameState.board[0 * cols + col] !== null; // Top row of column
}

function renderBoard() {
    gameBoardEl.innerHTML = '';
    
    if (gameState.gameType === 'tictactoe') {
        gameBoardEl.className = 'game-board tictactoe';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            const value = gameState.board[i];
            if (value) {
                cell.textContent = value;
                cell.classList.add(value.toLowerCase());
            }
            cell.addEventListener('click', () => handleTicTacToeMove(i));
            gameBoardEl.appendChild(cell);
        }
    } else if (gameState.gameType === 'connect4') {
        gameBoardEl.className = 'game-board connect4';
        const rows = gameState.boardConfig.rows;
        const cols = gameState.boardConfig.cols;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell connect4';
                cell.dataset.row = row;
                cell.dataset.col = col;
                const index = row * cols + col;
                const value = gameState.board[index];
                if (value) {
                    cell.classList.add(value.toLowerCase());
                }
                // Make cell clickable - clicking any cell in a column drops in that column
                cell.addEventListener('click', () => handleConnect4Move(col));
                gameBoardEl.appendChild(cell);
            }
        }
    }
}

// setupConnect4Columns() no longer needed - cells are clickable directly

function handleTicTacToeMove(cellIndex) {
    if (gameState.currentPlayer !== gameState.symbol) {
        showError("Not your turn!");
        return;
    }

    if (gameState.board[cellIndex] !== null) {
        showError("Cell already taken!");
        return;
    }

    if (!gameState.gameId) {
        showError("Game not started yet!");
        return;
    }

    socket.emit('move', {
        gameId: gameState.gameId,
        cellIndex: cellIndex
    });
}

function handleConnect4Move(column) {
    if (gameState.currentPlayer !== gameState.symbol) {
        showError("Not your turn!");
        return;
    }

    if (isConnect4ColumnFull(column)) {
        showError("Column is full!");
        return;
    }

    if (!gameState.gameId) {
        showError("Game not started yet!");
        return;
    }

    socket.emit('move', {
        gameId: gameState.gameId,
        column: column
    });
}

function animateDrop(droppedPiece) {
    const rows = gameState.boardConfig.rows;
    const cols = gameState.boardConfig.cols;
    const cells = gameBoardEl.querySelectorAll('.cell.connect4');
    
    // The piece belongs to the player who just moved (opposite of currentPlayer)
    const piecePlayer = droppedPiece.player || (gameState.currentPlayer === 'X' ? 'O' : 'X');
    
    // Animate from top to bottom
    for (let row = 0; row <= droppedPiece.row; row++) {
        setTimeout(() => {
            // Find the cell by row and col data attributes
            const targetCell = Array.from(cells).find(cell => 
                parseInt(cell.dataset.row) === row && 
                parseInt(cell.dataset.col) === droppedPiece.col
            );
            
            if (!targetCell) return;
            
            if (row < droppedPiece.row) {
                // Temporary highlight
                targetCell.style.transform = 'scale(1.1)';
                targetCell.style.transition = 'transform 0.1s';
                setTimeout(() => {
                    targetCell.style.transform = 'scale(1)';
                }, 100);
            } else {
                // Final position
                targetCell.classList.add(piecePlayer.toLowerCase());
                targetCell.style.transform = 'scale(1)';
            }
        }, row * 50);
    }
}

function showGameOver(winner, isDraw) {
    gameOverEl.style.display = 'block';
    
    if (isDraw) {
        gameOverMessageEl.textContent = "It's a Draw!";
        gameOverEl.className = 'game-over draw';
    } else if (winner === gameState.symbol) {
        gameOverMessageEl.textContent = 'You Win!! neil loves you';
        gameOverEl.className = 'game-over win';
    } else {
        gameOverMessageEl.textContent = 'You Lose';
        gameOverEl.className = 'game-over lose';
    }
    
    // Disable all interactions
    const cells = gameBoardEl.querySelectorAll('.cell');
    cells.forEach(cell => cell.classList.add('disabled'));
}

function showError(message) {
    errorTextEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}


// Rematch button handler
rematchBtnEl.addEventListener('click', () => {
    if (gameState.gameId) {
        socket.emit('rematch', { gameId: gameState.gameId });
        gameOverEl.style.display = 'none';
    }
});

// Back to selection button handler
backToSelectionBtnEl.addEventListener('click', () => {
    // Reset and wait for new opponent
    hideGame();
    gameState = {
        gameId: null,
        gameType: null,
        symbol: null,
        board: null,
        boardConfig: null,
        currentPlayer: 'X'
    };
    updateStatus('Waiting for another player...', 'waiting');
    showInviteButton();
});

// Invite button functionality
function showInviteButton() {
    if (inviteSectionEl) {
        inviteSectionEl.style.display = 'block';
    }
}

function hideInviteButton() {
    if (inviteSectionEl) {
        inviteSectionEl.style.display = 'none';
    }
}

if (inviteBtnEl) {
    inviteBtnEl.addEventListener('click', async () => {
        inviteBtnEl.disabled = true;
        const originalText = inviteBtnEl.textContent;
        inviteBtnEl.textContent = 'Sending...';
        
        try {
            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                inviteBtnEl.textContent = '✅ Sent!';
                showError('Notification sent! Check your email/phone.');
                setTimeout(() => {
                    inviteBtnEl.textContent = originalText;
                    inviteBtnEl.disabled = false;
                }, 3000);
            } else {
                inviteBtnEl.textContent = originalText;
                inviteBtnEl.disabled = false;
                showError('Failed to send notification. Check server configuration.');
            }
        } catch (error) {
            console.error('Invite error:', error);
            inviteBtnEl.textContent = originalText;
            inviteBtnEl.disabled = false;
            showError('Failed to send notification.');
        }
    });
}

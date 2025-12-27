# Game Hub - Multiplayer Games

A beautiful multiplayer gaming platform with Tic Tac Toe and Connect 4! Built with Node.js, Express, and Socket.io. Perfect for playing with a friend!

## Features

- 🎮 **Two Games**: Tic Tac Toe and Connect 4
- 🎯 **Game Selection**: First player chooses the game, both players play together
- 🎨 **Beautiful UI**: Modern design with smooth animations
- 📱 **Responsive**: Works on mobile and desktop
- 🔄 **Rematch**: Play again or choose a different game
- ⚡ **Real-time**: Instant updates via WebSocket
- 🎲 **Automatic Matchmaking**: Pairs the first two players

## Setup Instructions

### 1. Install Dependencies

Navigate to the `tictactoe` directory and install the required packages:

```bash
cd tictactoe
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000` by default.

### 3. Play the Game

1. Open your browser and go to `http://localhost:3000`
2. Open the same URL in another browser (or incognito window) for the second player
3. When both players are connected, the first player will see a game selection screen
4. The first player chooses either Tic Tac Toe or Connect 4
5. Both players will then play the selected game (first player is X, second is O)
6. After a game ends, you can rematch or choose a different game!

## How It Works

- When the first player connects, they'll see a "Waiting for another player..." message
- When the second player connects, both players see a game selection screen
- The first player chooses which game to play (Tic Tac Toe or Connect 4)
- Both players then play the selected game together
- Players take turns making moves
- The game detects wins, draws, and handles disconnections
- After a game ends, players can:
  - Click "Play Again" to rematch with the same game
  - Click "Choose Different Game" to go back to game selection

## Project Structure

```
tictactoe/
├── server.js          # Express server with Socket.io
├── package.json       # Dependencies
├── README.md          # This file
└── public/
    ├── index.html     # Frontend HTML
    ├── style.css      # Styling
    └── client.js      # Client-side game logic
```

## Game Rules

### Tic Tac Toe
- Classic 3x3 grid game
- Get three in a row (horizontal, vertical, or diagonal) to win
- First player is X, second player is O

### Connect 4
- Drop pieces into a 6x7 grid
- Connect four pieces in a row (horizontal, vertical, or diagonal) to win
- Pieces fall to the lowest available space in the selected column
- First player is Red (X), second player is Yellow (O)

## Technologies Used

- **Node.js** - Server runtime
- **Express** - Web server framework
- **Socket.io** - Real-time bidirectional communication
- **HTML/CSS/JavaScript** - Frontend

Enjoy playing! 🎉

## Invite Notification Setup

The game includes an "Invite Player" button that sends email and/or SMS notifications when someone is waiting for an opponent.

### Email Setup (Gmail)

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Game Server" and generate
   - Copy the 16-character password

3. **Set Environment Variables**:
   ```bash
   GMAIL_USER=neilteje@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   GAME_URL=https://creamsodagames.vercel.app
   ```

### SMS Setup (Twilio - Optional)

1. **Sign up for Twilio** at https://www.twilio.com (free trial available)
2. **Get your credentials** from the Twilio Console
3. **Set Environment Variables**:
   ```bash
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   ```

### For Local Development

Create a `.env` file in the `tictactoe` directory:
```
GMAIL_USER=neilteje@gmail.com
GMAIL_APP_PASSWORD=your-app-password
GAME_URL=http://localhost:3000
```

### For Production (Vercel/Railway/etc.)

Add the environment variables in your hosting platform's dashboard:
- Vercel: Project Settings → Environment Variables
- Railway: Variables tab
- Render: Environment section

**Note:** The invite button will work even if email/SMS isn't configured - it just won't send notifications. The server will log warnings but won't crash.


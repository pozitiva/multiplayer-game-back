# Server Side README

# BarbieHeimer Multiplayer Online Game, using React.js for front-end, Node.js for Back-end and Socket.io for real-time communication

### Prerequisites

Before running this server, make sure you have the following installed:
Node.js

Install the required Node.js packages:
npm install

Configure the MongoDB connection

Start the server:
npm start

### Overview

This server is designed to facilitate a two-player online guessing game.

### Express

The server is built using the Express.js framework, which handles HTTP requests and responses.

### Socket.io

Socket.io is used to establish real-time communication between clients and the server.

### Game Logic

The game allows two players to join a match using a room code.
Each player has a dashboard with hidden objects (barbies and bombs) that they need to guess.
Players take turns guessing positions on the dashboard, and points are awarded based on their guesses.
The game continues until a set number of moves are exhausted, and a winner is determined.

### User Authentication

User registration and login are handled with JWT (JSON Web Tokens).
Registration (/register): Users can register with a first name, last name, email, and password.
Login (/login-user): Users can log in using their email and password and receive a JWT for authenticated requests.
Lobby (/Lobby): Users can access their profile information using a valid JWT.

### Socket Events

sendRoomCode: Used by clients to join a game room with a specific code.
updateDashboard: Used to update a player's game dashboard.
guessPosition: Used to make a guess on a position on the dashboard.
disconnect: Triggered when a user disconnects from the server.
gameStart: Initiates the game and provides essential match information to both players.
gameFull: Alerts the client that the game room is already full.
positionAlreadyPlayed: Informs the client that the selected position has already been guessed.
playerGuess: Sends the guess and game state updates to both players after each move.
gameOver: Announces the end of the game and the winner or a tie.
invalidGuess: Notifies the client that an invalid guess was made.
otherPlayerLeft: Informs the client when the opponent has disconnected from the game.
readyGame: Indicates that both players are ready to proceed with the game.

## Contributors

pozitiva
DunjaNesic

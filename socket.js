function sockets(server) {
  const socketio = require("socket.io");
  const io = socketio(server);

  const MAX_MOVES = 10;
  const BARBIE_POINTS = 10;
  const BOMB_POINTS = -5;

  var activeMatches = {};

  const handleGuess = (match, player, position, otherPlayer) => {
    if (!match || player.movesLeft <= 0 || match.turn != player.id) {
      return;
    }

    player.movesLeft--;

    if (player.playedPositions.includes(position)) {
      player.socket.emit("positionAlreadyPlayed");
      return;
    }

    player.playedPositions.push(position);

    var field = null;

    const isBomb = otherPlayer.bombs.some(
      (bombPos) => bombPos.row === position.row && bombPos.col === position.col
    );

    const isBarbie = otherPlayer.barbies.some(
      (barbiePos) =>
        barbiePos.row === position.row && barbiePos.col === position.col
    );

    if (isBomb) {
      player.points += BOMB_POINTS;
      field = "bomb";
    } else if (isBarbie) {
      player.points += BARBIE_POINTS;
      field = "barbie";
    }

    if (match.player1.movesLeft === 0 && match.player2.movesLeft === 0) {
      var winner;
      if (match.player1.points > match.player2.points) {
        winner = match.player1.id;
      } else if (match.player2.points > match.player1.points) {
        winner = match.player2.id;
      } else {
        winner = "tie";
      }

      match.player1.socket.emit("gameOver", {
        winner,
      });
      match.player2.socket.emit("gameOver", {
        winner,
      });
      delete activeMatches[match];
    } else {
      match.turn =
        match.turn == match.player1.id ? match.player2.id : match.player1.id;

      const playerOneGuess = {
        player: player.id,
        position,
        field,
        turn: match.turn,
        myPoints: player.points,
        opponentsPoints: otherPlayer.points,
        myMovesLeft: player.movesLeft,
        opponentsMovesLeft: otherPlayer.movesLeft,
      };

      player.socket.emit("playerGuess", playerOneGuess);

      const otherPlayerGuess = {
        player: player.id,
        position,
        field,
        turn: match.turn,
        myPoints: otherPlayer.points,
        opponentsPoints: player.points,
        myMovesLeft: otherPlayer.movesLeft,
        opponentsMovesLeft: player.movesLeft,
      };

      otherPlayer.socket.emit("playerGuess", otherPlayerGuess);
    }
  };

  const fillBombsAndBarbies = (player) => {
    if (!player || !player.dashboard) {
      console.log(`Player data or dashboard not found for ${player}`);
      return;
    }
    const playerDashboard = player.dashboard;

    for (let row = 0; row < playerDashboard.length; row++) {
      for (let col = 0; col < playerDashboard[row].length; col++) {
        const cellValue = playerDashboard[row][col];

        if (cellValue === "barbie") {
          player.barbies.push({ row, col });
        } else if (cellValue === "bomb") {
          player.bombs.push({ row, col });
        }
      }
    }
  };

  io.on("connection", (socket) => {
    socket.on("sendRoomCode", (data) => {
      const { code, email } = data;
      console.log(`User joined game with code: ${code}`);

      if (!activeMatches[code]) {
        activeMatches[code] = {
          player1: {
            socket,
            id: socket.id,
            dashboard: null,
            movesLeft: MAX_MOVES,
            points: 0,
            bombs: [],
            barbies: [],
            playedPositions: [],
            email: email,
          },
          turn: socket.id,
          player2: null,
        };
      } else if (activeMatches[code].player1.email !== email) {
        socket.emit("alreadyPlaying");
      } else if (!activeMatches[code].player2) {
        activeMatches[code].player2 = {
          socket,
          id: socket.id,
          dashboard: null,
          movesLeft: MAX_MOVES,
          points: 0,
          bombs: [],
          barbies: [],
          playedPositions: [],
          email: email,
        };

        if (!activeMatches[code].player1 || !activeMatches[code].player2) {
          return;
        }

        console.log(`A user connected on socket ${socket.id}`);
        const matchInfo = {
          code,
          player1: {
            id: activeMatches[code].player1.id,
          },
          player2: {
            id: activeMatches[code].player2.id,
          },
        };
        activeMatches[code].player2.socket.emit("gameStart", matchInfo);
        activeMatches[code].player1.socket.emit("gameStart", matchInfo);
      } else {
        socket.emit("gameFull");
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected " + socket.id);
      if (activeMatches == {}) {
        return;
      }

      Object.values(activeMatches).forEach((match) => {
        if (match.player1.id == socket.id) {
          match.player2.socket.emit("otherPlayerLeft");
          delete match;
        } else if (match.player2.id == socket.id) {
          match.player1.socket.emit("otherPlayerLeft");
          delete match;
        }
      });
    });

    socket.on("updateDashboard", (data) => {
      const { code, player, dashboard } = data;

      if (activeMatches[code]) {
        const match = activeMatches[code];

        if (match.player1.id == player) {
          match.player1.dashboard = dashboard;
          fillBombsAndBarbies(match.player1);
        } else if (match.player2.id == player) {
          match.player2.dashboard = dashboard;
          fillBombsAndBarbies(match.player2);
        }

        console.log(`Dashboard updated for ${player} in match ${code}`);

        const otherPlayer = player === "player1" ? "player2" : "player1";

        if (
          !activeMatches[code].player1.dashboard ||
          !activeMatches[code].player2.dashboard
        ) {
          return;
        }

        activeMatches[code].player2.socket.emit("readyGame", {
          turn: match.turn,
        });
        activeMatches[code].player1.socket.emit("readyGame", {
          turn: match.turn,
        });
      }
    });

    socket.on("guessPosition", (data) => {
      const { code, player, position } = data;
      const match = activeMatches[code];

      if (player == match.player1.id) {
        handleGuess(match, match.player1, position, match.player2);
      } else if (player == match.player2.id) {
        handleGuess(match, match.player2, position, match.player1);
      } else {
        socket.emit("invalidGuess");
      }
    });
  });
}

module.exports = sockets;

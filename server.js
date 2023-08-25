const express = require("express");
const app = express();
const mongoose = require("mongoose");
app.use(express.json());
const cors = require("cors");
app.use(cors({ origin: true, credentials: true }));
const bcrypt = require("bcryptjs");

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Listening on port ${port}...`)
);

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
  } else {
    match.turn =
      match.turn == match.player1.id ? match.player2.id : match.player1.id;

    const playerOneGuess = {
      position,
      field,
      turn: match.turn,
      myPoints: player.points,
      opponentsPoints: otherPlayer.points,
    };

    player.socket.emit("playerGuess", playerOneGuess);

    const otherPlayerGuess = {
      position,
      field,
      turn: match.turn,
      myPoints: otherPlayer.points,
      opponentsPoints: player.points,
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
  socket.on("sendRoomCode", (code) => {
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
        },
        turn: socket.id,
        player2: null,
      };
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

      // console.log(
      //   `p1 ${activeMatches[code].player1.socket.id} ${activeMatches[code].player1.id}\n
      //   p2 ${activeMatches[code].player2.socket.id} ${activeMatches[code].player2.id}`
      // );
      activeMatches[code].player2.socket.emit("gameStart", matchInfo);
      activeMatches[code].player1.socket.emit("gameStart", matchInfo);
    } else {
      socket.emit("gameFull");
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected " + socket.id);
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

const jwt = require("jsonwebtoken");

const JWT_SECRET =
  "cnsdbcfdsbfhs[]werp4358394ds[fsdjbvvsfdkjvdsbgkw=w]3pr2353879764253+_P>POopkdfe4";

mongoose.connect(
  "mongodb+srv://iva:iva@cluster0.muybin8.mongodb.net/?retryWrites=true&w=majority"
);
mongoose.connection.on("connected", () => console.log("Connected to db"));

require("./userDetails");
const User = mongoose.model("UserInfo");
app.post("/register", async (req, res) => {
  const { fname, lname, email, password } = req.body;

  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.send({ error: "User already exists" });
    }
    await User.create({
      fname,
      lname,
      email,
      password: encryptedPassword,
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});

app.post("/login-user", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.send({ error: "User not found" });
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ email: user.email }, JWT_SECRET);

    if (res.status(201)) {
      return res.json({ status: "ok", data: token });
    } else {
      return res.json({ erro: "error" });
    }
  }
  res.json({ status: "error", error: "Invalid Password" });
});

app.post("/Lobby", async (req, res) => {
  const { token } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    console.log(user);

    const useremail = user.email;
    User.findOne({ email: useremail })
      .then((data) => {
        res.send({ status: "ok", data: data });
      })
      .catch((error) => {
        res.send({ status: "error", data: error });
      });
  } catch (error) {}
});

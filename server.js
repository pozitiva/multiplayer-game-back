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

const http = require("http");
const socketio = require("socket.io");
const io = socketio(server);

const activeMatches = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendRoomCode", (code) => {
    console.log(`User joined game with code: ${code}`);

    if (!activeMatches[code]) {
      activeMatches[code] = {
        player1: {
          socket,
          id: socket.id,
          dashboard: Array(6).fill(Array(6).fill(null)),
          placedItems: [],
        },
        player2: null,
      };
    } else if (!activeMatches[code].player2) {
      activeMatches[code].player2 = {
        socket,
        id: socket.id,
        dashboard: Array(6).fill(Array(6).fill(null)),
        placedItems: [],
      };

      const matchInfo = {
        code,
        player1: {
          id: activeMatches[code].player1.id,
        },
        player2: {
          id: socket.id,
        },
      };

      const player1Socket = activeMatches[code].player1.socket;
      player1Socket.emit("gameStart", matchInfo);
      socket.emit("gameStart", matchInfo);
    } else {
      socket.emit("gameFull");
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("updateDashboard", (data) => {
    const matchCode = data.matchCode;
    const player =
      activeMatches[matchCode].player1.id === socket.id ? "player1" : "player2";

    activeMatches[matchCode][player].dashboard = data.dashboard;
    // const bombs = data.bombs || [];
    // const barbies = data.barbies || [];

    const otherPlayer = player === "player1" ? "player2" : "player1";
    const otherDashboard = activeMatches[matchCode][otherPlayer].dashboard;
    activeMatches[matchCode][otherPlayer].socket.emit("updateDashboard", {
      dashboards: otherDashboard,
      // bombs,
      // barbies,
    });
  });

  socket.on("placeItem", (data) => {
    const matchCode = data.matchCode;
    const player =
      activeMatches[matchCode].player1.id === socket.id ? "player1" : "player2";
    const item = data.item; // barbie ili bomb
    const position = data.position;

    activeMatches[matchCode][player].placedItems.push({ item, position });

    // dogadjaj koji ce obavestiti drugog igraca o potezu
    const otherPlayer = player === "player1" ? "player2" : "player1";
    activeMatches[matchCode][otherPlayer].socket.emit("opponentPlacedItem", {
      item,
      position,
    });
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

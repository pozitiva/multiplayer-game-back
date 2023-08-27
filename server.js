const express = require("express");
const app = express();
const cors = require("cors");
const rest = require("./rest");

require("./db")();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.use("/", rest);

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Listening on port ${port}...`)
);
require("./socket")(server);

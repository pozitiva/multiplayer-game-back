const mongoose = require("mongoose");

module.exports = function () {
  mongoose.connect(
    "mongodb+srv://iva:iva@cluster0.muybin8.mongodb.net/?retryWrites=true&w=majority"
  );
  mongoose.connection.on("connected", () => console.log("Connected to db"));
};

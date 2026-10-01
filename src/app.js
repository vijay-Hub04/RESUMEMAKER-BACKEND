const express = require("express");
const app = express();

const connectionDB = require("./config/connectionDB");
const getResume = require("./routes/getResume");

// app.get("/", (req, res) => {
//     res.send("Server is running");
// });


connectionDB()

app.use("/uploadResume",getResume)



module.exports = app;
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const firstRouter = require("./routes/first");
const userRouter = require("./routes/user");

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB using environment variable
mongoose.connect("mongodb+srv://shivamsharma11032009:Shivamking11@cluster0.gzrm1.mongodb.net/Talk", {
  dbName: "Talk",
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

app.use("/first", firstRouter);
app.use("/user", userRouter);

// Use PORT from environment or default to 3000
const PORT =  3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

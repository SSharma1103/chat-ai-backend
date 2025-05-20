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
mongoose.connect(process.env.MONGO_URI, {
  dbName: "Talk",
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// API routes
app.use("/first", firstRouter);
app.use("/user", userRouter);

// Use PORT from .env or fallback to 3000
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

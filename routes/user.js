const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, PreviousChat } = require("../schema/schema");
const { authenticateJwt } = require("../middleware/auth"); 
require("dotenv").config();

const router = express.Router();


router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: "Email or username already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      chats: [],
    });

    await newUser.save();

    
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      userId: newUser._id,
      username: newUser.username,
    });

  } catch (err) {
    console.error("User registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});


router.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: "Email/Username and password are required." });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      userId: user._id,
      username: user.username,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});


router.post("/create", authenticateJwt, async (req, res) => {
  const { title } = req.body; 
  const userId = req.user.userId; 

  if (!userId) {
    return res.status(400).json({ message: "Invalid token: userId missing" });
  }

  try {
    const newChat = await PreviousChat.create({
      user: userId,
      title: title || "Untitled Chat",
      messages: []
    });

    await User.findByIdAndUpdate(userId, {
      $push: { chats: newChat._id }
    });

    res.status(201).json({ chatId: newChat._id, message: "Chat created successfully" });

  } catch (err) {
    console.error("Chat creation error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

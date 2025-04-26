const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../schema/schema"); // adjust if models are separate
const { PreviousChat } =require("../schema/schema"); // adjust if models are separate
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

// POST /user/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: "Email or username already taken." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      chats: [],
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      userId: newUser._id,
    });

  } catch (err) {
    console.error("User registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

router.post("/create", async (req, res) => {
    const { userId, title } = req.body;
  
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
  
    try {
      // Create new chat
      const newChat = await PreviousChat.create({
        user: userId,
        title: title || "Untitled Chat",
        messages: []
      });
  
      // Link to user's chat array
      await User.findByIdAndUpdate(userId, {
        $push: { chats: newChat._id }
      });
  
      res.status(201).json({ chatId: newChat._id, message: "Chat created successfully" });
  
    } catch (err) {
      console.error("Chat creation error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  router.post("/login", async (req, res) => {
    const { emailOrUsername, password } = req.body;
  
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "Email/Username and password are required." });
    }
  
    try {
      // Find the user by email or username
      const user = await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
      });
  
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials." });
      }
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
      }
  
      // Create JWT
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      // Send token + user info
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

module.exports = router;

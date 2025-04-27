const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();
const { PreviousChat, User } = require("../schema/schema");
const { authenticateJwt } = require("../middleware/auth"); // 👈 Import your auth middleware
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the GoogleGenerativeAI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ✅ Protect this route with authenticateJwt
router.post("/send", authenticateJwt, async (req, res) => {
  const { chatId, userPrompt, title } = req.body;

  if (!chatId || !userPrompt || !title) {
    return res.status(400).json({ message: "chatId, userPrompt, and title are required" });
  }

  try {
    console.log("Received request from user:", req.user.username); // 👈 now you have access to the user info from token
    console.log("Prompt:", userPrompt);

    const chat = await PreviousChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const lastThreeMessages = chat.messages.slice(-3);

    if (chat.messages.length > 10) {
      chat.messages.shift();
      await chat.save();
    }

    const context = lastThreeMessages.map(msg => `${msg.role}: "${msg.content}"`).join("\n");

    const userMessage = {
      role: "user",
      content: userPrompt,
    };

    const styledPrompt = `
      Pretend you are "${title}". 
      Respond in their style, tone, and personality. Do not mention you are pretending. Make the experience believable and human-like.
      Keep it natural and not overly long.

      Here is the conversation so far:
      ${context}

      Now respond to this:
      "${userPrompt}"
    `;

    const geminiResponse = await model.generateContent(styledPrompt);
    const assistantReply = geminiResponse.response.text();

    if (!assistantReply) {
      return res.status(500).json({ message: "Assistant reply is missing from Gemini response." });
    }

    const assistantMessage = {
      role: "assistant",
      content: assistantReply,
    };

    const updatedChat = await PreviousChat.findByIdAndUpdate(
      chatId,
      {
        $push: {
          messages: { $each: [userMessage, assistantMessage] }
        }
      },
      { new: true }
    );

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.status(200).json({
      message: "Messages added successfully",
      chat: updatedChat,
    });

  } catch (error) {
    console.error("Error in /send:", error?.response?.data || error.message);

    return res.status(error?.response?.status || 500).json({
      message: "An error occurred while processing the prompt.",
      error: error?.response?.data || error.message,
    });
  }
});

module.exports = router;

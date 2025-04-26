const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();
const {PreviousChat} = require("../schema/schema");
const { User } = require("../schema/schema");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the GoogleGenerativeAI client with the API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post("/send", async (req, res) => {
  const { chatId, userPrompt, title } = req.body;  // Destructure title, chatId, and userPrompt from the request body

  if (!chatId || !userPrompt || !title) {
    return res.status(400).json({ message: "chatId, userPrompt, and title are required" });
  }

  try {
    console.log("Received request to send prompt:", userPrompt);

    // Get the chat to check the number of messages
    const chat = await PreviousChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Get the last 3 messages from the chat to build context
    const lastThreeMessages = chat.messages.slice(-3);  // Get the last 3 messages

    // Check if the number of messages exceeds 10 and remove the oldest if necessary
    if (chat.messages.length > 10) {
      chat.messages.shift(); // Remove the oldest message (first element of the array)
      await chat.save(); // Save the updated chat
    }

    // Format the last 3 messages as part of the context
    const context = lastThreeMessages.map(msg => `${msg.role}: "${msg.content}"`).join("\n");

    // User message to be saved
    const userMessage = {
      role: "user",
      content: userPrompt,
    };

    // Modify the prompt to include the chat title and the last 3 messages for context
    const styledPrompt = `
      Pretend you "${title}". 
      Respond in his style, tone, and personality. Do not mention you are pretending. Make the experience as human-like as possible.
      
      Here is the conversation so far:
      ${context}

      Now respond to this:
      "${userPrompt}"
    `;

    // Generate response using the model
    const geminiResponse = await model.generateContent(styledPrompt);
    const assistantReply = geminiResponse.response.text();

    if (!assistantReply) {
      return res.status(500).json({ message: "Assistant reply is missing from Gemini response." });
    }

    const assistantMessage = {
      role: "assistant",
      content: assistantReply,
    };

    // Push both user and assistant messages to the chat
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
    console.error("Error in /chat/send:", error?.response?.data || error.message);

    return res.status(error?.response?.status || 500).json({
      message: "An error occurred while processing the prompt.",
      error: error?.response?.data || error.message,
    });
  }
});


module.exports = router;

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password
  chats: [{ type: mongoose.Schema.Types.ObjectId, ref: "PreviousChat" }],
}, { timestamps: true });


const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  });

const previousChatSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String },
    messages: [messageSchema],
  }, { timestamps: true });
  



const User = mongoose.model("User", UserSchema);

const PreviousChat = mongoose.model("PreviousChat", previousChatSchema);
module.exports = { User, PreviousChat };


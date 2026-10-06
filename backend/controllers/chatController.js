const Message = require("../models/Message");

const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate("sender", "name email")
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);

    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
};

module.exports = {
  getMessages,
};
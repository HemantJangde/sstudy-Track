const express = require("express");

const { getMessages } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/messages", protect, getMessages);

module.exports = router;
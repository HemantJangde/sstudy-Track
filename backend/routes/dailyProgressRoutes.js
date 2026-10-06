const express = require("express");

const {
  getOrCreateProgress,
  getDailyProgress,
  getTodayProgress,
  updateProgress,
} = require("../controllers/dailyProgressController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/today", protect, getTodayProgress);

router.post("/", protect, getOrCreateProgress);

router.get("/", protect, getDailyProgress);

router.put("/:id", protect, updateProgress);

module.exports = router;
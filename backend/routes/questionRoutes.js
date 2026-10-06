const express = require("express");

const {
  createQuestion,
  getQuestions,
  getQuestionsByTopic,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  completeQuestion,
} = require("../controllers/questionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createQuestion);
router.get("/", protect, getQuestions);
router.get("/topic/:topicId", protect, getQuestionsByTopic);
router.get("/:id", protect, getQuestionById);
router.put("/:id", protect, updateQuestion);
router.delete("/:id", protect, deleteQuestion);

router.post("/:id/complete", protect, completeQuestion);

module.exports = router;
const Question = require("../models/Question");
const Topic = require("../models/Topic");
const { getTodayDate } = require("../utils/date");
const DailyProgress = require("../models/DailyProgress");


const completeQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const today = getTodayDate();

    // Already completed today
    if (question.completedDates.includes(today)) {
      return res.status(400).json({
        message: "Question already completed today",
      });
    }

    // Find today's progress for this topic
    let progress = await DailyProgress.findOne({
      user: req.user.userId,
      topic: question.topic,
      date: today,
    });

    // Create progress if it doesn't exist
    if (!progress) {
      const topic = await Topic.findOne({
        _id: question.topic,
        user: req.user.userId,
        isActive: true,
      });

      if (!topic) {
        return res.status(404).json({
          message: "Topic not found",
        });
      }

      progress = await DailyProgress.create({
        user: req.user.userId,
        topic: question.topic,
        date: today,
        target: topic.dailyTarget,
        completed: 0,
        remaining: topic.dailyTarget,
      });
    }

    // Don't allow completion beyond target
    if (progress.completed >= progress.target) {
      return res.status(400).json({
        message: "Daily target already completed",
      });
    }

    // Mark question completed for today
    question.completedDates.push(today);
    await question.save();

    // Update daily progress
    progress.completed += 1;
    progress.remaining = Math.max(
      progress.target - progress.completed,
      0
    );

    await progress.save();

    res.status(200).json({
      message: "Question completed successfully",
      progress,
    });
  } catch (error) {
    console.error("Complete question error:", error);

    res.status(500).json({
      message: "Failed to complete question",
    });
  }
};
// Create question
const createQuestion = async (req, res) => {
  try {
    const { topicId, question, answer } = req.body;

    if (!topicId || !question || !answer) {
      return res.status(400).json({
        message: "topicId, question and answer are required",
      });
    }

    // Make sure topic belongs to logged-in user
    const topic = await Topic.findOne({
      _id: topicId,
      user: req.user.userId,
      isActive: true,
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const newQuestion = await Question.create({
      user: req.user.userId,
      topic: topicId,
      question: question.trim(),
      answer: answer.trim(),
    });

    res.status(201).json({
      message: "Question created successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error("Create question error:", error);

    res.status(500).json({
      message: "Failed to create question",
    });
  }
};


// Get all questions
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({
      user: req.user.userId,
    })
      .populate("topic", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      questions,
    });
  } catch (error) {
    console.error("Get questions error:", error);

    res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
};


// Get questions by topic
const getQuestionsByTopic = async (req, res) => {
  try {
    const questions = await Question.find({
      user: req.user.userId,
      topic: req.params.topicId,
    })
      .populate("topic", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      questions,
    });
  } catch (error) {
    console.error("Get questions by topic error:", error);

    res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
};


// Get single question
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("topic", "name");

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    res.status(200).json({
      question,
    });
  } catch (error) {
    console.error("Get question error:", error);

    res.status(500).json({
      message: "Failed to fetch question",
    });
  }
};


// Update question
const updateQuestion = async (req, res) => {
  try {
    const { question, answer, topicId } = req.body;

    const existingQuestion = await Question.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!existingQuestion) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    // If topic is being changed, verify new topic belongs to user
    if (topicId) {
      const topic = await Topic.findOne({
        _id: topicId,
        user: req.user.userId,
        isActive: true,
      });

      if (!topic) {
        return res.status(404).json({
          message: "Topic not found",
        });
      }

      existingQuestion.topic = topicId;
    }

    if (question !== undefined) {
      existingQuestion.question = question.trim();
    }

    if (answer !== undefined) {
      existingQuestion.answer = answer.trim();
    }

    await existingQuestion.save();

    res.status(200).json({
      message: "Question updated successfully",
      question: existingQuestion,
    });
  } catch (error) {
    console.error("Update question error:", error);

    res.status(500).json({
      message: "Failed to update question",
    });
  }
};


// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    await question.deleteOne();

    res.status(200).json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);

    res.status(500).json({
      message: "Failed to delete question",
    });
  }
};


module.exports = {
  createQuestion,
  getQuestions,
  getQuestionsByTopic,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  completeQuestion,
};
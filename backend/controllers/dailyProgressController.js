const DailyProgress = require("../models/DailyProgress");
const Topic = require("../models/Topic");
const { getTodayDate } = require("../utils/date");

// Get or create progress for a topic/date
const getOrCreateProgress = async (req, res) => {
  try {
    const { topicId, date } = req.body;

    if (!topicId || !date) {
      return res.status(400).json({
        message: "topicId and date are required",
      });
    }

    const userId = req.user.userId;

    const topic = await Topic.findOne({
      _id: topicId,
      user: userId,
      isActive: true,
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    let progress = await DailyProgress.findOne({
      user: userId,
      topic: topicId,
      date,
    });

    if (!progress) {
      progress = await DailyProgress.create({
        user: userId,
        topic: topicId,
        date,
        target: topic.dailyTarget,
        completed: 0,
        remaining: topic.dailyTarget,
      });
    }

    res.status(200).json({
      progress,
    });
  } catch (error) {
    console.error("Get/create progress error:", error);

    res.status(500).json({
      message: "Failed to get daily progress",
    });
  }
};

// Get progress for selected date
const getDailyProgress = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "date is required",
      });
    }

    const userId = req.user.userId;

    const topics = await Topic.find({
      user: userId,
      isActive: true,
    }).sort({ createdAt: 1 });

    const progressList = [];

    for (const topic of topics) {
      let progress = await DailyProgress.findOne({
        user: userId,
        topic: topic._id,
        date,
      });

      if (!progress) {
        progress = await DailyProgress.create({
          user: userId,
          topic: topic._id,
          date,
          target: topic.dailyTarget,
          completed: 0,
          remaining: topic.dailyTarget,
        });
      }

      progressList.push({
        topic: {
          _id: topic._id,
          name: topic.name,
          dailyTarget: topic.dailyTarget,
        },
        progress,
      });
    }

    res.status(200).json({
      date,
      progress: progressList,
    });
  } catch (error) {
    console.error("Get daily progress error:", error);

    res.status(500).json({
      message: "Failed to fetch daily progress",
    });
  }
};

// Get today's progress
const getTodayProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = getTodayDate();

    const topics = await Topic.find({
      user: userId,
      isActive: true,
    }).sort({ createdAt: 1 });

    const progressList = [];

    for (const topic of topics) {
      let progress = await DailyProgress.findOne({
        user: userId,
        topic: topic._id,
        date: today,
      });

      if (!progress) {
        progress = await DailyProgress.create({
          user: userId,
          topic: topic._id,
          date: today,
          target: topic.dailyTarget,
          completed: 0,
          remaining: topic.dailyTarget,
        });
      }

      progressList.push({
        topic: {
          _id: topic._id,
          name: topic.name,
          dailyTarget: topic.dailyTarget,
        },
        progress,
      });
    }

    const totalTarget = progressList.reduce(
      (total, item) => total + item.progress.target,
      0
    );

    const totalCompleted = progressList.reduce(
      (total, item) => total + item.progress.completed,
      0
    );

    const totalRemaining = totalTarget - totalCompleted;

    res.status(200).json({
      date: today,
      summary: {
        totalTarget,
        totalCompleted,
        totalRemaining,
      },
      progress: progressList,
    });
  } catch (error) {
    console.error("Get today's progress error:", error);

    res.status(500).json({
      message: "Failed to fetch today's progress",
    });
  }
};

// Update progress
const updateProgress = async (req, res) => {
  try {
    const { completed } = req.body;

    if (completed === undefined) {
      return res.status(400).json({
        message: "completed is required",
      });
    }

    if (completed < 0) {
      return res.status(400).json({
        message: "completed cannot be negative",
      });
    }

    const progress = await DailyProgress.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!progress) {
      return res.status(404).json({
        message: "Daily progress not found",
      });
    }

    if (completed > progress.target) {
      return res.status(400).json({
        message: `Completed Q&A cannot exceed ${progress.target}`,
      });
    }

    progress.completed = completed;
    progress.remaining = progress.target - completed;

    await progress.save();

    res.status(200).json({
      message: "Daily progress updated successfully",
      progress,
    });
  } catch (error) {
    console.error("Update progress error:", error);

    res.status(500).json({
      message: "Failed to update daily progress",
    });
  }
};

module.exports = {
  getOrCreateProgress,
  getDailyProgress,
  getTodayProgress,
  updateProgress,
};
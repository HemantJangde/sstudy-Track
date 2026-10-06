const Topic = require("../models/Topic");

// Create topic
const createTopic = async (req, res) => {
  try {
    const { name, dailyTarget } = req.body;

    if (!name || !dailyTarget) {
      return res.status(400).json({
        message: "Name and dailyTarget are required",
      });
    }

    const topic = await Topic.create({
      user: req.user.userId,
      name,
      dailyTarget,
    });

    res.status(201).json({
      message: "Topic created successfully",
      topic,
    });
  } catch (error) {
    console.error("Create topic error:", error);

    res.status(500).json({
      message: "Failed to create topic",
    });
  }
};

// Get all topics
const getTopics = async (req, res) => {
  try {
    const topics = await Topic.find({
      user: req.user.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      topics,
    });
  } catch (error) {
    console.error("Get topics error:", error);

    res.status(500).json({
      message: "Failed to fetch topics",
    });
  }
};

// Get single topic
const getTopicById = async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.id,
      user: req.user.userId,
      isActive: true,
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    res.status(200).json({
      topic,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch topic",
    });
  }
};

// Update topic
const updateTopic = async (req, res) => {
  try {
    const { name, dailyTarget } = req.body;

    const topic = await Topic.findOne({
      _id: req.params.id,
      user: req.user.userId,
      isActive: true,
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    if (name !== undefined) {
      topic.name = name;
    }

    if (dailyTarget !== undefined) {
      topic.dailyTarget = dailyTarget;
    }

    await topic.save();

    res.status(200).json({
      message: "Topic updated successfully",
      topic,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update topic",
    });
  }
};

// Delete topic
const deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.id,
      user: req.user.userId,
      isActive: true,
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    topic.isActive = false;

    await topic.save();

    res.status(200).json({
      message: "Topic deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete topic",
    });
  }
};

module.exports = {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
};
const mongoose = require("mongoose");

const dailyProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    target: {
      type: Number,
      required: true,
      min: 1,
    },

    completed: {
      type: Number,
      default: 0,
      min: 0,
    },

    remaining: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

dailyProgressSchema.index(
  {
    user: 1,
    topic: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "DailyProgress",
  dailyProgressSchema
);
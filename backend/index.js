const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const topicRoutes = require("./routes/topicRoutes");
const dailyProgressRoutes = require("./routes/dailyProgressRoutes");
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
dotenv.config();

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "StudyTrack API is running 🚀",
  });
});

app.use("/api/topics", topicRoutes);
app.use("/api/daily-progress", dailyProgressRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
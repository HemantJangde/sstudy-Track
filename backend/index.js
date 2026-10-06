const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const topicRoutes = require("./routes/topicRoutes");
const dailyProgressRoutes = require("./routes/dailyProgressRoutes");
const questionRoutes = require("./routes/questionRoutes");
const chatRoutes = require("./routes/chatRoutes");

const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();

const app = express();
const server = http.createServer(app);

connectDB();

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "StudyTrack API is running 🚀",
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/daily-progress", dailyProgressRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/chat", chatRoutes);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

/*
|--------------------------------------------------------------------------
| Socket Authentication
|--------------------------------------------------------------------------
*/

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = decoded.id || decoded.userId;

    if (!socket.userId) {
      return next(new Error("Invalid token"));
    }

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.message
    );

    next(new Error("Invalid token"));
  }
});

/*
|--------------------------------------------------------------------------
| Socket Connection
|--------------------------------------------------------------------------
*/

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  try {
    const user = await User.findById(socket.userId).select(
      "name email"
    );

    socket.user = user;

    socket.broadcast.emit("user-joined", {
      name: user?.name || "User",
    });
  } catch (error) {
    console.error("User loading error:", error);
  }

  /*
  |--------------------------------------------------------------------------
  | Send Message
  |--------------------------------------------------------------------------
  */

  socket.on("send-message", async (data) => {
    try {
      const text = data?.text?.trim();

      if (!text) {
        return;
      }

      if (text.length > 1000) {
        return;
      }

      const message = await Message.create({
        sender: socket.userId,
        text,
      });

      const populatedMessage = await Message.findById(
        message._id
      ).populate("sender", "name email");

      io.emit("receive-message", {
        id: populatedMessage._id,
        senderId: populatedMessage.sender._id,
        senderName: populatedMessage.sender.name,
        text: populatedMessage.text,
        createdAt: populatedMessage.createdAt,
      });
    } catch (error) {
      console.error("Send message error:", error);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Disconnect
  |--------------------------------------------------------------------------
  */

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (socket.user) {
      socket.broadcast.emit("user-left", {
        name: socket.user.name || "User",
      });
    }
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});
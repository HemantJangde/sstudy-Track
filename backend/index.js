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

/*
|--------------------------------------------------------------------------
| App
|--------------------------------------------------------------------------
*/

const app = express();

const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

connectDB();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudyTrack API is running 🚀",
    socket: "enabled",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/topics", topicRoutes);

app.use(
  "/api/daily-progress",
  dailyProgressRoutes
);

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

  transports: ["websocket", "polling"],

  pingTimeout: 60000,

  pingInterval: 25000,
});

/*
|--------------------------------------------------------------------------
| Socket Authentication Middleware
|--------------------------------------------------------------------------
*/

io.use((socket, next) => {
  console.log("=================================");
  console.log("🔐 SOCKET AUTHENTICATION");
  console.log("🆔 Socket ID:", socket.id);
  console.log("=================================");

  try {
    const token = socket.handshake.auth?.token;

    console.log(
      "🔑 Token received:",
      !!token
    );

    if (!token) {
      console.error(
        "❌ Socket authentication failed: token missing"
      );

      return next(
        new Error("Authentication required")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log(
      "✅ JWT verified"
    );

    console.log(
      "👤 Decoded token:",
      decoded
    );

    socket.userId =
      decoded.id ||
      decoded.userId ||
      decoded._id;

    if (!socket.userId) {
      console.error(
        "❌ User ID missing from token"
      );

      return next(
        new Error("Invalid token")
      );
    }

    console.log(
      "👤 Socket User ID:",
      socket.userId
    );

    next();
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "❌ SOCKET AUTH ERROR"
    );

    console.error(
      "📌 Error:",
      error.message
    );

    console.error(
      "================================="
    );

    next(
      new Error("Invalid token")
    );
  }
});

/*
|--------------------------------------------------------------------------
| Socket Connection
|--------------------------------------------------------------------------
*/

io.on("connection", async (socket) => {
  console.log("");
  console.log("=================================");
  console.log("🟢 NEW SOCKET CONNECTION");
  console.log("=================================");

  console.log(
    "🆔 Socket ID:",
    socket.id
  );

  console.log(
    "👤 User ID:",
    socket.userId
  );

  console.log(
    "🌐 Transport:",
    socket.conn.transport.name
  );

  console.log(
    "=================================");

  /*
  |--------------------------------------------------------------------------
  | Load User
  |--------------------------------------------------------------------------
  */

  try {
    console.log(
      "👤 Loading user from database..."
    );

    const user = await User.findById(
      socket.userId
    ).select("name email");

    if (!user) {
      console.error(
        "❌ User not found:",
        socket.userId
      );

      socket.disconnect(true);

      return;
    }

    socket.user = user;

    console.log(
      "✅ User loaded:"
    );

    console.log({
      id: user._id,
      name: user.name,
      email: user.email,
    });

    /*
    |--------------------------------------------------------------------------
    | Notify Other Users
    |--------------------------------------------------------------------------
    */

    socket.broadcast.emit(
      "user-joined",
      {
        name: user.name || "User",
      }
    );

    console.log(
      "📢 user-joined event emitted"
    );
  } catch (error) {
    console.error(
      "❌ USER LOADING ERROR"
    );

    console.error(
      error
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Send Message
  |--------------------------------------------------------------------------
  */

  socket.on(
    "send-message",
    async (data, callback) => {
      console.log("");
      console.log(
        "================================="
      );

      console.log(
        "📥 BACKEND RECEIVED SEND-MESSAGE"
      );

      console.log(
        "================================="
      );

      console.log(
        "🆔 Socket ID:",
        socket.id
      );

      console.log(
        "👤 User ID:",
        socket.userId
      );

      console.log(
        "👤 User:",
        socket.user
          ? {
              id: socket.user._id,
              name: socket.user.name,
              email: socket.user.email,
            }
          : null
      );

      console.log(
        "📦 Data:",
        data
      );

      console.log(
        "================================="
      );

      try {
        /*
        |--------------------------------------------------------------------------
        | Validate Data
        |--------------------------------------------------------------------------
        */

        const text =
          data?.text?.trim();

        console.log(
          "📝 Parsed text:",
          text
        );

        if (!text) {
          console.log(
            "⚠️ Empty message"
          );

          if (callback) {
            callback({
              success: false,
              message:
                "Message cannot be empty",
            });
          }

          return;
        }

        if (text.length > 1000) {
          console.log(
            "⚠️ Message too long"
          );

          if (callback) {
            callback({
              success: false,
              message:
                "Message cannot exceed 1000 characters",
            });
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Save Message
        |--------------------------------------------------------------------------
        */

        console.log(
          "💾 Creating message in MongoDB..."
        );

        const message =
          await Message.create({
            sender: socket.userId,
            text,
          });

        console.log(
          "✅ Message saved"
        );

        console.log({
          id: message._id,
          sender: message.sender,
          text: message.text,
          createdAt:
            message.createdAt,
        });

        /*
        |--------------------------------------------------------------------------
        | Populate Sender
        |--------------------------------------------------------------------------
        */

        console.log(
          "👤 Populating sender..."
        );

        const populatedMessage =
          await Message.findById(
            message._id
          ).populate(
            "sender",
            "name email"
          );

        if (!populatedMessage) {
          console.error(
            "❌ Message could not be populated"
          );

          if (callback) {
            callback({
              success: false,
              message:
                "Message processing failed",
            });
          }

          return;
        }

        console.log(
          "✅ Message populated"
        );

        console.log({
          id: populatedMessage._id,
          sender:
            populatedMessage.sender,
          text: populatedMessage.text,
          createdAt:
            populatedMessage.createdAt,
        });

        /*
        |--------------------------------------------------------------------------
        | Prepare Message
        |--------------------------------------------------------------------------
        */

        const messagePayload = {
          id: populatedMessage._id,
          senderId:
            populatedMessage.sender._id,
          senderName:
            populatedMessage.sender.name,
          text:
            populatedMessage.text,
          createdAt:
            populatedMessage.createdAt,
        };

        console.log(
          "📦 Final message payload:"
        );

        console.log(
          messagePayload
        );

        /*
        |--------------------------------------------------------------------------
        | Broadcast
        |--------------------------------------------------------------------------
        */

        console.log(
          "📡 BROADCASTING MESSAGE"
        );

        console.log(
          "👥 Connected sockets:",
          io.sockets.sockets.size
        );

        io.emit(
          "receive-message",
          messagePayload
        );

        console.log(
          "✅ BROADCAST COMPLETE"
        );

        /*
        |--------------------------------------------------------------------------
        | Callback
        |--------------------------------------------------------------------------
        */

        if (callback) {
          callback({
            success: true,
            message: messagePayload,
          });

          console.log(
            "✅ Send-message callback sent"
          );
        }

        console.log(
          "================================="
        );

        console.log(
          "✅ SEND MESSAGE FINISHED"
        );

        console.log(
          "================================="
        );

        console.log("");
      } catch (error) {
        console.error("");
        console.error(
          "================================="
        );

        console.error(
          "❌ SEND MESSAGE ERROR"
        );

        console.error(
          "================================="
        );

        console.error(
          "Message:",
          error.message
        );

        console.error(
          "Name:",
          error.name
        );

        console.error(
          "Stack:",
          error.stack
        );

        console.error(
          "================================="
        );

        if (callback) {
          callback({
            success: false,
            message:
              "Failed to send message",
          });
        }
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Disconnect
  |--------------------------------------------------------------------------
  */

  socket.on(
    "disconnect",
    (reason) => {
      console.log("");
      console.log(
        "================================="
      );

      console.log(
        "🔴 SOCKET DISCONNECTED"
      );

      console.log(
        "================================="
      );

      console.log(
        "🆔 Socket ID:",
        socket.id
      );

      console.log(
        "👤 User ID:",
        socket.userId
      );

      console.log(
        "📌 Reason:",
        reason
      );

      console.log(
        "================================="
      );

      if (socket.user) {
        socket.broadcast.emit(
          "user-left",
          {
            name:
              socket.user.name ||
              "User",
          }
        );

        console.log(
          "📢 user-left event emitted"
        );
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Socket Error
  |--------------------------------------------------------------------------
  */

  socket.on(
    "error",
    (error) => {
      console.error(
        "❌ SOCKET ERROR:",
        error
      );
    }
  );
});

/*
|--------------------------------------------------------------------------
| Socket.IO Error
|--------------------------------------------------------------------------
*/

io.engine.on(
  "connection_error",
  (error) => {
    console.error("");
    console.error(
      "================================="
    );

    console.error(
      "❌ SOCKET.IO ENGINE ERROR"
    );

    console.error(
      "================================="
    );

    console.error(
      "Code:",
      error.code
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Context:",
      error.context
    );

    console.error(
      "================================="
    );
  }
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "❌ GLOBAL SERVER ERROR:",
      error
    );

    res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "🚀 STUDYTRACK BACKEND STARTED"
    );

    console.log(
      "================================="
    );

    console.log(
      `🌐 Port: ${PORT}`
    );

    console.log(
      `🌍 Environment: ${
        process.env.NODE_ENV ||
        "development"
      }`
    );

    console.log(
      "🔌 Socket.IO: ENABLED"
    );

    console.log(
      "💾 MongoDB: CONNECTING..."
    );

    console.log(
      "================================="
    );

    console.log("");
  }
);
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const User = require("./models/User");
const Group = require("./models/Group");
const Message = require("./models/Message");
const { personalRoom } = require("./utils/notify");

// Routes
const authRoutes = require("./routes/authRoutes");
const groupRoutes = require("./routes/groupRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const billRoutes = require("./routes/billRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
  },
});

// Make io accessible inside route controllers via req.app.get("io")
app.set("io", io);

// Middleware
app.use(cors({ origin: clientUrl }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SplitEase Stay API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── Socket.io: auth handshake ────────────────────────────────────────────────
// The client connects with `io(url, { auth: { token } })` (the same JWT used
// for REST calls). Sockets that don't present a valid token are rejected
// before "connection" ever fires — no anonymous or unauthenticated sockets.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Not authorized, no token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("Not authorized, user not found"));
    }

    socket.user = user; // { _id, name, email, upiId, ... }
    next();
  } catch (err) {
    next(new Error("Not authorized, invalid token"));
  }
});

// ─── Socket.io: chat events ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id} (user ${socket.user._id})`);

  // Every authenticated socket auto-joins its own personal room, used for
  // pushing notifications (settlement created/confirmed/rejected, etc.) —
  // unlike group chat rooms, no explicit client "join" call is needed here,
  // since a user's own notifications aren't optional/scoped the way a
  // specific group's chat room is.
  socket.join(personalRoom(socket.user._id));

  // joinGroup / leaveGroup take a plain groupId string, same wire format as
  // before this phase — but now membership is actually verified server-side
  // before the socket is allowed into the room. Callback-style ack lets the
  // client know if the join was rejected (e.g. not a member).
  socket.on("joinGroup", async (groupId, callback) => {
    try {
      const group = await Group.findById(groupId);
      const isMember =
        group &&
        group.members.some((m) => m.toString() === socket.user._id.toString());

      if (!isMember) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Not a member of this group" });
        }
        return;
      }

      socket.join(groupId);
      if (typeof callback === "function") callback({ ok: true });
    } catch (err) {
      if (typeof callback === "function") {
        callback({ ok: false, message: "Couldn't join group" });
      }
    }
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(groupId);
  });

  // sendMessage: { groupId, text } — persists to Message, then broadcasts
  // the saved (populated) doc to everyone in the group's room, including
  // the sender (so the sender's own UI renders from the same server-confirmed
  // source of truth rather than an optimistic local echo).
  socket.on("sendMessage", async ({ groupId, text }, callback) => {
    try {
      if (!groupId || typeof text !== "string" || !text.trim()) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Message text is required" });
        }
        return;
      }

      const trimmed = text.trim().slice(0, 2000); // generous hard cap, matches no schema limit but keeps payloads sane

      const group = await Group.findById(groupId);
      const isMember =
        group &&
        group.members.some((m) => m.toString() === socket.user._id.toString());

      if (!isMember) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Not a member of this group" });
        }
        return;
      }

      const message = await Message.create({
        groupId,
        sender: socket.user._id,
        senderName: socket.user.name,
        text: trimmed,
        messageType: "user",
      });

      const populated = await Message.findById(message._id).populate(
        "sender",
        "name email upiId"
      );

      io.to(groupId).emit("newMessage", populated);

      if (typeof callback === "function") callback({ ok: true, message: populated });
    } catch (err) {
      if (typeof callback === "function") {
        callback({ ok: false, message: "Couldn't send message" });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// 404 + error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
};

startServer();

module.exports = { app, server, io };

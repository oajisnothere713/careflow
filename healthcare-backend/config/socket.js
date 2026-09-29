const { Server } = require("socket.io");
const User = require('../models/user/User');
const ChatMessage = require('../models/chat/ChatMessage');
const config = require("./env");

const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Make io instance available to Express routes
  if (app) app.set("io", io);

  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          socket.user = user;
          return next();
        }
      }

      // Default demo user context for socket
      socket.user = {
        _id: "demo-super-admin",
        role: "super_admin",
        name: "Demo Admin",
      };
      next();
    } catch (err) {
      next();
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    socket.join(`user_${user._id}`);

    socket.on("chat:send", async (data) => {
      try {
        const { toUserId, message, replyTo, session_id } = data;
        if (!toUserId || !message) return;

        // Save message
        const chatMsg = new ChatMessage({
          session_id: session_id || "000000000000000000000000",
          sender_role: user.role,
          sender_id: user._id,
          message,
          message_type: "text"
        });
        await chatMsg.save();

        // Emit to recipient
        io.to(`user_${toUserId}`).emit("chat:receive", {
          _id: chatMsg._id,
          from: user._id,
          message,
          replyTo: chatMsg.replyTo,
          timestamp: chatMsg.createdAt,
        });
        // Echo to sender
        socket.emit("chat:sent", {
          _id: chatMsg._id,
          to: toUserId,
          message,
          replyTo: chatMsg.replyTo,
          timestamp: chatMsg.createdAt,
        });
      } catch (err) {
        socket.emit("chat:error", {
          message: "Failed to send message",
          error: err.message,
        });
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

module.exports = initSocket;

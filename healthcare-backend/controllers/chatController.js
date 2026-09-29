const ChatSession = require('../models/chat/ChatSession');
const ChatMessage = require('../models/chat/ChatMessage');
const User = require('../models/user/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// Role-based permission
async function canChat(user, otherUser) {
  if (!user || !otherUser) return false;

  // Patient <-> Doctor
  if (
    (user.role === "patient" && otherUser.role === "doctor") ||
    (user.role === "doctor" && otherUser.role === "patient")
  ) return true;

  // Doctor <-> Doctor
  if (user.role === "doctor" && otherUser.role === "doctor") return true;

  // Clinic Admin <-> Super Admin
  if (
    (user.role === "clinic_admin" && otherUser.role === "super_admin") ||
    (user.role === "super_admin" && otherUser.role === "clinic_admin")
  ) return true;

  // Clinic Admin <-> Clinic Admin (same clinic)
  if (
    user.role === "clinic_admin" &&
    otherUser.role === "clinic_admin" &&
    String(user.clinic_id) === String(otherUser.clinic_id)
  ) return true;

  return false;
}

exports.createOrGetSession = asyncHandler(async (req, res, next) => {
  const { otherUserId, clinicId } = req.body;
  const currentUserId = req.user.userId;

  const otherUser = await User.findById(otherUserId);
  if (!otherUser) return next(new AppError("User not found", 404));

  if (!(await canChat(req.user, otherUser))) {
    return next(new AppError("Chat not allowed", 403));
  }

  // Always use both user IDs in participants array
  let session = await ChatSession.findOne({
    participants: { $all: [currentUserId, otherUserId] },
    ...(clinicId && { clinic_id: clinicId })
  });

  if (!session) {
    session = new ChatSession({
      participants: [currentUserId, otherUserId],
      clinic_id: clinicId || req.user.clinicId || otherUser.clinic_id
    });
    await session.save();
  }

  res.json({ session });
});

exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { message } = req.body;

  const session = await ChatSession.findById(req.params.sessionId);
  if (!session) return next(new AppError("Session not found", 404));

  if (!session.participants.includes(req.user.userId)) {
    return next(new AppError("Not part of this chat", 403));
  }

  const msg = new ChatMessage({
    session_id: session._id,
    sender_role: req.user.role,
    sender_id: req.user.userId,
    message
  });

  await msg.save();
  res.json({ message: msg });
});

exports.getMessages = asyncHandler(async (req, res, next) => {
  const session = await ChatSession.findById(req.params.sessionId);
  if (!session) return next(new AppError("Session not found", 404));

  if (!session.participants.includes(req.user.userId)) {
    return next(new AppError("Not part of this chat", 403));
  }

  const messages = await ChatMessage.find({ session_id: session._id }).sort({ createdAt: 1 });
  res.json({ messages });
});

exports.listSessions = asyncHandler(async (req, res, next) => {
  const { userId, clinicId } = req.query;
  const query = {
    participants: req.user.userId
  };
  if (userId) query.participants = { $all: [req.user.userId, userId] };
  if (clinicId) query.clinic_id = clinicId;

  const sessions = await ChatSession.find(query).sort({ updatedAt: -1 });

  res.json({ sessions });
});

require("dotenv").config();
const config = require("./config/env");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const http = require("http");

// New imports
const connectDB = require("./config/database");
const initSocket = require("./config/socket");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors({ origin: true, credentials: true }));
app.use(express.json());

// Basic request logging for debugging frontend requests
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Healthcare Portal API",
    documentation: `http://localhost:${PORT}/api-docs`,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "Backend is running",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Routes
const clinicRoutes = require("./routes/clinic");
const doctorRoutes = require("./routes/doctor");
const patientRoutes = require("./routes/patient");
const appointmentRoutes = require("./routes/appointment");
const consultationRoutes = require("./routes/consultation");
const billingRoutes = require("./routes/billing");
const chatRoutes = require("./routes/chat");
const followupRoutes = require("./routes/followup");
const aiRoutes = require("./routes/ai");
const confirmRoutes = require("./routes/confirm");

app.use("/api/auth", authRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/follow-ups", followupRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/confirm", confirmRoutes);

// 404 handler (MUST be before error handler)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use(errorHandler);

// HTTP Server
const server = http.createServer(app);

// Connect DB then start server
connectDB().then(() => {
  // Initialize Socket.IO
  initSocket(server, app);

  server.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`   Server running on port ${PORT}`);
    console.log("========================================");
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log("========================================\n");
  });
});

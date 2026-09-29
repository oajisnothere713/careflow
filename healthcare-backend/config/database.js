const mongoose = require("mongoose");
const config = require("./env");

let isConnecting = false;

const attemptConnection = () => {
  if (isConnecting || mongoose.connection.readyState === 1) return Promise.resolve();
  isConnecting = true;

  return mongoose
    .connect(
      process.env.MONGODB_URI || config.mongodbUri || "mongodb://localhost:27017/healthcare-portal",
      { serverSelectionTimeoutMS: 5000 }
    )
    .then(() => {
      isConnecting = false;
      console.log("✅ Connected to MongoDB");
      console.log("📁 Database: healthcare-portal");
      // Initialize cron jobs after DB connection
      const { initCronJobs } = require("../services/cronService");
      initCronJobs();
    })
    .catch((err) => {
      isConnecting = false;
      console.error("❌ MongoDB connection error:", err.message);
      console.log("💡 Make sure MongoDB is running on localhost:27017. Retrying in 5 seconds...");
      setTimeout(attemptConnection, 5000);
    });
};

const connectDB = () => {
  return attemptConnection();
};

module.exports = connectDB;

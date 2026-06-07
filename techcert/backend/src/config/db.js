const mongoose = require("mongoose");

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI?.trim();
  const onVercel = Boolean(process.env.VERCEL);

  if (!uri) {
    if (onVercel || process.env.NODE_ENV === "production") {
      throw new Error(
        "MONGODB_URI is not set. Create a free MongoDB Atlas cluster and add the connection string to Vercel."
      );
    }
  }

  const effectiveUri = uri || "mongodb://localhost:27017/signalforge";

  try {
    await mongoose.connect(effectiveUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

module.exports = connectDB;

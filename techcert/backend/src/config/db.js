const mongoose = require("mongoose");

function normalizeMongoUri(raw) {
  if (!raw) return raw;
  let uri = raw.trim();
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = normalizeMongoUri(process.env.MONGODB_URI);
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
    if (error.message.includes("bad auth")) {
      throw new Error(
        "MongoDB connection failed: bad auth : authentication failed. " +
          "Re-copy MONGODB_URI from Atlas into the backend Vercel project (no quotes), then redeploy."
      );
    }
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

module.exports = connectDB;

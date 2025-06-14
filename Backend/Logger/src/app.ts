import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { config } from "dotenv";
import { ErrorLog } from "./models/ErrorLog";
import logger from "./config/logger";

config();

const app = express();
const PORT = process.env.PORT || 4002;
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://mongodb-service:27017/logger";

if (!PORT || !MONGO_URL) {
  throw new Error("Missing required environment variables: PORT or MONGO_URL");
}

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGO_URL)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Routes
app.post("logs", async (req, res) => {
  try {
    const { service, level, message, metadata } = req.body;

    const errorLog = new ErrorLog({
      service,
      level,
      message,
      metadata,
      timestamp: new Date(),
    });

    await errorLog.save();
    logger.info(`Log saved successfully from service: ${service}`);
    res.status(201).json(errorLog);
  } catch (error) {
    logger.error("Error saving log:", error);
    res.status(500).json({ error: "Error saving log" });
  }
});

// Get logs with filtering
app.get("logs", async (req, res) => {
  try {
    const { service, level, startDate, endDate, limit = 100 } = req.query;

    const query: any = {};
    if (service) query.service = service;
    if (level) query.level = level;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const logs = await ErrorLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json(logs);
  } catch (error) {
    logger.error("Error retrieving logs:", error);
    res.status(500).json({ error: "Error retrieving logs" });
  }
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;

  if (type === "Error") {
    const { service, level, message, metadata } = data;
    const errorLog = new ErrorLog({
      service,
      level,
      message,
      metadata,
      timestamp: new Date(),
    });
    await errorLog.save();
    logger.info(`Log saved successfully from service: ${service}`);
    res.status(201).json(errorLog);
  } else {
    console.log("Unknown event type:", type);
  }
});

app.listen(PORT, () => {
  logger.info(`Logger service listening on port ${PORT}`);
});

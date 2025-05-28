import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { Event } from "./model/Event.js";
import logger from "./utils/logger.js";
import {
  messageService,
  notificationService,
  orderService,
  restaurantService,
  userService,
  sendEventToMessageService,
  sendEventToNotificationService,
  sendEventToOrderService,
  sendEventToRestaurantService,
  sendEventToUserService,
} from "./apis/graphql.js";
import { sendEventToLogger } from "./apis/rest.js";
import { authMiddleware } from "./middleware/authentication.js";

const app = express();
app.use(bodyParser.json());
app.use("/", authMiddleware);

// Add authentication middleware

const MONGODB_USER = process.env.MONGODB_USER;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_HOST = process.env.MONGODB_HOST;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

const MONGODB_URI: string = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}?authSource=admin`;

const PORT = process.env.PORT || 4001;

mongoose
  .connect(MONGODB_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Protected routes
app.post("/events", async (req: Request, res: Response) => {
  const event = req.body;

  const eventObject = new Event(event);
  await eventObject.save();

  await messageService.request(sendEventToMessageService, { input: event });
  await notificationService.request(sendEventToNotificationService, {
    input: event,
  });
  await orderService.request(sendEventToOrderService, { input: event });
  await restaurantService.request(sendEventToRestaurantService, {
    input: event,
  });
  await userService.request(sendEventToUserService, { input: event });

  await sendEventToLogger(event);

  res.send({ status: "OK" });
});

app.get("/events", async (_req: Request, res: Response) => {
  const events = await Event.find();
  res.send(events);
});

app.listen(PORT, () => {
  logger.info(`Listening on http://localhost:${PORT}`);
});

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { Event } from "./model/Event";
import logger from "./utils/logger";
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
} from "./apis/graphql";
import { sendEventToLogger } from "./apis/rest";

const app = express();
app.use(bodyParser.json());

const MONGODB_URI: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/logger";

mongoose
  .connect(MONGODB_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

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

app.listen(4005, () => {
  console.log("Listening on 4005");
});

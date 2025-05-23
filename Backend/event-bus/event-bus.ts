import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import mongoose from "mongoose";
import { Event } from "./model/Event";
import logger from "./utils/logger";
import ports from "./ports";
import { gql, GraphQLClient } from "graphql-request";

const app = express();
app.use(bodyParser.json());

const MONGODB_URI: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/logger";

const messageService = new GraphQLClient(`http://localhost:${ports.messages}`);
const notificationService = new GraphQLClient(
  `http://localhost:${ports.notifications}`
);
const orderService = new GraphQLClient(`http://localhost:${ports.orders}`);
const restaurantService = new GraphQLClient(
  `http://localhost:${ports.restaurants}`
);
const userService = new GraphQLClient(`http://localhost:${ports.users}`);

mongoose
  .connect(MONGODB_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

app.post("/events", async (req: Request, res: Response) => {
  const event = req.body;

  const eventObject = new Event(event);
  await eventObject.save();

  const sendEventToMessageService = gql`
    mutation Mutation($input: EventInput!) {
      events(input: $input) {
        id
      }
    }
  `;

  const sendEventToNotificationService = gql`
    mutation Mutation($input: EventInput!) {
      events(input: $input) {
        id
      }
    }
  `;

  const sendEventToOrderService = gql`
    mutation Mutation($input: EventInput!) {
      events(input: $input) {
        id
      }
    }
  `;

  const sendEventToRestaurantService = gql`
    mutation Mutation($input: EventInput!) {
      events(input: $input) {
        id
      }
    }
  `;

  const sendEventToUserService = gql`
    mutation Mutation($input: EventInput!) {
      events(input: $input) {
        id
      }
    }
  `;

  await messageService.request(sendEventToMessageService, { input: event });
  await notificationService.request(sendEventToNotificationService, {
    input: event,
  });
  await orderService.request(sendEventToOrderService, { input: event });
  await restaurantService.request(sendEventToRestaurantService, {
    input: event,
  });
  await userService.request(sendEventToUserService, { input: event });

  axios.post(`http://localhost:${ports.logger}/events`, event).catch((err) => {
    axios.post("http://localhost:4006/api/logs", {
      type: "ErrorLogCreated",
      data: {
        ...event,
        service: "event-bus",
      },
    });
  });

  res.send({ status: "OK" });
});

app.get("/events", async (_req: Request, res: Response) => {
  const events = await Event.find();
  res.send(events);
});

app.listen(4005, () => {
  console.log("Listening on 4005");
});

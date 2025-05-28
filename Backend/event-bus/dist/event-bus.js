"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const Event_1 = require("./model/Event");
const logger_1 = __importDefault(require("./utils/logger"));
const graphql_1 = require("./apis/graphql");
const rest_1 = require("./apis/rest");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/logger";
mongoose_1.default
    .connect(MONGODB_URI)
    .then(() => logger_1.default.info("Connected to MongoDB"))
    .catch((err) => logger_1.default.error("MongoDB connection error:", err));
app.post("/events", async (req, res) => {
    const event = req.body;
    const eventObject = new Event_1.Event(event);
    await eventObject.save();
    await graphql_1.messageService.request(graphql_1.sendEventToMessageService, { input: event });
    await graphql_1.notificationService.request(graphql_1.sendEventToNotificationService, {
        input: event,
    });
    await graphql_1.orderService.request(graphql_1.sendEventToOrderService, { input: event });
    await graphql_1.restaurantService.request(graphql_1.sendEventToRestaurantService, {
        input: event,
    });
    await graphql_1.userService.request(graphql_1.sendEventToUserService, { input: event });
    await (0, rest_1.sendEventToLogger)(event);
    res.send({ status: "OK" });
});
app.get("/events", async (_req, res) => {
    const events = await Event_1.Event.find();
    res.send(events);
});
app.listen(4005, () => {
    logger_1.default.info(`Listening on http://localhost:${4005}`);
});

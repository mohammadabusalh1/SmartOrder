import axios from "axios";
import ports from "../ports.js";

const isDocker = process.env.DOCKER === "true";
const baseUrl = isDocker ? "logger" : "localhost";

export const sendEventToLogger = async (event: any) => {
  try {
    await axios.post(`http://${baseUrl}:${ports.logger}/events`, event);
  } catch (err) {
    await axios.post(`http://${baseUrl}:${ports.logger}/logs`, {
      type: "ErrorLogCreated",
      data: {
        ...event,
        service: "event-bus",
      },
    });
  }
};

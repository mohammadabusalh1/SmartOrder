import axios from "axios";
import ports from "../ports";

export const sendEventToLogger = async (event: any) => {
  try {
    await axios.post(`http://logger:${ports.logger}/events`, event);
  } catch (err) {
    await axios.post(`http://logger:${ports.logger}/api/logs`, {
      type: "ErrorLogCreated",
      data: {
        ...event,
        service: "event-bus",
      },
    });
  }
};

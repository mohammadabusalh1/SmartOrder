"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEventToLogger = void 0;
const axios_1 = __importDefault(require("axios"));
const ports_1 = __importDefault(require("../ports"));
const sendEventToLogger = async (event) => {
    try {
        await axios_1.default.post(`http://logger:${ports_1.default.logger}/events`, event);
    }
    catch (err) {
        await axios_1.default.post(`http://logger:${ports_1.default.logger}/api/logs`, {
            type: "ErrorLogCreated",
            data: {
                ...event,
                service: "event-bus",
            },
        });
    }
};
exports.sendEventToLogger = sendEventToLogger;

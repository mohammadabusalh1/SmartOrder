"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
};
exports.default = logger;

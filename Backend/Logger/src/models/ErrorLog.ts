import mongoose from "mongoose";

export interface IErrorLog {
  service: string;
  level: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const errorLogSchema = new mongoose.Schema<IErrorLog>({
  service: {
    type: String,
    required: true,
    index: true,
  },
  level: {
    type: String,
    required: true,
    enum: ["error", "warn", "info", "debug"],
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

export const ErrorLog = mongoose.model<IErrorLog>("ErrorLog", errorLogSchema);

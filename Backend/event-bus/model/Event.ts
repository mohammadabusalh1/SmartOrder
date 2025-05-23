import mongoose, { Document, Schema } from "mongoose";

interface IEvent extends Document {
  type: string;
  data: any;
  timestamp: Date;
}

const eventSchema = new Schema({
  type: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const Event = mongoose.model<IEvent>("Event", eventSchema);

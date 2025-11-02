import mongoose, { Schema, Document, Types } from "mongoose";

export interface OtpTokenDocument extends Document {
  userId: Types.ObjectId;
  phone: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpTokenSchema = new Schema<OtpTokenDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  phone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: () => new Date(), expires: 600 },
});

export const OtpTokenModel = mongoose.model<OtpTokenDocument>("OtpToken", OtpTokenSchema);



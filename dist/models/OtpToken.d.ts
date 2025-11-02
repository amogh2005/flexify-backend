import mongoose, { Document, Types } from "mongoose";
export interface OtpTokenDocument extends Document {
    userId: Types.ObjectId;
    phone: string;
    code: string;
    expiresAt: Date;
    createdAt: Date;
}
export declare const OtpTokenModel: mongoose.Model<OtpTokenDocument, {}, {}, {}, mongoose.Document<unknown, {}, OtpTokenDocument, {}, {}> & OtpTokenDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=OtpToken.d.ts.map
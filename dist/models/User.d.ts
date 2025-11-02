import mongoose, { Document } from "mongoose";
export type UserRole = "admin" | "user" | "provider";
export interface UserDocument extends Document {
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: UserRole;
    blocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserModel: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument, {}, {}> & UserDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map
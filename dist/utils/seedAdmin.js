"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminSeed = ensureAdminSeed;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
async function ensureAdminSeed() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; admin seeding skipped");
        return;
    }
    const existing = await User_1.UserModel.findOne({ email });
    if (existing)
        return;
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    await User_1.UserModel.create({ name: "Admin", email, passwordHash, role: "admin" });
    console.log("Seeded admin user", email);
}
//# sourceMappingURL=seedAdmin.js.map
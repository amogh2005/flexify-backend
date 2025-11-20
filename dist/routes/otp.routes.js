"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const OtpToken_1 = require("../models/OtpToken");
const Provider_1 = require("../models/Provider");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
const RequestSchema = zod_1.z.object({ phone: zod_1.z.string().min(8) });
router.post("/request", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    const parsed = RequestSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { phone } = parsed.data;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OtpToken_1.OtpTokenModel.create({ userId: req.user.userId, phone, code, expiresAt });
    await (0, notifications_1.sendSms)(phone, `Your verification code is ${code}`);
    return res.json({ ok: true });
});
const VerifySchema = zod_1.z.object({ phone: zod_1.z.string().min(8), code: zod_1.z.string().length(6) });
router.post("/verify", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { phone, code } = parsed.data;
    const token = await OtpToken_1.OtpTokenModel.findOne({ userId: req.user.userId, phone, code, expiresAt: { $gt: new Date() } });
    if (!token)
        return res.status(400).json({ error: "Invalid or expired code" });
    await Provider_1.ProviderModel.findOneAndUpdate({ userId: req.user.userId }, { phone, phoneVerified: true }, { upsert: true });
    await token.deleteOne();
    return res.json({ verified: true });
});
exports.default = router;
//# sourceMappingURL=otp.routes.js.map
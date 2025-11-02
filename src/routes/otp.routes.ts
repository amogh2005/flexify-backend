import { Router } from "express";
import { z } from "zod";
import { verifyJwt, requireRole } from "../middleware/auth";
import { OtpTokenModel } from "../models/OtpToken";
import { ProviderModel } from "../models/Provider";
import { sendSms, sendEmail } from "../services/notifications";

const router = Router();

const RequestSchema = z.object({ phone: z.string().min(8) });
router.post("/request", verifyJwt, requireRole("provider"), async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { phone } = parsed.data;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OtpTokenModel.create({ userId: req.user!.userId as any, phone, code, expiresAt });
  await sendSms(phone, `Your verification code is ${code}`);
  return res.json({ ok: true });
});

const VerifySchema = z.object({ phone: z.string().min(8), code: z.string().length(6) });
router.post("/verify", verifyJwt, requireRole("provider"), async (req, res) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { phone, code } = parsed.data;
  const token = await OtpTokenModel.findOne({ userId: req.user!.userId, phone, code, expiresAt: { $gt: new Date() } });
  if (!token) return res.status(400).json({ error: "Invalid or expired code" });
  await ProviderModel.findOneAndUpdate({ userId: req.user!.userId }, { phone, phoneVerified: true }, { upsert: true });
  await token.deleteOne();
  return res.json({ verified: true });
});

export default router;



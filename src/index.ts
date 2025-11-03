import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { join } from "path";
import { connectDatabase } from "./config/db";
import {
  authRouter,
  providersRouter,
  adminRouter,
  uploadRouter,
  paymentsRouter,
  bookingsRouter,
  otpRouter,
} from "./routes";
import { ensureAdminSeed } from "./utils/seedAdmin";
import { SocketService } from "./services/socket";

dotenv.config();

console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
console.log("Razorpay Key Secret:", process.env.RAZORPAY_KEY_SECRET ? "Set" : "Not set");
console.log("Hello World");

const app = express();
const server = createServer(app);

// ✅ FIX 1: CORS middleware — must run BEFORE json/body parsing
app.use((req, res, next) => {
	const allowedOrigins = [
    "http://localhost:5173",
    "https://flexify-frontend-llkv.vercel.app",
    "https://flexify-frontend-llkv-git-main-amoghs-projects-2fd6ec23.vercel.app",
  ];

	  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  console.log("🌍 Request from:", origin || "Unknown");
  next();
});

// ✅ FIX 2: JSON parser must be applied AFTER CORS
app.use(express.json({ limit: "1mb" }));

// ✅ WebSocket setup
const socketService = new SocketService(server);
(global as any).socketService = socketService;

// ✅ Static file serving
app.use("/uploads", express.static(join(process.cwd(), "uploads")));

// ✅ Basic routes
app.get("/", (_req, res) => {
  res.send("✅ Flexify backend is live and connected to MongoDB!");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ✅ Optional test route
app.get("/test-uploads", (_req, res) => {
  const fs = require("fs");
  const uploadsDir = join(process.cwd(), "uploads");

  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      status: "ok",
      uploadsDir,
      files: files.slice(0, 10),
      totalFiles: files.length,
    });
  } catch (error: any) {
    res.json({
      status: "error",
      uploadsDir,
      error: error.message,
    });
  }
});

// ✅ All your app routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/providers", providersRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/uploads", uploadRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/otp", otpRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

(async () => {
  if (process.env.MONGO_URI) {
    await connectDatabase(process.env.MONGO_URI);
    await ensureAdminSeed();
  } else {
    console.warn("⚠️ MONGO_URI not set. Server will run without DB connection.");
  }

  server.listen(PORT, () => {
    console.log(`🚀 API listening on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
  });
})();

export default app;

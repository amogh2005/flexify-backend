"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const path_1 = require("path");
const db_1 = require("./config/db");
const routes_1 = require("./routes");
const seedAdmin_1 = require("./utils/seedAdmin");
const socket_1 = require("./services/socket");
dotenv_1.default.config();
console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
console.log("Razorpay Key Secret:", process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set');
console.log("Hello World");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Initialize WebSocket service
const socketService = new socket_1.SocketService(server);
// Make socket service available globally
global.socketService = socketService;
app.use((0, cors_1.default)({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express_1.default.json({ limit: "1mb" }));
// Serve uploaded files statically
app.use('/uploads', express_1.default.static((0, path_1.join)(process.cwd(), 'uploads')));
// Test endpoint to verify file serving
app.get("/test-uploads", (_req, res) => {
    const fs = require('fs');
    const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads');
    try {
        const files = fs.readdirSync(uploadsDir);
        res.json({
            status: "ok",
            uploadsDir,
            files: files.slice(0, 10), // Show first 10 files
            totalFiles: files.length
        });
    }
    catch (error) {
        res.json({
            status: "error",
            uploadsDir,
            error: error.message
        });
    }
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/v1/auth", routes_1.authRouter);
app.use("/api/v1/providers", routes_1.providersRouter);
app.use("/api/v1/admin", routes_1.adminRouter);
app.use("/api/v1/uploads", routes_1.uploadRouter);
app.use("/api/v1/payments", routes_1.paymentsRouter);
app.use("/api/v1/bookings", routes_1.bookingsRouter);
app.use("/api/v1/otp", routes_1.otpRouter);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
(async () => {
    // Attempt DB connection if MONGO_URI provided; otherwise continue in dev mode
    if (process.env.MONGO_URI) {
        await (0, db_1.connectDatabase)(process.env.MONGO_URI);
        await (0, seedAdmin_1.ensureAdminSeed)();
    }
    else {
        console.warn("MONGO_URI not set. Server will run without DB connection.");
    }
    server.listen(PORT, () => {
        console.log(`API listening on http://localhost:${PORT}`);
        console.log(`WebSocket server ready on ws://localhost:${PORT}`);
    });
})();
exports.default = app;
//# sourceMappingURL=index.js.map
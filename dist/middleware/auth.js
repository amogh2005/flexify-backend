"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = verifyJwt;
exports.requireRole = requireRole;
exports.decodeJwt = decodeJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function verifyJwt(req, res, next) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token)
        return res.status(401).json({ error: "Missing token" });
    try {
        const secret = process.env.JWT_SECRET || "dev_secret";
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = payload;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: "Forbidden" });
        return next();
    };
}
// Helper for non-express contexts (e.g., websockets)
function decodeJwt(token) {
    try {
        const secret = process.env.JWT_SECRET || "dev_secret";
        const payload = jsonwebtoken_1.default.verify(token, secret);
        return payload;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=auth.js.map
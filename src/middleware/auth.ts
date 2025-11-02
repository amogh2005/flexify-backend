import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRole = "admin" | "user" | "provider";

export interface AuthTokenPayload {
	userId: string;
	role: AuthRole;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthTokenPayload;
		}
	}
}

export function verifyJwt(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers["authorization"] || "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
	if (!token) return res.status(401).json({ error: "Missing token" });

	try {
		const secret = process.env.JWT_SECRET || "dev_secret";
		const payload = jwt.verify(token, secret) as AuthTokenPayload;
		req.user = payload;
		return next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
}

export function requireRole(...roles: AuthRole[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) return res.status(401).json({ error: "Unauthorized" });
		if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
		return next();
	};
}

// Helper for non-express contexts (e.g., websockets)
export function decodeJwt(token: string): AuthTokenPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
    const payload = jwt.verify(token, secret) as AuthTokenPayload;
    return payload;
  } catch {
    return null;
  }
}



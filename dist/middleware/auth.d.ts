import { Request, Response, NextFunction } from "express";
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
export declare function verifyJwt(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireRole(...roles: AuthRole[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function decodeJwt(token: string): AuthTokenPayload | null;
//# sourceMappingURL=auth.d.ts.map
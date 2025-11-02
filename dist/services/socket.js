"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const auth_1 = require("../middleware/auth");
class SocketService {
    constructor(server) {
        this.userSockets = new Map(); // userId -> socketId
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }
                const decoded = (0, auth_1.decodeJwt)(token);
                if (!decoded) {
                    return next(new Error('Authentication error'));
                }
                socket.data.userId = decoded.userId;
                socket.data.role = decoded.role;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.data.userId} connected`);
            // Store user's socket connection
            this.userSockets.set(socket.data.userId, socket.id);
            socket.on('disconnect', () => {
                console.log(`User ${socket.data.userId} disconnected`);
                this.userSockets.delete(socket.data.userId);
            });
            socket.on('join-provider-room', () => {
                if (socket.data.role === 'provider') {
                    socket.join('providers');
                }
            });
            socket.on('join-user-room', () => {
                if (socket.data.role === 'user') {
                    socket.join('users');
                }
            });
        });
    }
    // Send notification to specific user
    sendToUser(userId, event, data) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }
    // Send notification to all providers
    sendToProviders(event, data) {
        this.io.to('providers').emit(event, data);
    }
    // Send notification to all users
    sendToUsers(event, data) {
        this.io.to('users').emit(event, data);
    }
    // Send notification to specific role
    sendToRole(role, event, data) {
        if (role === 'provider') {
            this.sendToProviders(event, data);
        }
        else if (role === 'user') {
            this.sendToUsers(event, data);
        }
    }
    // Get socket instance for external use
    getIO() {
        return this.io;
    }
}
exports.SocketService = SocketService;
//# sourceMappingURL=socket.js.map
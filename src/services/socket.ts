import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { decodeJwt } from '../middleware/auth';

export class SocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = decodeJwt(token);
        if (!decoded) {
          return next(new Error('Authentication error'));
        }

        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
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
  public sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send notification to all providers
  public sendToProviders(event: string, data: any) {
    this.io.to('providers').emit(event, data);
  }

  // Send notification to all users
  public sendToUsers(event: string, data: any) {
    this.io.to('users').emit(event, data);
  }

  // Send notification to specific role
  public sendToRole(role: string, event: string, data: any) {
    if (role === 'provider') {
      this.sendToProviders(event, data);
    } else if (role === 'user') {
      this.sendToUsers(event, data);
    }
  }

  // Get socket instance for external use
  public getIO() {
    return this.io;
  }
}

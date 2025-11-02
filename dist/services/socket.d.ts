import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
export declare class SocketService {
    private io;
    private userSockets;
    constructor(server: HTTPServer);
    private setupMiddleware;
    private setupEventHandlers;
    sendToUser(userId: string, event: string, data: any): void;
    sendToProviders(event: string, data: any): void;
    sendToUsers(event: string, data: any): void;
    sendToRole(role: string, event: string, data: any): void;
    getIO(): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
}
//# sourceMappingURL=socket.d.ts.map
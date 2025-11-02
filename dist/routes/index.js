"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRouter = exports.bookingsRouter = exports.paymentsRouter = exports.uploadRouter = exports.adminRouter = exports.providersRouter = exports.authRouter = void 0;
var auth_routes_1 = require("./auth.routes");
Object.defineProperty(exports, "authRouter", { enumerable: true, get: function () { return __importDefault(auth_routes_1).default; } });
var providers_routes_1 = require("./providers.routes");
Object.defineProperty(exports, "providersRouter", { enumerable: true, get: function () { return __importDefault(providers_routes_1).default; } });
var admin_routes_1 = require("./admin.routes");
Object.defineProperty(exports, "adminRouter", { enumerable: true, get: function () { return __importDefault(admin_routes_1).default; } });
var upload_routes_1 = require("./upload.routes");
Object.defineProperty(exports, "uploadRouter", { enumerable: true, get: function () { return __importDefault(upload_routes_1).default; } });
var payments_routes_1 = require("./payments.routes");
Object.defineProperty(exports, "paymentsRouter", { enumerable: true, get: function () { return __importDefault(payments_routes_1).default; } });
var bookings_routes_1 = require("./bookings.routes");
Object.defineProperty(exports, "bookingsRouter", { enumerable: true, get: function () { return __importDefault(bookings_routes_1).default; } });
var otp_routes_1 = require("./otp.routes");
Object.defineProperty(exports, "otpRouter", { enumerable: true, get: function () { return __importDefault(otp_routes_1).default; } });
//# sourceMappingURL=index.js.map
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocket = void 0;
var events_1 = require("events");
var websocket = /** @class */ (function (_super) {
    __extends(websocket, _super);
    function websocket(logger) {
        var _this = _super.call(this) || this;
        _this.logger = logger;
        return _this;
    }
    Object.defineProperty(websocket.prototype, "connected", {
        get: function () {
            if (!this.socket) {
                return 0;
            }
            return this.socket.OPEN;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(websocket.prototype, "connectting", {
        get: function () {
            if (!this.socket) {
                return 0;
            }
            return this.socket.CONNECTING;
        },
        enumerable: false,
        configurable: true
    });
    websocket.prototype.connect = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.socket) {
                    return [2 /*return*/, this];
                }
                this.socket = new WebSocket(uri);
                this.socket.binaryType = 'arraybuffer';
                this.socket.onmessage = function (event) {
                    _this.logger.trace('receive message', { byteLength: event.data.byteLength });
                    _this.emit('message', event.data);
                };
                this.socket.onerror = this.emit.bind(this, 'error');
                this.socket.onopen = this.emit.bind(this, 'connected');
                this.socket.onclose = this.emit.bind(this, 'closed');
                return [2 /*return*/, this];
            });
        });
    };
    websocket.prototype.close = function (code, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.warn('socket colse', { code: code, reason: reason });
                if (this.socket) {
                    this.socket.close(1000, reason);
                    delete this.socket;
                    this.socket = undefined;
                }
                return [2 /*return*/];
            });
        });
    };
    websocket.prototype.send = function (buffer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.trace('send message', { size: buffer.length });
                if (this.socket && this.connected) {
                    return [2 /*return*/, this.socket.send(buffer)];
                }
                return [2 /*return*/, Promise.reject('socket hunup!')];
            });
        });
    };
    return websocket;
}(events_1.EventEmitter));
exports.websocket = websocket;

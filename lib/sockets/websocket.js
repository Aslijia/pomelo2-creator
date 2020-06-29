"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocket = void 0;
const events_1 = require("events");
class websocket extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
    }
    get connected() {
        if (!this.socket) {
            return 0;
        }
        return this.socket.OPEN;
    }
    get connectting() {
        if (!this.socket) {
            return 0;
        }
        return this.socket.CONNECTING;
    }
    connect(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.socket) {
                return this;
            }
            this.socket = new WebSocket(uri);
            this.socket.binaryType = 'arraybuffer';
            this.socket.onmessage = (event) => {
                this.logger.trace('receive message', { byteLength: event.data.byteLength });
                this.emit('message', event.data);
            };
            this.socket.onerror = this.emit.bind(this, 'error');
            this.socket.onopen = this.emit.bind(this, 'connected');
            this.socket.onclose = this.emit.bind(this, 'closed');
            return this;
        });
    }
    close(code, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.warn('socket colse', { code, reason });
            if (this.socket) {
                this.socket.close(1000, reason);
                delete this.socket;
                this.socket = undefined;
            }
        });
    }
    send(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.socket) {
                this.logger.trace('send message', { size: buffer.length });
                return this.socket.send(buffer);
            }
            this.logger.error('send message failed', { size: buffer.length });
            return Promise.reject('socket hunup!');
        });
    }
}
exports.websocket = websocket;

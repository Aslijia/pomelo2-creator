'use strict';
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
var STATUS;
(function (STATUS) {
    STATUS[STATUS["UNKNOWN"] = 0] = "UNKNOWN";
    STATUS[STATUS["CONNECTING"] = 1] = "CONNECTING";
    STATUS[STATUS["OPEN"] = 2] = "OPEN";
    STATUS[STATUS["CLOSING"] = 3] = "CLOSING";
    STATUS[STATUS["CLOSED"] = 4] = "CLOSED";
})(STATUS || (STATUS = {}));
class websocket extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this.status = STATUS.UNKNOWN;
        this.logger = logger;
    }
    get connected() {
        if (!this.socket) {
            return false;
        }
        return this.status === STATUS.OPEN;
    }
    get connectting() {
        if (!this.socket) {
            return false;
        }
        return this.status === STATUS.CONNECTING;
    }
    connect(uri, protocal) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.socket) {
                this.logger.warn('socket already inuse', { uri, protocal });
                return this;
            }
            this.logger.trace('try to connect remote server', { uri, protocal });
            this.socket = new WebSocket(uri, protocal);
            this.status = STATUS.CONNECTING;
            this.socket.binaryType = 'arraybuffer';
            this.socket.onmessage = (event) => {
                this.logger.trace('receive message', {
                    byteLength: event.data.byteLength
                });
                this.emit('message', event.data);
            };
            this.socket.onerror = (err) => {
                this.logger.error('web socket has error', { uri, err });
                this.emit('error', err);
            };
            this.socket.onopen = () => {
                this.status = STATUS.OPEN;
                this.logger.debug('websocket open success', { uri, protocal });
                this.emit('connecting');
            };
            this.socket.onclose = () => {
                this.status = STATUS.CLOSED;
                this.logger.debug('websocket was closed', { uri, protocal });
                this.emit('closed');
            };
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
            if (this.connected) {
                this.logger.trace('send message', { size: buffer.length });
                return this.socket && this.socket.send(buffer);
            }
            this.logger.error('send message failed', { size: buffer.length });
            return Promise.reject('socket hunup!');
        });
    }
}
exports.websocket = websocket;

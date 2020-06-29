"use strict";

import { EventEmitter } from 'events';

declare interface Logger {
    trace(message: string, body?: object): void;
    info(message: string, body?: object): void;
    debug(message: string, body?: object): void;
    warn(message: string, body?: object): void;
    error(message: string, body?: object): void;
    fatal(message: string, body?: object): void;
}
enum STATUS {
    UNKNOWN = 0,
    CONNECTING = 1,
    OPEN = 2,
    CLOSING = 3,
    CLOSED = 4
}
export class websocket extends EventEmitter {
    status: number = STATUS.UNKNOWN;
    socket: WebSocket | undefined;
    logger: Logger;

    constructor(logger: Logger) {
        super();
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

    async connect(uri: string) {
        if (this.socket) {
            return this;
        }

        this.socket = new WebSocket(uri);
        this.status = STATUS.CONNECTING

        this.socket.binaryType = 'arraybuffer';
        this.socket.onmessage = (event) => {
            this.logger.trace('receive message', { byteLength: event.data.byteLength });
            this.emit('message', event.data);
        };

        this.socket.onerror = (err) => {
            this.emit('error', err);
        }

        this.socket.onopen = () => {
            this.status = STATUS.OPEN;
            this.emit('connected');
        }

        this.socket.onclose = () => {
            this.status = STATUS.CLOSED
            this.emit('closed');
        }

        return this;
    }

    async close(code: number, reason: string) {
        this.logger.warn('socket colse', { code, reason });
        if (this.socket) {
            this.socket.close(1000, reason);
            delete this.socket;
            this.socket = undefined;
        }
    }

    async send(buffer: Uint8Array) {
        if (this.connected) {
            this.logger.trace('send message', { size: buffer.length });
            return this.socket && this.socket.send(buffer);
        }
        this.logger.error('send message failed', { size: buffer.length });
        return Promise.reject('socket hunup!');
    }
}

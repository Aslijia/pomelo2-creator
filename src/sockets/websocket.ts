"use strict";

import { EventEmitter } from 'events';

export class websocket extends EventEmitter {
    socket: WebSocket | undefined;

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

    async connect(uri: string) {
        if (this.socket) {
            return this;
        }

        this.socket = new WebSocket(uri);

        this.socket.binaryType = 'arraybuffer';
        this.socket.onmessage = (event) => {
            this.emit('message', event.data);
        };
        this.socket.onerror = this.emit.bind(this, 'error');
        this.socket.onopen = this.emit.bind(this, 'connected');
        this.socket.onclose = this.emit.bind(this, 'closed');
        return this;
    }

    async close(code: number, reason: string) {
        if (this.socket) {
            this.socket.close(code, reason);
            this.socket = undefined;
        }
    }

    async send(buffer: Uint8Array) {
        if (this.socket) {
            return this.socket.send(buffer);
        }
        return Promise.reject('socket hunup!');
    }
}

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
exports.Session = void 0;
const events_1 = require("events");
const URLParse = require("url-parse");
const websocket_1 = require("./sockets/websocket");
const protobuf_1 = require("./protobuf");
const protocol_1 = require("./protocol");
const JS_WS_CLIENT_TYPE = 'cocos-creator-api';
const JS_WS_CLIENT_VERSION = '0.0.1';
const RES_OK = 200;
const RES_FAIL = 500;
const RES_OLD_CLIENT = 501;
class Console {
    trace(message, body) {
        console.log.call(this, '%c[TRACE] %s:%j', 'color:#87CEEB;', message, body);
    }
    info(message, body) {
        console.log.call(this, '%c[INFO] %s:%j', 'color:#228B22;', message, body);
    }
    debug(message, body) {
        console.log.call(this, '%c[DEBUG] %s:%j', 'color:#0000FF;', message, body);
    }
    warn(message, body) {
        console.log.call(this, '%c[WARN] %s:%j', 'color:#FFD700;', message, body);
    }
    error(message, body) {
        console.log.call(this, '%c[ERROR] %s:%j', 'color:#DC143C;', message, body);
    }
    fatal(message, body) {
        console.log.call(this, '%c[FATAL] %s:%j', 'color:#9400D3;', message, body);
    }
}
class Session extends events_1.EventEmitter {
    constructor(uri, opts) {
        super();
        this.id = '';
        this.protoVersion = '';
        this.serverProtos = {};
        this.clientProtos = {};
        this.dict = {};
        this.routeMap = {};
        this.abbrs = {};
        this.heartbeatInterval = 0;
        this.heartbeatTimeout = 0;
        this.nextHeartbeatTimeout = 0;
        this.heartbeatTimeoutId = 0;
        this.heartbeatId = 0;
        this._listeners = {};
        this.retryCounter = 0;
        this.retryTimer = 0;
        this.reqId = 0;
        this.callbacks = {};
        this.logger = opts.logger || new Console();
        this.logger.trace('init pomelo', { uri, opts });
        this._remote = new URLParse(uri);
        this.opts = opts;
        const protos = opts.localstorage.getItem('protos');
        if (protos) {
            this.protoVersion = protos.version || '';
            this.serverProtos = protos.server || {};
            this.clientProtos = protos.client || {};
            protobuf_1.Protobuf.init({
                encoderProtos: this.clientProtos,
                decoderProtos: this.serverProtos,
            });
        }
        this.handshakeBuffer = {
            sys: {
                type: JS_WS_CLIENT_TYPE,
                version: JS_WS_CLIENT_VERSION,
                rsa: {},
                protoVersion: this.protoVersion,
            },
            user: {},
        };
        this.connect();
        this.on('reconnect', () => {
            if (this.retryCounter > (this.opts.retry || 10)) {
                this.emit('gone', { retryCounter: this.retryCounter });
                return;
            }
            this.logger.warn('reconnect', {
                time: (this.retryCounter % 10) + 1,
                retryCounter: this.retryCounter,
            });
            this.retryTimer = setTimeout(this.connect.bind(this), ((this.retryCounter % 10) + 1) * 1000);
            this.retryCounter++;
        });
    }
    emit(type, ...args) {
        for (let i in this._listeners) {
            this._listeners[i].emit(type, ...args);
        }
        return super.emit(type, ...args);
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.socket && (this.socket.connectting || this.socket.connected)) {
                return;
            }
            if (this.socket) {
                this.socket.removeAllListeners();
                delete this.socket;
            }
            switch (this._remote.protocol) {
                case 'ws:':
                case 'wss:':
                    this.socket = new websocket_1.websocket(this.logger);
                    break;
                default:
                    throw new Error('un support socket protocol!');
            }
            if (!this.socket) {
                return;
            }
            this.socket.on('error', (err) => {
                this.logger.error('websocket has error', { message: err.message });
            });
            this.socket.on('message', this.processPackage.bind(this));
            this.socket.on('closed', () => {
                this.logger.warn('socket closed');
                this.emit('disconnect');
                if (this.socket) {
                    this.socket.removeAllListeners();
                    delete this.socket;
                    this.socket = undefined;
                }
                this.emit('reconnect');
            });
            this.socket.on('connected', () => {
                this.logger.debug('socket connected');
                this.emit('connecting', { retryCounter: this.retryCounter });
                this.retryCounter = 0;
                if (this.socket) {
                    this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HANDSHAKE, protocol_1.Protocol.strencode(JSON.stringify(this.handshakeBuffer))));
                }
            });
            this.socket.connect(this._remote.href, this._remote.protocol);
        });
    }
    when(channel, event, listener) {
        if (!this._listeners[channel]) {
            this._listeners[channel] = new events_1.EventEmitter();
        }
        this._listeners[channel].on(event, listener);
    }
    cleanup(channel) {
        if (channel && this._listeners[channel]) {
            this._listeners[channel].removeAllListeners();
            delete this._listeners[channel];
        }
    }
    asyncEvent(event, timeout = 5000) {
        return new Promise((s, r) => {
            const timer = setTimeout(r, timeout);
            this.once(event, (data) => {
                if (timer) {
                    clearTimeout(timer);
                }
                s(data);
            });
        });
    }
    request(route, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.trace('request', { route, msg, reqId: this.reqId++ });
            if (!this.socket) {
                yield this.connect();
            }
            if (!this.socket) {
                return Promise.reject(new Error('socket invalid status!'));
            }
            if (this.socket.connectting) {
                yield this.asyncEvent('ready');
            }
            const reqid = this.reqId;
            const body = this._encode(reqid, route, msg);
            if (body) {
                yield this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_DATA, body));
            }
            return yield new Promise((resolve, reject) => {
                this.callbacks[reqid] = { resolve, reject };
                this.routeMap[reqid] = route;
            });
        });
    }
    notify(route, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.trace('notify', { route, msg });
            if (!this.socket) {
                yield this.connect();
            }
            if (this.socket && this.socket.connectting) {
                yield this.asyncEvent('ready');
            }
            const body = this._encode(0, route, msg);
            if (this.socket && body) {
                yield this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_DATA, body));
            }
        });
    }
    disconnect(code, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('disconnect', { code, reason });
            if (this.heartbeatId) {
                clearTimeout(this.heartbeatId);
            }
            if (this.heartbeatTimeoutId) {
                clearTimeout(this.heartbeatTimeoutId);
            }
            if (this.socket) {
                this.socket.close(code, reason);
                this.socket = undefined;
            }
        });
    }
    processPackage(buffer) {
        const msgs = protocol_1.Protocol.Package.decode(buffer);
        if (!msgs) {
            if (this.socket)
                this.socket.close(-1, 'socket read EOF!');
            return;
        }
        for (let i in msgs) {
            const msg = msgs[i];
            switch (msg.type) {
                case protocol_1.Protocol.PackageType.TYPE_HANDSHAKE:
                    this.logger.warn('初始化 socket 握手协议!', {});
                    this.onHandshake(msg.body);
                    this.auth();
                    break;
                case protocol_1.Protocol.PackageType.TYPE_HEARTBEAT:
                    this.onHeartbeat();
                    break;
                case protocol_1.Protocol.PackageType.TYPE_DATA:
                    this.onMessage(msg.body);
                    break;
                case protocol_1.Protocol.PackageType.TYPE_KICK:
                    this.onKickout(msg.body);
                    break;
                default:
                    this.logger.error('invalid package type', { msg });
                    break;
            }
        }
    }
    onHandshake(body) {
        this.logger.trace('pomelo 握手协议', { size: body ? body.length : 0 });
        if (!body) {
            this.logger.fatal('handshake failed', {});
            return;
        }
        const msg = JSON.parse(protocol_1.Protocol.strdecode(body));
        if (msg.code === RES_OLD_CLIENT) {
            this.emit('error', new Error('invalid version'));
            this.logger.error('pomelo protocol has error', msg);
            return;
        }
        if (msg.code !== RES_OK) {
            this.emit('error', new Error('handshake failed'));
            this.logger.error('handshake failed', msg);
        }
        if (msg.sys && msg.sys.heartbeat) {
            this.logger.debug('init heartbeat from remote', {
                heartbeat: msg.sys.heartbeat,
            });
            this.heartbeatInterval = msg.sys.heartbeat * 1000; // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 5; // max heartbeat timeout
        }
        if (msg.sys.id) {
            this.logger.debug('init session id', { id: msg.sys.id });
            this.id = msg.sys.id;
        }
        this.dict = msg.sys.dict || {};
        const protos = msg.sys.protos;
        //Init compress dict
        if (this.dict) {
            this.abbrs = {};
            for (let route in this.dict) {
                this.abbrs[this.dict[route]] = route;
            }
        }
        //Init protobuf protos
        if (protos) {
            this.logger.debug('init protobuf', { protos });
            this.protoVersion = protos.version || 0;
            this.serverProtos = protos.server || {};
            this.clientProtos = protos.client || {};
            //Save protobuf protos to localStorage
            this.opts.localstorage.setItem('protos', JSON.stringify(protos));
            protobuf_1.Protobuf.init({
                encoderProtos: protos.client,
                decoderProtos: protos.server,
            });
        }
        if (this.socket)
            this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HANDSHAKE_ACK));
        else
            this.logger.error('TYPE_HANDSHAKE_ACK failed by socket is gone!', {});
    }
    onHeartbeat() {
        this.logger.trace('heartbeat', {
            heartbeatId: this.heartbeatId,
            heartbeatInterval: this.heartbeatInterval,
        });
        if (!this.heartbeatInterval || this.heartbeatId) {
            return;
        }
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
        }
        this.heartbeatId = setTimeout(() => {
            this.heartbeatId = null;
            if (this.socket) {
                this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HEARTBEAT));
            }
            this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout;
            this.heartbeatTimeoutId = setTimeout(() => {
                if (this.socket)
                    this.socket.close(-1, 'heartbeat timeout!');
            }, this.heartbeatTimeout);
        }, this.heartbeatInterval);
    }
    onMessage(body) {
        this.logger.trace('new message', { body: body ? body.length : 0 });
        if (!body) {
            return;
        }
        const msg = this._decode(body);
        if (!msg) {
            return;
        }
        if (!msg.id && msg.route) {
            this.emit(msg.route.toString(), msg.body);
            return;
        }
        if (this.callbacks[msg.id]) {
            this.callbacks[msg.id].resolve(msg.body);
            delete this.callbacks[msg.id];
        }
    }
    onKickout(body) {
        this.logger.trace('kickout by remote server', {
            body: body ? body.length : 0,
        });
        if (!body) {
            return;
        }
        const reason = JSON.parse(protocol_1.Protocol.strdecode(body));
        this.emit('kickout', reason);
    }
    _encode(reqId, route, msg) {
        if (this.clientProtos[route]) {
            msg = protobuf_1.Protobuf.encode(route, msg);
        }
        else {
            msg = protocol_1.Protocol.strencode(JSON.stringify(msg));
        }
        return protocol_1.Protocol.Message.encode(reqId, reqId
            ? protocol_1.Protocol.MessageType.TYPE_REQUEST
            : protocol_1.Protocol.MessageType.TYPE_NOTIFY, !!this.dict[route], this.dict[route] ? this.dict[route] : route, msg, false);
    }
    _decode(buffer) {
        const msg = protocol_1.Protocol.Message.decode(buffer);
        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route) {
                return;
            }
        }
        const canver = (msg) => {
            let route = msg.route;
            //Decompose route from dict
            if (msg.compressRoute) {
                if (!this.abbrs[route]) {
                    return {};
                }
                route = msg.route = this.abbrs[route];
            }
            if (this.serverProtos[route]) {
                return protobuf_1.Protobuf.decode(route, msg.body);
            }
            else {
                return JSON.parse(protocol_1.Protocol.strdecode(msg.body));
            }
        };
        msg.body = canver(msg);
        return msg;
    }
    auth() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('auto');
            if (this.opts.auth) {
                const response = yield this.opts.auth();
                if (response) {
                    this.emit('ready', response);
                }
                return response;
            }
        });
    }
}
exports.Session = Session;

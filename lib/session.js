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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
var events_1 = require("events");
var URLParse = require("url-parse");
var websocket_1 = require("./sockets/websocket");
var protobuf_1 = require("./protobuf");
var protocol_1 = require("./protocol");
var JS_WS_CLIENT_TYPE = 'cocos-creator-api';
var JS_WS_CLIENT_VERSION = '0.0.1';
var RES_OK = 200;
var RES_FAIL = 500;
var RES_OLD_CLIENT = 501;
var Console = /** @class */ (function () {
    function Console() {
    }
    Console.prototype.trace = function (message, body) {
        console.log.call(this, '%c[TRACE] %s:%j', 'color:#87CEEB;', message, body);
    };
    ;
    Console.prototype.info = function (message, body) {
        console.log.call(this, '%c[INFO] %s:%j', 'color:#228B22;', message, body);
    };
    ;
    Console.prototype.debug = function (message, body) {
        console.log.call(this, '%c[DEBUG] %s:%j', 'color:#0000FF;', message, body);
    };
    ;
    Console.prototype.warn = function (message, body) {
        console.log.call(this, '%c[WARN] %s:%j', 'color:#FFD700;', message, body);
    };
    ;
    Console.prototype.error = function (message, body) {
        console.log.call(this, '%c[ERROR] %s:%j', 'color:#DC143C;', message, body);
    };
    ;
    Console.prototype.fatal = function (message, body) {
        console.log.call(this, '%c[FATAL] %s:%j', 'color:#9400D3;', message, body);
    };
    ;
    return Console;
}());
var Session = /** @class */ (function (_super) {
    __extends(Session, _super);
    function Session(uri, opts) {
        var _this = _super.call(this) || this;
        _this.id = '';
        _this.protoVersion = '';
        _this.serverProtos = {};
        _this.clientProtos = {};
        _this.dict = {};
        _this.routeMap = {};
        _this.abbrs = {};
        _this.heartbeatInterval = 0;
        _this.heartbeatTimeout = 0;
        _this.nextHeartbeatTimeout = 0;
        _this.heartbeatTimeoutId = 0;
        _this.heartbeatId = 0;
        _this._listeners = {};
        _this.retryCounter = 0;
        _this.retryTimer = 0;
        _this.reqId = 0;
        _this.callbacks = {};
        _this.logger = opts.logger || new Console();
        _this.logger.trace('init pomelo', { uri: uri, opts: opts });
        _this._remote = new URLParse(uri);
        _this.opts = opts;
        var protos = opts.localstorage.getItem('protos');
        if (protos) {
            _this.protoVersion = protos.version || '';
            _this.serverProtos = protos.server || {};
            _this.clientProtos = protos.client || {};
            protobuf_1.Protobuf.init({
                encoderProtos: _this.clientProtos,
                decoderProtos: _this.serverProtos
            });
        }
        _this.handshakeBuffer = {
            sys: {
                type: JS_WS_CLIENT_TYPE,
                version: JS_WS_CLIENT_VERSION,
                rsa: {},
                protoVersion: _this.protoVersion
            },
            user: {}
        };
        _this.connect();
        _this.on('reconnect', function () {
            if (_this.retryCounter > (_this.opts.retry || 10)) {
                _this.emit('gone', { retryCounter: _this.retryCounter });
                return;
            }
            _this.logger.warn('reconnect', { time: _this.retryCounter % 10 + 1, retryCounter: _this.retryCounter });
            _this.retryTimer = setTimeout(_this.connect.bind(_this), (_this.retryCounter % 10 + 1) * 1000);
            _this.retryCounter++;
        });
        return _this;
    }
    Session.prototype.emit = function (type) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        for (var i in this._listeners) {
            (_a = this._listeners[i]).emit.apply(_a, __spreadArrays([type], args));
        }
        return _super.prototype.emit.apply(this, __spreadArrays([type], args));
    };
    Session.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.socket && (this.socket.connectting || this.socket.connected)) {
                    return [2 /*return*/];
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
                this.socket.on('error', function (err) {
                    _this.logger.error('websocket has error', { message: err.message });
                });
                this.socket.on('message', this.processPackage.bind(this));
                this.socket.on('closed', function () {
                    _this.logger.warn('socket closed');
                    _this.emit('disconnect');
                    if (_this.socket) {
                        _this.socket.removeAllListeners();
                        delete _this.socket;
                        _this.socket = undefined;
                    }
                    _this.emit('reconnect');
                });
                this.socket.on('connected', function () {
                    _this.logger.debug('socket connected');
                    _this.emit('connecting', { retryCounter: _this.retryCounter });
                    _this.retryCounter = 0;
                    if (_this.socket) {
                        _this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HANDSHAKE, protocol_1.Protocol.strencode(JSON.stringify(_this.handshakeBuffer))));
                    }
                });
                this.socket.connect(this._remote.href);
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.when = function (channel, event, listener) {
        if (!this._listeners[channel]) {
            this._listeners[channel] = new events_1.EventEmitter();
        }
        this._listeners[channel].on(event, listener);
    };
    Session.prototype.cleanup = function (channel) {
        if (channel && this._listeners[channel]) {
            this._listeners[channel].removeAllListeners();
            delete this._listeners[channel];
        }
    };
    Session.prototype.asyncEvent = function (event, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 5000; }
        return new Promise(function (s, r) {
            var timer = setTimeout(r, timeout);
            _this.once(event, function (data) {
                if (timer) {
                    clearTimeout(timer);
                }
                s(data);
            });
        });
    };
    Session.prototype.request = function (route, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var reqid, body;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace('request', { route: route, msg: msg, reqId: this.reqId++ });
                        if (!!this.socket) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.socket) {
                            return [2 /*return*/, Promise.reject(new Error('socket invalid status!'))];
                        }
                        if (!this.socket.connectting) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.asyncEvent('ready')];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        reqid = this.reqId;
                        body = this._encode(reqid, route, msg);
                        if (!body) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_DATA, body))];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, new Promise(function (resolve, reject) {
                            _this.callbacks[reqid] = { resolve: resolve, reject: reject };
                            _this.routeMap[reqid] = route;
                        })];
                    case 7: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Session.prototype.notify = function (route, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var body;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace('notify', { route: route, msg: msg });
                        if (!!this.socket) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(this.socket && this.socket.connectting)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.asyncEvent('ready')];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        body = this._encode(0, route, msg);
                        if (!(this.socket && body)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_DATA, body))];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.disconnect = function (code, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.debug('disconnect', { code: code, reason: reason });
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
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.processPackage = function (buffer) {
        return __awaiter(this, void 0, void 0, function () {
            var msgs, _a, _b, _i, i, msg, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        msgs = protocol_1.Protocol.Package.decode(buffer);
                        if (!msgs) {
                            if (this.socket)
                                this.socket.close(-1, 'socket read EOF!');
                            return [2 /*return*/];
                        }
                        _a = [];
                        for (_b in msgs)
                            _a.push(_b);
                        _i = 0;
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        i = _a[_i];
                        msg = msgs[i];
                        _c = msg.type;
                        switch (_c) {
                            case protocol_1.Protocol.PackageType.TYPE_HANDSHAKE: return [3 /*break*/, 2];
                            case protocol_1.Protocol.PackageType.TYPE_HEARTBEAT: return [3 /*break*/, 5];
                            case protocol_1.Protocol.PackageType.TYPE_DATA: return [3 /*break*/, 6];
                            case protocol_1.Protocol.PackageType.TYPE_KICK: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 8];
                    case 2: return [4 /*yield*/, this.onHandshake(msg.body)];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, this.auth()];
                    case 4:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 5:
                        this.onHeartbeat();
                        return [3 /*break*/, 9];
                    case 6:
                        this.onMessage(msg.body);
                        return [3 /*break*/, 9];
                    case 7:
                        this.onKickout(msg.body);
                        return [3 /*break*/, 9];
                    case 8:
                        this.logger.error('invalid package type', { msg: msg });
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.onHandshake = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            var msg, protos, route;
            return __generator(this, function (_a) {
                this.logger.trace('hand shake', { size: body ? body.length : 0 });
                if (!body) {
                    return [2 /*return*/];
                }
                msg = JSON.parse(protocol_1.Protocol.strdecode(body));
                if (msg.code === RES_OLD_CLIENT) {
                    this.emit('error', new Error('invalid version'));
                    return [2 /*return*/];
                }
                if (msg.code !== RES_OK) {
                    this.emit('error', new Error('handshake failed'));
                }
                if (msg.sys && msg.sys.heartbeat) {
                    this.logger.debug('heartbeat', { heartbeat: msg.sys.heartbeat });
                    this.heartbeatInterval = msg.sys.heartbeat * 1000; // heartbeat interval
                    this.heartbeatTimeout = this.heartbeatInterval * 5; // max heartbeat timeout
                }
                if (msg.sys.id) {
                    this.logger.debug('init session id', { id: msg.sys.id });
                    this.id = msg.sys.id;
                }
                this.dict = msg.sys.dict || {};
                protos = msg.sys.protos;
                //Init compress dict
                if (this.dict) {
                    this.abbrs = {};
                    for (route in this.dict) {
                        this.abbrs[this.dict[route]] = route;
                    }
                }
                //Init protobuf protos
                if (protos) {
                    this.logger.debug('init protobuf', { protos: protos });
                    this.protoVersion = protos.version || 0;
                    this.serverProtos = protos.server || {};
                    this.clientProtos = protos.client || {};
                    //Save protobuf protos to localStorage
                    this.opts.localstorage.setItem('protos', JSON.stringify(protos));
                    protobuf_1.Protobuf.init({ encoderProtos: protos.client, decoderProtos: protos.server });
                }
                if (this.socket)
                    this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HANDSHAKE_ACK));
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.onHeartbeat = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.logger.trace('heartbeat', { heartbeatId: this.heartbeatId, heartbeatInterval: this.heartbeatInterval });
                if (!this.heartbeatInterval || this.heartbeatId) {
                    return [2 /*return*/];
                }
                if (this.heartbeatTimeoutId) {
                    clearTimeout(this.heartbeatTimeoutId);
                }
                this.heartbeatId = setTimeout(function () {
                    _this.heartbeatId = null;
                    if (_this.socket) {
                        _this.socket.send(protocol_1.Protocol.Package.encode(protocol_1.Protocol.PackageType.TYPE_HEARTBEAT));
                    }
                    _this.nextHeartbeatTimeout = Date.now() + _this.heartbeatTimeout;
                    _this.heartbeatTimeoutId = setTimeout(function () {
                        if (_this.socket)
                            _this.socket.close(-1, 'heartbeat timeout!');
                    }, _this.heartbeatTimeout);
                }, this.heartbeatInterval);
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.onMessage = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            var msg;
            return __generator(this, function (_a) {
                this.logger.trace('new message', { body: body ? body.length : 0 });
                if (!body) {
                    return [2 /*return*/];
                }
                msg = this._decode(body);
                if (!msg) {
                    return [2 /*return*/];
                }
                if (!msg.id && msg.route) {
                    this.emit(msg.route.toString(), msg.body);
                    return [2 /*return*/];
                }
                if (this.callbacks[msg.id]) {
                    this.callbacks[msg.id].resolve(msg.body);
                    delete this.callbacks[msg.id];
                }
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.onKickout = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            var reason;
            return __generator(this, function (_a) {
                this.logger.trace('kickout by remote server', { body: body ? body.length : 0 });
                if (!body) {
                    return [2 /*return*/];
                }
                reason = JSON.parse(protocol_1.Protocol.strdecode(body));
                this.emit('kickout', reason);
                return [2 /*return*/];
            });
        });
    };
    Session.prototype._encode = function (reqId, route, msg) {
        if (this.clientProtos[route]) {
            msg = protobuf_1.Protobuf.encode(route, msg);
        }
        else {
            msg = protocol_1.Protocol.strencode(JSON.stringify(msg));
        }
        return protocol_1.Protocol.Message.encode(reqId, reqId ? protocol_1.Protocol.MessageType.TYPE_REQUEST : protocol_1.Protocol.MessageType.TYPE_NOTIFY, !!this.dict[route], this.dict[route] ? this.dict[route] : route, msg, false);
    };
    Session.prototype._decode = function (buffer) {
        var _this = this;
        var msg = protocol_1.Protocol.Message.decode(buffer);
        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route) {
                return;
            }
        }
        var canver = function (msg) {
            var route = msg.route;
            //Decompose route from dict
            if (msg.compressRoute) {
                if (!_this.abbrs[route]) {
                    return {};
                }
                route = msg.route = _this.abbrs[route];
            }
            if (_this.serverProtos[route]) {
                return protobuf_1.Protobuf.decode(route, msg.body);
            }
            else {
                return JSON.parse(protocol_1.Protocol.strdecode(msg.body));
            }
        };
        msg.body = canver(msg);
        return msg;
    };
    Session.prototype.auth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.debug('auto');
                        if (!this.opts.auth) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.opts.auth()];
                    case 1:
                        response = _a.sent();
                        if (response) {
                            this.emit('ready', response);
                        }
                        return [2 /*return*/, response];
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return Session;
}(events_1.EventEmitter));
exports.Session = Session;

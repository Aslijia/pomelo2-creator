import { EventEmitter } from 'events'
import * as URLParse from 'url-parse'
import { websocket } from './sockets/websocket'

import { Protobuf } from './protobuf'
import { Protocol } from './protocol'

const JS_WS_CLIENT_TYPE = 'cocos-creator-api'
const JS_WS_CLIENT_VERSION = '0.0.1'

declare interface Socket {
    connected: boolean
    connectting: boolean

    removeAllListeners(): void
    connect(uri: string, protocol?: string, cert?: any): Promise<Socket | undefined>
    send(buffer: Uint8Array): void
    close(code: number, reason: string): void

    on(event: string, listener: (...args: any[]) => void): void
    once(event: string, listener: (...args: any[]) => void): void
}

declare interface Logger {
    trace(message: string, body?: object): void
    info(message: string, body?: object): void
    debug(message: string, body?: object): void
    warn(message: string, body?: object): void
    error(message: string, body?: object): void
    fatal(message: string, body?: object): void
}

declare interface Option {
    auth(): Promise<object | undefined>
    retry?: number
    localstorage: {
        getItem(key: string): any | undefined
        setItem(key: string, value: any, exipre?: number): any
    }
    timeout?: number
    decodeIO?: boolean
    rsa?: string
    usr?: object
    logger?: Logger
    cert?: any
}

const RES_OK = 200
const RES_FAIL = 500
const RES_OLD_CLIENT = 501

class Console implements Logger {
    trace(message: string, body?: object) {
        console.log.call(this, '%c[TRACE] %s:%j', 'color:#87CEEB;', message, body)
    }
    info(message: string, body?: object) {
        console.log.call(this, '%c[INFO] %s:%j', 'color:#228B22;', message, body)
    }
    debug(message: string, body?: object) {
        console.log.call(this, '%c[DEBUG] %s:%j', 'color:#0000FF;', message, body)
    }
    warn(message: string, body?: object) {
        console.log.call(this, '%c[WARN] %s:%j', 'color:#FFD700;', message, body)
    }
    error(message: string, body?: object) {
        console.log.call(this, '%c[ERROR] %s:%j', 'color:#DC143C;', message, body)
    }
    fatal(message: string, body?: object) {
        console.log.call(this, '%c[FATAL] %s:%j', 'color:#9400D3;', message, body)
    }
}

export class Session extends EventEmitter {
    protected id: string = ''
    protected socket: Socket | undefined

    private protoVersion: string = ''
    private serverProtos: any = {}
    private clientProtos: any = {}
    private dict: any = {}
    private routeMap: any = {}
    private abbrs: any = {}

    private heartbeatInterval: number = 0
    private heartbeatTimeout: number = 0
    private nextHeartbeatTimeout: number = 0

    private heartbeatTimeoutId: any = 0
    private heartbeatId: any = 0

    private _remote: URLParse
    private _listeners: { [name: string]: EventEmitter } = {}
    private opts: Option
    private handshakeBuffer: any

    protected retryCounter: number = 0
    protected retryTimer: any = 0

    protected reqId: number = 0
    protected ready: boolean = false
    protected callbacks: {
        [id: string]: { resolve: Function; reject: Function }
    } = {}
    protected logger: Logger

    messagequeue: any[] = []
    _sending: boolean = false
    constructor(uri: string, opts: Option) {
        super()

        this.logger = opts.logger || new Console()
        this.logger.trace('init pomelo', { uri, opts })

        this._remote = new URLParse(uri)
        this.opts = opts

        const protos = opts.localstorage.getItem('protos')
        if (protos) {
            this.protoVersion = protos.version || ''
            this.serverProtos = protos.server || {}
            this.clientProtos = protos.client || {}
            Protobuf.init({
                encoderProtos: this.clientProtos,
                decoderProtos: this.serverProtos
            })
        }

        this.handshakeBuffer = {
            sys: {
                type: JS_WS_CLIENT_TYPE,
                version: JS_WS_CLIENT_VERSION,
                rsa: {},
                protoVersion: this.protoVersion
            },
            user: {}
        }

        this.connect()

        this.on('reconnect', () => {
            if (this.retryCounter > (this.opts.retry || 10)) {
                this.emit('gone', { retryCounter: this.retryCounter })
                return
            }
            this.logger.warn('reconnect', {
                time: (this.retryCounter % 10) + 1,
                retryCounter: this.retryCounter
            })
            this.retryTimer = setTimeout(this.connect.bind(this), ((this.retryCounter % 10) + 1) * 1000)
            this.retryCounter++
        })

        this.on('heartbeat', this.onHeartbeat.bind(this))

        this.on('sendmessage', this._sendmessage.bind(this))
    }

    emit(type: string, ...args: any[]) {
        for (let i in this._listeners) {
            this._listeners[i].emit(type, ...args)
        }
        return super.emit(type, ...args)
    }

    get state() {
        return this.socket && this.socket.connected ? (this.ready ? 2 : 1) : 0
    }

    private async connect() {
        if (this.socket && (this.socket.connectting || this.socket.connected)) {
            this.logger.warn('cant connect 2 remote sever by socket connecing', {
                connectting: this.socket.connectting,
                connected: this.socket.connected
            })
            return
        }

        if (this.socket) {
            this.socket.removeAllListeners()
            delete this.socket
        }

        switch (this._remote.protocol) {
            case 'ws:':
            case 'wss:':
                this.socket = new websocket(this.logger)
                break
            default:
                throw new Error('un support socket protocol!')
        }

        if (!this.socket) {
            throw new Error('create websocket failed')
        }

        this.socket.on('message', this.processPackage.bind(this))
        this.socket.on('closed', () => {
            this.emit('disconnect')
            if (this.socket) {
                this.socket.removeAllListeners()
                delete this.socket
                this.socket = undefined
            }
            this.emit('reconnect')
        })

        this.socket.on('connecting', () => {
            this.emit('connecting', { retryCounter: this.retryCounter })
            this.retryCounter = 0
            if (this.socket) {
                this.socket.send(Protocol.Package.encode(Protocol.PackageType.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer))))
            }
        })

        const protocol = this._remote.protocol.replace(':', '')
        this.socket.connect(this._remote.href, 'pomelo', this.opts.cert)
    }

    when(channel: string, event: string, listener: (...args: any[]) => void) {
        if (!this._listeners[channel]) {
            this._listeners[channel] = new EventEmitter()
        }

        this._listeners[channel].on(event, listener)
    }

    cleanup(channel?: string) {
        if (channel && this._listeners[channel]) {
            this._listeners[channel].removeAllListeners()
            delete this._listeners[channel]
        }
    }

    asyncEvent(event: string, timeout: number = 5000) {
        return new Promise((s, r) => {
            const timer = setTimeout(r, timeout)
            this.once(event, (data: any) => {
                if (timer) {
                    clearTimeout(timer)
                }
                s(data)
            })
        })
    }

    async _sendmessage() {
        if (this._sending) return

        this._sending = true

        if (!this.socket) {
            if (this.retryTimer) clearTimeout(this.retryTimer)
            this.retryTimer = undefined
            await this.connect()
        }
        const msg: { type: string; route: string; body: any; reqid: number } = this.messagequeue.shift()
        if (!this.socket || !msg) return (this._sending = false)

        const body = this._encode(msg.reqid || 0, msg.route, msg.body)
        if (body) this.socket.send(Protocol.Package.encode(Protocol.PackageType.TYPE_DATA, body))

        this._sending = false
        if (this.messagequeue.length) this.emit('sendmessage')
    }

    async request(route: string, body: object) {
        const reqid = ++this.reqId
        this.messagequeue.push({
            type: 'request',
            route,
            body,
            reqid
        })
        this.emit('sendmessage')
        return await new Promise((resolve, reject) => {
            this.callbacks[reqid] = { resolve, reject }
            this.routeMap[reqid] = route
        })
    }

    async notify(route: string, body: object) {
        this.messagequeue.push({
            type: 'notify',
            route,
            body
        })
        this.emit('sendmessage')
    }

    async disconnect(code: number, reason: string) {
        this.logger.debug('disconnect', { code, reason })
        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId)
        }

        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId)
        }

        if (this.socket) {
            this.socket.close(code, reason)
            this.socket = undefined
        }
    }

    private processPackage(buffer: ArrayBuffer) {
        const msgs = Protocol.Package.decode(buffer)
        if (!msgs) {
            if (this.socket) this.socket.close(-1, 'socket read EOF!')
            return
        }

        for (let i in msgs) {
            const msg = msgs[i]
            switch (msg.type) {
                case Protocol.PackageType.TYPE_HANDSHAKE:
                    this.logger.warn('初始化 socket 握手协议!', {})
                    this.onHandshake(msg.body)
                    this.auth()
                    break
                case Protocol.PackageType.TYPE_HEARTBEAT:
                    this.onHeartbeat()
                    break
                case Protocol.PackageType.TYPE_DATA:
                    this.onMessage(msg.body)
                    break
                case Protocol.PackageType.TYPE_KICK:
                    this.onKickout(msg.body)
                    break
                default:
                    this.logger.error('invalid package type', { msg })
                    break
            }
        }
    }

    private onHandshake(body?: Uint8Array | null) {
        this.logger.trace('pomelo 握手协议', { size: body ? body.length : 0 })
        if (!body) {
            this.logger.fatal('handshake failed', {})
            return
        }

        const msg = JSON.parse(Protocol.strdecode(body))
        if (msg.code === RES_OLD_CLIENT) {
            this.emit('error', new Error('invalid version'))
            this.logger.error('pomelo protocol has error', msg)
            return
        }
        if (msg.code !== RES_OK) {
            this.emit('error', new Error('handshake failed'))
            this.logger.error('handshake failed', msg)
        }

        if (msg.sys && msg.sys.heartbeat) {
            this.logger.debug('init heartbeat from remote', {
                heartbeat: msg.sys.heartbeat
            })
            this.heartbeatInterval = msg.sys.heartbeat * 1000 // heartbeat interval

            this.heartbeatTimeout = this.opts.timeout || this.heartbeatInterval * 5 // max heartbeat timeout
        }
        if (msg.sys.id) {
            this.logger.debug('init session id', { id: msg.sys.id })
            this.id = msg.sys.id
        }

        this.dict = msg.sys.dict || {}
        const protos = msg.sys.protos
        //Init compress dict
        if (this.dict) {
            this.abbrs = {}
            for (let route in this.dict) {
                this.abbrs[this.dict[route]] = route
            }
        }

        //Init protobuf protos
        if (protos) {
            this.logger.debug('init protobuf', { protos })
            this.protoVersion = protos.version || 0
            this.serverProtos = protos.server || {}
            this.clientProtos = protos.client || {}
            //Save protobuf protos to localStorage
            this.opts.localstorage.setItem('protos', JSON.stringify(protos))
            Protobuf.init({
                encoderProtos: protos.client,
                decoderProtos: protos.server
            })
        }
        if (this.socket) this.socket.send(Protocol.Package.encode(Protocol.PackageType.TYPE_HANDSHAKE_ACK))
        else this.logger.error('TYPE_HANDSHAKE_ACK failed by socket is gone!', {})
    }

    private onHeartbeat() {
        this.logger.trace('heartbeat', {
            heartbeatId: this.heartbeatId,
            heartbeatInterval: this.heartbeatInterval
        })
        if (!this.heartbeatInterval || this.heartbeatId) {
            return
        }

        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId)
        }

        this.heartbeatId = setTimeout(() => {
            this.heartbeatId = null
            if (this.socket) {
                this.socket.send(Protocol.Package.encode(Protocol.PackageType.TYPE_HEARTBEAT))
            }
            this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout
            this.heartbeatTimeoutId = setTimeout(() => {
                if (this.socket) this.socket.close(-1, 'heartbeat timeout!')
            }, this.heartbeatTimeout)
        }, this.heartbeatInterval)
    }

    private onMessage(body?: Uint8Array | null) {
        this.logger.trace('new message', { body: body ? body.length : 0 })
        if (!body) {
            return
        }

        const msg = this._decode(body)
        if (!msg) {
            return
        }

        if (!msg.id && msg.route) {
            this.emit(msg.route.toString(), msg.body)
            return
        }

        if (this.callbacks[msg.id]) {
            this.callbacks[msg.id].resolve(msg.body)
            delete this.callbacks[msg.id]
        }
    }

    private onKickout(body?: Uint8Array | null) {
        this.logger.trace('kickout by remote server', {
            body: body ? body.length : 0
        })
        if (!body) {
            return
        }
        const reason = JSON.parse(Protocol.strdecode(body))
        this.emit('kickout', reason)
    }

    private _encode(reqId: number, route: string, msg: any) {
        if (this.clientProtos[route]) {
            msg = Protobuf.encode(route, msg)
        } else {
            msg = Protocol.strencode(JSON.stringify(msg))
        }
        return Protocol.Message.encode(
            reqId,
            reqId ? Protocol.MessageType.TYPE_REQUEST : Protocol.MessageType.TYPE_NOTIFY,
            !!this.dict[route],
            this.dict[route] ? this.dict[route] : route,
            msg,
            false
        )
    }

    private _decode(buffer: Uint8Array) {
        const msg = Protocol.Message.decode(buffer)
        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id]
            delete this.routeMap[msg.id]
            if (!msg.route) {
                return
            }
        }

        const canver = (msg: any) => {
            let route = msg.route
            //Decompose route from dict
            if (msg.compressRoute) {
                if (!this.abbrs[route]) {
                    return {}
                }

                route = msg.route = this.abbrs[route]
            }
            if (this.serverProtos[route]) {
                return Protobuf.decode(route, msg.body)
            } else {
                return JSON.parse(Protocol.strdecode(msg.body))
            }
        }

        msg.body = canver(msg)
        return msg
    }

    async auth() {
        if (this.opts.auth) {
            const response = await this.opts.auth()
            this.ready = true
            this.emit('ready', response)
        }
    }
}

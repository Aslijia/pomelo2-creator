function alloc_buffer(n: any) {
    return new Uint8Array(n)
}
export namespace Protocol {
    const PKG_HEAD_BYTES = 4
    const MSG_FLAG_BYTES = 1
    const MSG_ROUTE_CODE_BYTES = 2
    const MSG_ID_MAX_BYTES = 5
    const MSG_ROUTE_LEN_BYTES = 1

    const MSG_ROUTE_CODE_MAX = 0xffff

    const MSG_COMPRESS_ROUTE_MASK = 0x1
    const MSG_COMPRESS_GZIP_MASK = 0x1
    const MSG_COMPRESS_GZIP_ENCODE_MASK = 1 << 4
    const MSG_TYPE_MASK = 0x7

    export enum PackageType {
        TYPE_HANDSHAKE = 1,
        TYPE_HANDSHAKE_ACK = 2,
        TYPE_HEARTBEAT = 3,
        TYPE_DATA = 4,
        TYPE_KICK = 5
    }

    export namespace Package {
        export function encode(type: number, body?: Uint8Array) {
            const length = body ? body.length : 0
            const buffer = alloc_buffer(PKG_HEAD_BYTES + length)
            let index = 0
            buffer[index++] = type & 0xff
            buffer[index++] = (length >> 16) & 0xff
            buffer[index++] = (length >> 8) & 0xff
            buffer[index++] = length & 0xff
            if (body) {
                copyArray(buffer, index, body, 0, length)
            }
            return buffer
        }

        export function decode(buffer: ArrayBuffer) {
            let offset = 0
            let length = 0
            const rs = []
            const bytes = alloc_buffer(buffer)

            while (offset < bytes.length) {
                const type = bytes[offset++]
                length = ((bytes[offset++] << 16) | (bytes[offset++] << 8) | bytes[offset++]) >>> 0
                const body = length ? alloc_buffer(length) : null
                if (body) {
                    copyArray(body, 0, bytes, offset, length)
                }
                offset += length
                rs.push({ type: type, body: body })
            }
            return rs
        }
    }

    export enum MessageType {
        TYPE_REQUEST = 0,
        TYPE_NOTIFY = 1,
        TYPE_RESPONSE = 2,
        TYPE_PUSH = 3
    }

    export namespace Message {
        export function encode(id: number, type: number, compressRoute: boolean, route: any, msg: Uint8Array, compressGzip: boolean) {
            // caculate message max length
            const idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0
            let msgLen = MSG_FLAG_BYTES + idBytes

            if (msgHasRoute(type)) {
                if (compressRoute) {
                    if (typeof route !== 'number') {
                        throw new Error('error flag for number route!')
                    }
                    msgLen += MSG_ROUTE_CODE_BYTES
                } else {
                    msgLen += MSG_ROUTE_LEN_BYTES
                    if (route) {
                        route = strencode(route)
                        if (route.length > 255) {
                            throw new Error('route maxlength is overflow')
                        }
                        msgLen += route.length
                    }
                }
            }

            if (msg) {
                msgLen += msg.length
            }

            const buffer = alloc_buffer(msgLen)
            let offset = 0

            // add flag
            offset = encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip)

            // add message id
            if (msgHasId(type)) {
                offset = encodeMsgId(id, buffer, offset)
            }

            // add route
            if (msgHasRoute(type)) {
                offset = encodeMsgRoute(compressRoute, route, buffer, offset)
            }

            // add body
            if (msg) {
                offset = encodeMsgBody(msg, buffer, offset)
            }

            return buffer
        }

        export function decode(buffer: Uint8Array) {
            const bytes = alloc_buffer(buffer)
            const bytesLen = bytes.length || bytes.byteLength
            let offset = 0,
                id = 0,
                route = null

            // parse flag
            const flag = bytes[offset++]
            const compressRoute = flag & MSG_COMPRESS_ROUTE_MASK
            const type = (flag >> 1) & MSG_TYPE_MASK
            const compressGzip = (flag >> 4) & MSG_COMPRESS_GZIP_MASK

            // parse id
            if (msgHasId(type)) {
                let m = 0,
                    i = 0
                do {
                    m = bytes[offset]
                    id += (m & 0x7f) << (7 * i)
                    offset++
                    i++
                } while (m >= 128)
            }

            // parse route
            if (msgHasRoute(type)) {
                if (compressRoute) {
                    route = (bytes[offset++] << 8) | bytes[offset++]
                } else {
                    const routeLen = bytes[offset++]
                    if (routeLen) {
                        route = alloc_buffer(routeLen)
                        copyArray(route, 0, bytes, offset, routeLen)
                        route = strdecode(route)
                    } else {
                        route = ''
                    }
                    offset += routeLen
                }
            }

            // parse body
            const bodyLen = bytesLen - offset
            const body = alloc_buffer(bodyLen)

            copyArray(body, 0, bytes, offset, bodyLen)

            return {
                id: id,
                type: type,
                compressRoute: compressRoute,
                route: route,
                body: body,
                compressGzip: compressGzip
            }
        }
    }

    export function strencode(str: string) {
        if (typeof Buffer != 'undefined' && typeof window == 'undefined') {
            // encoding defaults to 'utf8'
            return new Buffer(str)
        }

        const byteArray = alloc_buffer(str.length * 3)
        let offset = 0
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i)
            let codes = null
            if (charCode <= 0x7f) {
                codes = [charCode]
            } else if (charCode <= 0x7ff) {
                codes = [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)]
            } else {
                codes = [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)]
            }
            for (var j = 0; j < codes.length; j++) {
                byteArray[offset] = codes[j]
                ++offset
            }
        }
        var _buffer = alloc_buffer(offset)
        copyArray(_buffer, 0, byteArray, 0, offset)
        return _buffer
    }

    export function strdecode(buffer: Uint8Array) {
        if (typeof Buffer != 'undefined' && typeof window == 'undefined') {
            // encoding defaults to 'utf8'
            return buffer.toString()
        }

        const bytes = alloc_buffer(buffer)
        const array = []
        let offset = 0
        let charCode = 0
        let end = bytes.length
        while (offset < end) {
            if (bytes[offset] < 128) {
                charCode = bytes[offset]
                offset += 1
            } else if (bytes[offset] < 224) {
                charCode = ((bytes[offset] & 0x1f) << 6) + (bytes[offset + 1] & 0x3f)
                offset += 2
            } else {
                charCode = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f)
                offset += 3
            }
            array.push(charCode)
        }
        return String.fromCharCode.apply(null, array)
    }

    function copyArray(dest: Uint8Array, doffset: number, src: Uint8Array, soffset: number, length: number) {
        for (var index = 0; index < length; index++) {
            dest[doffset++] = src[soffset++]
        }
    }

    function msgHasId(type: number) {
        return type === MessageType.TYPE_REQUEST || type === MessageType.TYPE_RESPONSE
    }

    function msgHasRoute(type: number) {
        return type === MessageType.TYPE_REQUEST || type === MessageType.TYPE_NOTIFY || type === MessageType.TYPE_PUSH
    }

    function caculateMsgIdBytes(id: number) {
        let len = 0
        do {
            len += 1
            id >>= 7
        } while (id > 0)
        return len
    }

    function encodeMsgFlag(type: number, compressRoute: boolean, buffer: Uint8Array, offset: number, compressGzip: boolean) {
        if (type !== MessageType.TYPE_REQUEST && type !== MessageType.TYPE_NOTIFY && type !== MessageType.TYPE_RESPONSE && type !== MessageType.TYPE_PUSH) {
            throw new Error('unkonw message type: ' + type)
        }

        buffer[offset] = (type << 1) | (compressRoute ? 1 : 0)

        if (compressGzip) {
            buffer[offset] = buffer[offset] | MSG_COMPRESS_GZIP_ENCODE_MASK
        }

        return offset + MSG_FLAG_BYTES
    }

    function encodeMsgId(id: number, buffer: Uint8Array, offset: number) {
        do {
            let tmp = id % 128
            const next = Math.floor(id / 128)

            if (next !== 0) {
                tmp = tmp + 128
            }
            buffer[offset++] = tmp

            id = next
        } while (id !== 0)

        return offset
    }

    function encodeMsgRoute(compressRoute: boolean, route: number | Uint8Array, buffer: Uint8Array, offset: number) {
        if (compressRoute) {
            if (typeof route !== 'number' || route > MSG_ROUTE_CODE_MAX) {
                throw new Error('route number is overflow')
            }

            buffer[offset++] = (route >> 8) & 0xff
            buffer[offset++] = route & 0xff
        } else {
            if (route && typeof route !== 'number') {
                buffer[offset++] = route.length & 0xff
                copyArray(buffer, offset, route, 0, route.length)
                offset += route.length
            } else {
                buffer[offset++] = 0
            }
        }

        return offset
    }

    function encodeMsgBody(msg: Uint8Array, buffer: Uint8Array, offset: number) {
        copyArray(buffer, offset, msg, 0, msg.length)
        return offset + msg.length
    }
}

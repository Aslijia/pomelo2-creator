"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Protocol = void 0;
var Protocol;
(function (Protocol) {
    var PKG_HEAD_BYTES = 4;
    var MSG_FLAG_BYTES = 1;
    var MSG_ROUTE_CODE_BYTES = 2;
    var MSG_ID_MAX_BYTES = 5;
    var MSG_ROUTE_LEN_BYTES = 1;
    var MSG_ROUTE_CODE_MAX = 0xffff;
    var MSG_COMPRESS_ROUTE_MASK = 0x1;
    var MSG_COMPRESS_GZIP_MASK = 0x1;
    var MSG_COMPRESS_GZIP_ENCODE_MASK = 1 << 4;
    var MSG_TYPE_MASK = 0x7;
    var PackageType;
    (function (PackageType) {
        PackageType[PackageType["TYPE_HANDSHAKE"] = 1] = "TYPE_HANDSHAKE";
        PackageType[PackageType["TYPE_HANDSHAKE_ACK"] = 2] = "TYPE_HANDSHAKE_ACK";
        PackageType[PackageType["TYPE_HEARTBEAT"] = 3] = "TYPE_HEARTBEAT";
        PackageType[PackageType["TYPE_DATA"] = 4] = "TYPE_DATA";
        PackageType[PackageType["TYPE_KICK"] = 5] = "TYPE_KICK";
    })(PackageType = Protocol.PackageType || (Protocol.PackageType = {}));
    var Package;
    (function (Package) {
        function encode(type, body) {
            var length = body ? body.length : 0;
            var buffer = new Uint8Array(PKG_HEAD_BYTES + length);
            var index = 0;
            buffer[index++] = type & 0xff;
            buffer[index++] = (length >> 16) & 0xff;
            buffer[index++] = (length >> 8) & 0xff;
            buffer[index++] = length & 0xff;
            if (body) {
                copyArray(buffer, index, body, 0, length);
            }
            return buffer;
        }
        Package.encode = encode;
        ;
        function decode(buffer) {
            var offset = 0;
            var length = 0;
            var rs = [];
            var bytes = new Uint8Array(buffer);
            while (offset < bytes.length) {
                var type = bytes[offset++];
                length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
                var body = length ? new Uint8Array(length) : null;
                if (body) {
                    copyArray(body, 0, bytes, offset, length);
                }
                offset += length;
                rs.push({ 'type': type, 'body': body });
            }
            return rs;
        }
        Package.decode = decode;
        ;
    })(Package = Protocol.Package || (Protocol.Package = {}));
    var MessageType;
    (function (MessageType) {
        MessageType[MessageType["TYPE_REQUEST"] = 0] = "TYPE_REQUEST";
        MessageType[MessageType["TYPE_NOTIFY"] = 1] = "TYPE_NOTIFY";
        MessageType[MessageType["TYPE_RESPONSE"] = 2] = "TYPE_RESPONSE";
        MessageType[MessageType["TYPE_PUSH"] = 3] = "TYPE_PUSH";
    })(MessageType = Protocol.MessageType || (Protocol.MessageType = {}));
    var Message;
    (function (Message) {
        function encode(id, type, compressRoute, route, msg, compressGzip) {
            // caculate message max length
            var idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0;
            var msgLen = MSG_FLAG_BYTES + idBytes;
            var encodeRoute;
            if (msgHasRoute(type)) {
                if (compressRoute) {
                    if (typeof route !== 'number') {
                        throw new Error('error flag for number route!');
                    }
                    msgLen += MSG_ROUTE_CODE_BYTES;
                }
                else {
                    msgLen += MSG_ROUTE_LEN_BYTES;
                    if (typeof route !== 'string') {
                        throw new Error('error flag for string route!');
                    }
                    encodeRoute = strencode(route);
                    if (route.length > 255) {
                        throw new Error('route maxlength is overflow');
                    }
                    msgLen += route.length;
                }
            }
            if (msg) {
                msgLen += msg.length;
            }
            var buffer = new Uint8Array(msgLen);
            var offset = 0;
            // add flag
            offset = encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip);
            // add message id
            if (msgHasId(type)) {
                offset = encodeMsgId(id, buffer, offset);
            }
            // add route
            if (msgHasRoute(type)) {
                //@ts-ignore
                offset = encodeMsgRoute(compressRoute, typeof route === 'number' ? route : encodeRoute, buffer, offset);
            }
            // add body
            if (msg) {
                offset = encodeMsgBody(msg, buffer, offset);
            }
            return buffer;
        }
        Message.encode = encode;
        ;
        function decode(buffer) {
            var bytes = new Uint8Array(buffer);
            var bytesLen = bytes.length || bytes.byteLength;
            var offset = 0, id = 0, route = null;
            // parse flag
            var flag = bytes[offset++];
            var compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
            var type = (flag >> 1) & MSG_TYPE_MASK;
            var compressGzip = (flag >> 4) & MSG_COMPRESS_GZIP_MASK;
            // parse id
            if (msgHasId(type)) {
                var m = 0, i = 0;
                do {
                    m = bytes[offset];
                    id += (m & 0x7f) << (7 * i);
                    offset++;
                    i++;
                } while (m >= 128);
            }
            // parse route
            if (msgHasRoute(type)) {
                if (compressRoute) {
                    route = (bytes[offset++]) << 8 | bytes[offset++];
                }
                else {
                    var routeLen = bytes[offset++];
                    if (routeLen) {
                        route = new Uint8Array(routeLen);
                        copyArray(route, 0, bytes, offset, routeLen);
                        route = strdecode(route);
                    }
                    else {
                        route = '';
                    }
                    offset += routeLen;
                }
            }
            // parse body
            var bodyLen = bytesLen - offset;
            var body = new Uint8Array(bodyLen);
            copyArray(body, 0, bytes, offset, bodyLen);
            return {
                'id': id, 'type': type, 'compressRoute': compressRoute,
                'route': route, 'body': body, 'compressGzip': compressGzip
            };
        }
        Message.decode = decode;
        ;
    })(Message = Protocol.Message || (Protocol.Message = {}));
    function strencode(str) {
        var byteArray = new Uint8Array(str.length * 3);
        var offset = 0;
        for (var i = 0; i < str.length; i++) {
            var charCode = str.charCodeAt(i);
            var codes = null;
            if (charCode <= 0x7f) {
                codes = [charCode];
            }
            else if (charCode <= 0x7ff) {
                codes = [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)];
            }
            else {
                codes = [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)];
            }
            for (var j = 0; j < codes.length; j++) {
                byteArray[offset] = codes[j];
                ++offset;
            }
        }
        var _buffer = new Uint8Array(offset);
        copyArray(_buffer, 0, byteArray, 0, offset);
        return _buffer;
    }
    Protocol.strencode = strencode;
    function strdecode(buffer) {
        var bytes = new Uint8Array(buffer);
        var array = [];
        var offset = 0;
        var charCode = 0;
        var end = bytes.length;
        while (offset < end) {
            if (bytes[offset] < 128) {
                charCode = bytes[offset];
                offset += 1;
            }
            else if (bytes[offset] < 224) {
                charCode = ((bytes[offset] & 0x1f) << 6) + (bytes[offset + 1] & 0x3f);
                offset += 2;
            }
            else {
                charCode = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f);
                offset += 3;
            }
            array.push(charCode);
        }
        return String.fromCharCode.apply(null, array);
    }
    Protocol.strdecode = strdecode;
    function copyArray(dest, doffset, src, soffset, length) {
        for (var index = 0; index < length; index++) {
            dest[doffset++] = src[soffset++];
        }
    }
    ;
    function msgHasId(type) {
        return type === MessageType.TYPE_REQUEST || type === MessageType.TYPE_RESPONSE;
    }
    ;
    function msgHasRoute(type) {
        return type === MessageType.TYPE_REQUEST || type === MessageType.TYPE_NOTIFY || type === MessageType.TYPE_PUSH;
    }
    ;
    function caculateMsgIdBytes(id) {
        var len = 0;
        do {
            len += 1;
            id >>= 7;
        } while (id > 0);
        return len;
    }
    ;
    function encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip) {
        if (type !== MessageType.TYPE_REQUEST && type !== MessageType.TYPE_NOTIFY &&
            type !== MessageType.TYPE_RESPONSE && type !== MessageType.TYPE_PUSH) {
            throw new Error('unkonw message type: ' + type);
        }
        buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);
        if (compressGzip) {
            buffer[offset] = buffer[offset] | MSG_COMPRESS_GZIP_ENCODE_MASK;
        }
        return offset + MSG_FLAG_BYTES;
    }
    ;
    function encodeMsgId(id, buffer, offset) {
        do {
            var tmp = id % 128;
            var next = Math.floor(id / 128);
            if (next !== 0) {
                tmp = tmp + 128;
            }
            buffer[offset++] = tmp;
            id = next;
        } while (id !== 0);
        return offset;
    }
    ;
    function encodeMsgRoute(compressRoute, route, buffer, offset) {
        if (compressRoute) {
            if (typeof route !== 'number' || route > MSG_ROUTE_CODE_MAX) {
                throw new Error('route number is overflow');
            }
            buffer[offset++] = (route >> 8) & 0xff;
            buffer[offset++] = route & 0xff;
        }
        else {
            if (route && typeof route !== 'number') {
                buffer[offset++] = route.length & 0xff;
                copyArray(buffer, offset, route, 0, route.length);
                offset += route.length;
            }
            else {
                buffer[offset++] = 0;
            }
        }
        return offset;
    }
    ;
    function encodeMsgBody(msg, buffer, offset) {
        copyArray(buffer, offset, msg, 0, msg.length);
        return offset + msg.length;
    }
    ;
})(Protocol = exports.Protocol || (exports.Protocol = {}));

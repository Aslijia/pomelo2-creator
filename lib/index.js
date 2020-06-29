"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pomelo = void 0;
const session_1 = require("./session");
var pomelo;
(function (pomelo) {
    function create(uri, opts) {
        return new session_1.Session(uri, opts);
    }
    pomelo.create = create;
})(pomelo = exports.pomelo || (exports.pomelo = {}));

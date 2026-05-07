"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliConnectionPool = void 0;
const kit_1 = require("@solana/kit");
const rpc_1 = require("./rpc");
class CliConnectionPool {
    _rpc;
    _wsRpc;
    _chain;
    _spam;
    constructor(chain) {
        this._chain = chain;
        this._rpc = (0, rpc_1.createCliRpc)(chain);
        this._wsRpc = (0, kit_1.createSolanaRpcSubscriptions)(this.chain.wsEndpoint.url);
        this._spam = chain.name !== 'localnet';
    }
    get chain() {
        return this._chain;
    }
    get rpc() {
        return this._rpc;
    }
    get wsRpc() {
        return this._wsRpc;
    }
    get shouldSpam() {
        return this._spam;
    }
}
exports.CliConnectionPool = CliConnectionPool;
//# sourceMappingURL=CliConnectionPool.js.map
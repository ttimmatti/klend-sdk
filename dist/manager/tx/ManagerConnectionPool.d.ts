import { Rpc, RpcSubscriptions, SolanaRpcApi, SolanaRpcSubscriptionsApi } from '@solana/kit';
import { Chain } from './rpc';
export declare class ManagerConnectionPool {
    private readonly _rpc;
    private readonly _wsRpc;
    private readonly _chain;
    private readonly _spam;
    constructor(chain: Chain);
    get chain(): Chain;
    get rpc(): Rpc<SolanaRpcApi>;
    get wsRpc(): RpcSubscriptions<SolanaRpcSubscriptionsApi>;
    get shouldSpam(): boolean;
}
//# sourceMappingURL=ManagerConnectionPool.d.ts.map
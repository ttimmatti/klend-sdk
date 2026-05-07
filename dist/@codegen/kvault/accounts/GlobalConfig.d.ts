import { Address, GetAccountInfoApi, GetMultipleAccountsApi, Rpc } from "@solana/kit";
import BN from "bn.js";
export interface GlobalConfigFields {
    globalAdmin: Address;
    pendingAdmin: Address;
    withdrawalPenaltyLamports: BN;
    withdrawalPenaltyBps: BN;
    padding: Array<number>;
}
export interface GlobalConfigJSON {
    globalAdmin: string;
    pendingAdmin: string;
    withdrawalPenaltyLamports: string;
    withdrawalPenaltyBps: string;
    padding: Array<number>;
}
export declare class GlobalConfig {
    readonly globalAdmin: Address;
    readonly pendingAdmin: Address;
    readonly withdrawalPenaltyLamports: BN;
    readonly withdrawalPenaltyBps: BN;
    readonly padding: Array<number>;
    static readonly discriminator: Buffer<ArrayBuffer>;
    static readonly layout: import("buffer-layout").Layout<GlobalConfig>;
    constructor(fields: GlobalConfigFields);
    static fetch(rpc: Rpc<GetAccountInfoApi>, address: Address, programId?: Address): Promise<GlobalConfig | null>;
    static fetchMultiple(rpc: Rpc<GetMultipleAccountsApi>, addresses: Address[], programId?: Address): Promise<Array<GlobalConfig | null>>;
    static decode(data: Buffer): GlobalConfig;
    toJSON(): GlobalConfigJSON;
    static fromJSON(obj: GlobalConfigJSON): GlobalConfig;
}
//# sourceMappingURL=GlobalConfig.d.ts.map
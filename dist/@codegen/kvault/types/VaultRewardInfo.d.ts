import BN from "bn.js";
import * as types from "../types";
export interface VaultRewardInfoFields {
    rewardPerSecond: BN;
    lastIssuanceTs: BN;
    /** Rewards available to distribute (topped up but not yet moved to vault.token_available) */
    rewardsAvailable: BN;
    cumulativeRewardsDistributedAnalytics: BN;
    padding: Array<BN>;
}
export interface VaultRewardInfoJSON {
    rewardPerSecond: string;
    lastIssuanceTs: string;
    /** Rewards available to distribute (topped up but not yet moved to vault.token_available) */
    rewardsAvailable: string;
    cumulativeRewardsDistributedAnalytics: string;
    padding: Array<string>;
}
export declare class VaultRewardInfo {
    readonly rewardPerSecond: BN;
    readonly lastIssuanceTs: BN;
    /** Rewards available to distribute (topped up but not yet moved to vault.token_available) */
    readonly rewardsAvailable: BN;
    readonly cumulativeRewardsDistributedAnalytics: BN;
    readonly padding: Array<BN>;
    constructor(fields: VaultRewardInfoFields);
    static layout(property?: string): import("buffer-layout").Layout<unknown>;
    static fromDecoded(obj: any): types.VaultRewardInfo;
    static toEncodable(fields: VaultRewardInfoFields): {
        rewardPerSecond: BN;
        lastIssuanceTs: BN;
        rewardsAvailable: BN;
        cumulativeRewardsDistributedAnalytics: BN;
        padding: BN[];
    };
    toJSON(): VaultRewardInfoJSON;
    static fromJSON(obj: VaultRewardInfoJSON): VaultRewardInfo;
    toEncodable(): {
        rewardPerSecond: BN;
        lastIssuanceTs: BN;
        rewardsAvailable: BN;
        cumulativeRewardsDistributedAnalytics: BN;
        padding: BN[];
    };
}
//# sourceMappingURL=VaultRewardInfo.d.ts.map
import { Address, GetAccountInfoApi, GetMultipleAccountsApi, Rpc } from "@solana/kit";
import BN from "bn.js";
export interface UserStateFields {
    userId: BN;
    farmState: Address;
    owner: Address;
    isFarmDelegated: number;
    padding0: Array<number>;
    rewardsTallyScaled: Array<BN>;
    rewardsIssuedUnclaimed: Array<BN>;
    lastClaimTs: Array<BN>;
    activeStakeScaled: BN;
    pendingDepositStakeScaled: BN;
    pendingDepositStakeTs: BN;
    pendingWithdrawalUnstakeScaled: BN;
    pendingWithdrawalUnstakeTs: BN;
    bump: BN;
    delegatee: Address;
    lastStakeTs: BN;
    padding1: Array<BN>;
}
export interface UserStateJSON {
    userId: string;
    farmState: string;
    owner: string;
    isFarmDelegated: number;
    padding0: Array<number>;
    rewardsTallyScaled: Array<string>;
    rewardsIssuedUnclaimed: Array<string>;
    lastClaimTs: Array<string>;
    activeStakeScaled: string;
    pendingDepositStakeScaled: string;
    pendingDepositStakeTs: string;
    pendingWithdrawalUnstakeScaled: string;
    pendingWithdrawalUnstakeTs: string;
    bump: string;
    delegatee: string;
    lastStakeTs: string;
    padding1: Array<string>;
}
export declare class UserState {
    readonly userId: BN;
    readonly farmState: Address;
    readonly owner: Address;
    readonly isFarmDelegated: number;
    readonly padding0: Array<number>;
    readonly rewardsTallyScaled: Array<BN>;
    readonly rewardsIssuedUnclaimed: Array<BN>;
    readonly lastClaimTs: Array<BN>;
    readonly activeStakeScaled: BN;
    readonly pendingDepositStakeScaled: BN;
    readonly pendingDepositStakeTs: BN;
    readonly pendingWithdrawalUnstakeScaled: BN;
    readonly pendingWithdrawalUnstakeTs: BN;
    readonly bump: BN;
    readonly delegatee: Address;
    readonly lastStakeTs: BN;
    readonly padding1: Array<BN>;
    static readonly discriminator: Buffer<ArrayBuffer>;
    static readonly layout: import("buffer-layout").Layout<UserState>;
    constructor(fields: UserStateFields);
    static fetch(rpc: Rpc<GetAccountInfoApi>, address: Address, programId?: Address): Promise<UserState | null>;
    static fetchMultiple(rpc: Rpc<GetMultipleAccountsApi>, addresses: Address[], programId?: Address): Promise<Array<UserState | null>>;
    static decode(data: Buffer): UserState;
    toJSON(): UserStateJSON;
    static fromJSON(obj: UserStateJSON): UserState;
}
//# sourceMappingURL=UserState.d.ts.map
import * as types from "../types";
import * as borsh from "@coral-xyz/borsh";
export interface PerformanceFeeBpsJSON {
    kind: "PerformanceFeeBps";
}
export declare class PerformanceFeeBps {
    static readonly discriminator = 0;
    static readonly kind = "PerformanceFeeBps";
    readonly discriminator = 0;
    readonly kind = "PerformanceFeeBps";
    toJSON(): PerformanceFeeBpsJSON;
    toEncodable(): {
        PerformanceFeeBps: {};
    };
}
export interface ManagementFeeBpsJSON {
    kind: "ManagementFeeBps";
}
export declare class ManagementFeeBps {
    static readonly discriminator = 1;
    static readonly kind = "ManagementFeeBps";
    readonly discriminator = 1;
    readonly kind = "ManagementFeeBps";
    toJSON(): ManagementFeeBpsJSON;
    toEncodable(): {
        ManagementFeeBps: {};
    };
}
export interface MinDepositAmountJSON {
    kind: "MinDepositAmount";
}
export declare class MinDepositAmount {
    static readonly discriminator = 2;
    static readonly kind = "MinDepositAmount";
    readonly discriminator = 2;
    readonly kind = "MinDepositAmount";
    toJSON(): MinDepositAmountJSON;
    toEncodable(): {
        MinDepositAmount: {};
    };
}
export interface MinWithdrawAmountJSON {
    kind: "MinWithdrawAmount";
}
export declare class MinWithdrawAmount {
    static readonly discriminator = 3;
    static readonly kind = "MinWithdrawAmount";
    readonly discriminator = 3;
    readonly kind = "MinWithdrawAmount";
    toJSON(): MinWithdrawAmountJSON;
    toEncodable(): {
        MinWithdrawAmount: {};
    };
}
export interface MinInvestAmountJSON {
    kind: "MinInvestAmount";
}
export declare class MinInvestAmount {
    static readonly discriminator = 4;
    static readonly kind = "MinInvestAmount";
    readonly discriminator = 4;
    readonly kind = "MinInvestAmount";
    toJSON(): MinInvestAmountJSON;
    toEncodable(): {
        MinInvestAmount: {};
    };
}
export interface MinInvestDelaySlotsJSON {
    kind: "MinInvestDelaySlots";
}
export declare class MinInvestDelaySlots {
    static readonly discriminator = 5;
    static readonly kind = "MinInvestDelaySlots";
    readonly discriminator = 5;
    readonly kind = "MinInvestDelaySlots";
    toJSON(): MinInvestDelaySlotsJSON;
    toEncodable(): {
        MinInvestDelaySlots: {};
    };
}
export interface CrankFundFeePerReserveJSON {
    kind: "CrankFundFeePerReserve";
}
export declare class CrankFundFeePerReserve {
    static readonly discriminator = 6;
    static readonly kind = "CrankFundFeePerReserve";
    readonly discriminator = 6;
    readonly kind = "CrankFundFeePerReserve";
    toJSON(): CrankFundFeePerReserveJSON;
    toEncodable(): {
        CrankFundFeePerReserve: {};
    };
}
export interface PendingVaultAdminJSON {
    kind: "PendingVaultAdmin";
}
export declare class PendingVaultAdmin {
    static readonly discriminator = 7;
    static readonly kind = "PendingVaultAdmin";
    readonly discriminator = 7;
    readonly kind = "PendingVaultAdmin";
    toJSON(): PendingVaultAdminJSON;
    toEncodable(): {
        PendingVaultAdmin: {};
    };
}
export interface NameJSON {
    kind: "Name";
}
export declare class Name {
    static readonly discriminator = 8;
    static readonly kind = "Name";
    readonly discriminator = 8;
    readonly kind = "Name";
    toJSON(): NameJSON;
    toEncodable(): {
        Name: {};
    };
}
export interface LookupTableJSON {
    kind: "LookupTable";
}
export declare class LookupTable {
    static readonly discriminator = 9;
    static readonly kind = "LookupTable";
    readonly discriminator = 9;
    readonly kind = "LookupTable";
    toJSON(): LookupTableJSON;
    toEncodable(): {
        LookupTable: {};
    };
}
export interface FarmJSON {
    kind: "Farm";
}
export declare class Farm {
    static readonly discriminator = 10;
    static readonly kind = "Farm";
    readonly discriminator = 10;
    readonly kind = "Farm";
    toJSON(): FarmJSON;
    toEncodable(): {
        Farm: {};
    };
}
export interface AllocationAdminJSON {
    kind: "AllocationAdmin";
}
export declare class AllocationAdmin {
    static readonly discriminator = 11;
    static readonly kind = "AllocationAdmin";
    readonly discriminator = 11;
    readonly kind = "AllocationAdmin";
    toJSON(): AllocationAdminJSON;
    toEncodable(): {
        AllocationAdmin: {};
    };
}
export interface UnallocatedWeightJSON {
    kind: "UnallocatedWeight";
}
export declare class UnallocatedWeight {
    static readonly discriminator = 12;
    static readonly kind = "UnallocatedWeight";
    readonly discriminator = 12;
    readonly kind = "UnallocatedWeight";
    toJSON(): UnallocatedWeightJSON;
    toEncodable(): {
        UnallocatedWeight: {};
    };
}
export interface UnallocatedTokensCapJSON {
    kind: "UnallocatedTokensCap";
}
export declare class UnallocatedTokensCap {
    static readonly discriminator = 13;
    static readonly kind = "UnallocatedTokensCap";
    readonly discriminator = 13;
    readonly kind = "UnallocatedTokensCap";
    toJSON(): UnallocatedTokensCapJSON;
    toEncodable(): {
        UnallocatedTokensCap: {};
    };
}
export interface WithdrawalPenaltyLamportsJSON {
    kind: "WithdrawalPenaltyLamports";
}
export declare class WithdrawalPenaltyLamports {
    static readonly discriminator = 14;
    static readonly kind = "WithdrawalPenaltyLamports";
    readonly discriminator = 14;
    readonly kind = "WithdrawalPenaltyLamports";
    toJSON(): WithdrawalPenaltyLamportsJSON;
    toEncodable(): {
        WithdrawalPenaltyLamports: {};
    };
}
export interface WithdrawalPenaltyBpsJSON {
    kind: "WithdrawalPenaltyBps";
}
export declare class WithdrawalPenaltyBps {
    static readonly discriminator = 15;
    static readonly kind = "WithdrawalPenaltyBps";
    readonly discriminator = 15;
    readonly kind = "WithdrawalPenaltyBps";
    toJSON(): WithdrawalPenaltyBpsJSON;
    toEncodable(): {
        WithdrawalPenaltyBps: {};
    };
}
export interface FirstLossCapitalFarmJSON {
    kind: "FirstLossCapitalFarm";
}
export declare class FirstLossCapitalFarm {
    static readonly discriminator = 16;
    static readonly kind = "FirstLossCapitalFarm";
    readonly discriminator = 16;
    readonly kind = "FirstLossCapitalFarm";
    toJSON(): FirstLossCapitalFarmJSON;
    toEncodable(): {
        FirstLossCapitalFarm: {};
    };
}
export interface AllowAllocationsInWhitelistedReservesOnlyJSON {
    kind: "AllowAllocationsInWhitelistedReservesOnly";
}
export declare class AllowAllocationsInWhitelistedReservesOnly {
    static readonly discriminator = 17;
    static readonly kind = "AllowAllocationsInWhitelistedReservesOnly";
    readonly discriminator = 17;
    readonly kind = "AllowAllocationsInWhitelistedReservesOnly";
    toJSON(): AllowAllocationsInWhitelistedReservesOnlyJSON;
    toEncodable(): {
        AllowAllocationsInWhitelistedReservesOnly: {};
    };
}
export interface AllowInvestInWhitelistedReservesOnlyJSON {
    kind: "AllowInvestInWhitelistedReservesOnly";
}
export declare class AllowInvestInWhitelistedReservesOnly {
    static readonly discriminator = 18;
    static readonly kind = "AllowInvestInWhitelistedReservesOnly";
    readonly discriminator = 18;
    readonly kind = "AllowInvestInWhitelistedReservesOnly";
    toJSON(): AllowInvestInWhitelistedReservesOnlyJSON;
    toEncodable(): {
        AllowInvestInWhitelistedReservesOnly: {};
    };
}
export interface RewardPerSecondJSON {
    kind: "RewardPerSecond";
}
export declare class RewardPerSecond {
    static readonly discriminator = 19;
    static readonly kind = "RewardPerSecond";
    readonly discriminator = 19;
    readonly kind = "RewardPerSecond";
    toJSON(): RewardPerSecondJSON;
    toEncodable(): {
        RewardPerSecond: {};
    };
}
export declare function fromDecoded(obj: any): types.VaultConfigFieldKind;
export declare function fromJSON(obj: types.VaultConfigFieldJSON): types.VaultConfigFieldKind;
export declare function layout(property?: string): borsh.EnumLayout<unknown>;
//# sourceMappingURL=VaultConfigField.d.ts.map
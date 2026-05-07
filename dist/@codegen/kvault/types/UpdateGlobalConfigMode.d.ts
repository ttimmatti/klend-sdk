import { Address } from "@solana/kit";
import BN from "bn.js";
import * as types from "../types";
import * as borsh from "@coral-xyz/borsh";
export type PendingAdminFields = [Address];
export type PendingAdminValue = [Address];
export interface PendingAdminJSON {
    kind: "PendingAdmin";
    value: [string];
}
export declare class PendingAdmin {
    static readonly discriminator = 0;
    static readonly kind = "PendingAdmin";
    readonly discriminator = 0;
    readonly kind = "PendingAdmin";
    readonly value: PendingAdminValue;
    constructor(value: PendingAdminFields);
    toJSON(): PendingAdminJSON;
    toEncodable(): {
        PendingAdmin: {
            _0: Address;
        };
    };
}
export type MinWithdrawalPenaltyLamportsFields = [BN];
export type MinWithdrawalPenaltyLamportsValue = [BN];
export interface MinWithdrawalPenaltyLamportsJSON {
    kind: "MinWithdrawalPenaltyLamports";
    value: [string];
}
export declare class MinWithdrawalPenaltyLamports {
    static readonly discriminator = 1;
    static readonly kind = "MinWithdrawalPenaltyLamports";
    readonly discriminator = 1;
    readonly kind = "MinWithdrawalPenaltyLamports";
    readonly value: MinWithdrawalPenaltyLamportsValue;
    constructor(value: MinWithdrawalPenaltyLamportsFields);
    toJSON(): MinWithdrawalPenaltyLamportsJSON;
    toEncodable(): {
        MinWithdrawalPenaltyLamports: {
            _0: BN;
        };
    };
}
export type MinWithdrawalPenaltyBPSFields = [BN];
export type MinWithdrawalPenaltyBPSValue = [BN];
export interface MinWithdrawalPenaltyBPSJSON {
    kind: "MinWithdrawalPenaltyBPS";
    value: [string];
}
export declare class MinWithdrawalPenaltyBPS {
    static readonly discriminator = 2;
    static readonly kind = "MinWithdrawalPenaltyBPS";
    readonly discriminator = 2;
    readonly kind = "MinWithdrawalPenaltyBPS";
    readonly value: MinWithdrawalPenaltyBPSValue;
    constructor(value: MinWithdrawalPenaltyBPSFields);
    toJSON(): MinWithdrawalPenaltyBPSJSON;
    toEncodable(): {
        MinWithdrawalPenaltyBPS: {
            _0: BN;
        };
    };
}
export declare function fromDecoded(obj: any): types.UpdateKVaultGlobalConfigModeKind;
export declare function fromJSON(obj: types.UpdateKVaultGlobalConfigModeJSON): types.UpdateKVaultGlobalConfigModeKind;
export declare function layout(property?: string): borsh.EnumLayout<unknown>;
//# sourceMappingURL=UpdateGlobalConfigMode.d.ts.map
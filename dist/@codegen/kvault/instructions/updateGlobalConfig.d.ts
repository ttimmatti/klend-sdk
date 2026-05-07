import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import * as types from "../types";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface UpdateGlobalConfigArgs {
    update: types.UpdateKVaultGlobalConfigModeKind;
}
export interface UpdateKVaultGlobalConfigAccounts {
    globalAdmin: TransactionSigner;
    globalConfig: Address;
}
export declare const layout: import("buffer-layout").Layout<unknown>;
export declare function updateGlobalConfig(args: UpdateGlobalConfigArgs, accounts: UpdateKVaultGlobalConfigAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=updateGlobalConfig.d.ts.map
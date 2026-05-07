import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import * as types from "../types";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface AddUpdateWhitelistedReserveArgs {
    update: types.UpdateReserveWhitelistModeKind;
}
export interface AddUpdateWhitelistedReserveAccounts {
    globalAdmin: TransactionSigner;
    globalConfig: Address;
    reserve: Address;
    reserveWhitelistEntry: Address;
    systemProgram: Address;
}
export declare const layout: import("buffer-layout").Layout<unknown>;
export declare function addUpdateWhitelistedReserve(args: AddUpdateWhitelistedReserveArgs, accounts: AddUpdateWhitelistedReserveAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=addUpdateWhitelistedReserve.d.ts.map
import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import BN from "bn.js";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface RedeemInKindArgs {
    sharesAmount: BN;
}
export interface RedeemInKindAccounts {
    user: TransactionSigner;
    vaultState: Address;
    globalConfig: Address;
    baseVaultAuthority: Address;
    reserve: Address;
    ctokenVault: Address;
    userCtokenTa: Address;
    ctokenMint: Address;
    userSharesTa: Address;
    sharesMint: Address;
    reserveCollateralTokenProgram: Address;
    sharesTokenProgram: Address;
    klendProgram: Address;
    eventAuthority: Address;
    program: Address;
}
export declare const layout: import("buffer-layout").Layout<RedeemInKindArgs>;
export declare function redeemInKind(args: RedeemInKindArgs, accounts: RedeemInKindAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=redeemInKind.d.ts.map
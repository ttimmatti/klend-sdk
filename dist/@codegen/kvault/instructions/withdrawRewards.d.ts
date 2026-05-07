import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import BN from "bn.js";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface WithdrawRewardsArgs {
    amount: BN;
}
export interface WithdrawRewardsAccounts {
    vaultAdminAuthority: TransactionSigner;
    vaultState: Address;
    tokenMint: Address;
    tokenVault: Address;
    baseVaultAuthority: Address;
    withdrawTokenAccount: Address;
    tokenProgram: Address;
}
export declare const layout: import("buffer-layout").Layout<WithdrawRewardsArgs>;
export declare function withdrawRewards(args: WithdrawRewardsArgs, accounts: WithdrawRewardsAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=withdrawRewards.d.ts.map
import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import BN from "bn.js";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface TopupRewardsArgs {
    amount: BN;
}
export interface TopupRewardsAccounts {
    payer: TransactionSigner;
    vaultState: Address;
    tokenMint: Address;
    tokenVault: Address;
    payerTokenTa: Address;
    tokenProgram: Address;
}
export declare const layout: import("buffer-layout").Layout<TopupRewardsArgs>;
export declare function topupRewards(args: TopupRewardsArgs, accounts: TopupRewardsAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=topupRewards.d.ts.map
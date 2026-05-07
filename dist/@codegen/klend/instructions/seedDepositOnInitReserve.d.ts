import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface SeedDepositOnInitReserveAccounts {
    signer: TransactionSigner;
    lendingMarket: Address;
    reserve: Address;
    reserveLiquidityMint: Address;
    reserveLiquiditySupply: Address;
    initialLiquiditySource: Address;
    liquidityTokenProgram: Address;
}
export declare function seedDepositOnInitReserve(accounts: SeedDepositOnInitReserveAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=seedDepositOnInitReserve.d.ts.map
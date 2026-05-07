import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import BN from "bn.js";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface SellArgs {
    sharesAmount: BN;
}
export interface SellAccounts {
    withdrawFromAvailable: {
        user: TransactionSigner;
        vaultState: Address;
        globalConfig: Address;
        tokenVault: Address;
        baseVaultAuthority: Address;
        userTokenAta: Address;
        tokenMint: Address;
        userSharesAta: Address;
        sharesMint: Address;
        tokenProgram: Address;
        sharesTokenProgram: Address;
        klendProgram: Address;
        eventAuthority: Address;
        program: Address;
    };
    withdrawFromReserveAccounts: {
        vaultState: Address;
        reserve: Address;
        ctokenVault: Address;
        lendingMarket: Address;
        lendingMarketAuthority: Address;
        reserveLiquiditySupply: Address;
        reserveCollateralMint: Address;
        reserveCollateralTokenProgram: Address;
        instructionSysvarAccount: Address;
    };
    eventAuthority: Address;
    program: Address;
}
export declare const layout: import("buffer-layout").Layout<SellArgs>;
export declare function sell(args: SellArgs, accounts: SellAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=sell.d.ts.map
import { Address, AccountMeta, AccountSignerMeta, Instruction, Option, TransactionSigner } from "@solana/kit";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface FillBorrowOrderAccounts {
    borrowAccounts: {
        payer: TransactionSigner;
        /** The obligation with a [BorrowOrder]. */
        obligation: Address;
        /** The [Self::obligation]'s market - needed for borrowing-related configuration. */
        lendingMarket: Address;
        /** The [Self::lending_market]'s authority, needed to transfer the newly-borrowed funds out of the [Self::reserve_source_liquidity]. */
        lendingMarketAuthority: Address;
        /** The reserve to borrow from.  Its mint must match the asset requested by the [BorrowOrder::debt_liquidity_mint]. */
        borrowReserve: Address;
        /** The mint of [Self::borrow_reserve] - needed to execute the transfer. */
        borrowReserveLiquidityMint: Address;
        /** The vault of [Self::borrow_reserve], from which the funds are transferred. */
        reserveSourceLiquidity: Address;
        /** The fee vault of [Self::borrow_reserve], to which the fees are transferred. */
        borrowReserveLiquidityFeeReceiver: Address;
        /** The destination token account that should receive the newly borrowed funds.  It must match [BorrowOrder::filled_debt_destination], owner and mint.  **Warning:** An altered destination account will prevent an order from being filled. */
        userDestinationLiquidity: Address;
        /** The referrer's account, for accumulating fees - needed if the [Obligation::has_referrer]. */
        referrerTokenState: Option<Address>;
        /** The token program of [Self::borrow_reserve] - needed to execute the transfer. */
        tokenProgram: Address;
    };
    farmsAccounts: {
        obligationFarmUserState: Option<Address>;
        reserveFarmState: Option<Address>;
    };
    farmsProgram: Address;
    eventAuthority: Address;
    program: Address;
}
export declare function fillBorrowOrder(accounts: FillBorrowOrderAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=fillBorrowOrder.d.ts.map
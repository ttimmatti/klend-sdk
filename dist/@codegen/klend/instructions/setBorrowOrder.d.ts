import { Address, AccountMeta, AccountSignerMeta, Instruction, TransactionSigner } from "@solana/kit";
import BN from "bn.js";
import * as types from "../types";
export declare const DISCRIMINATOR: Buffer<ArrayBuffer>;
export interface SetBorrowOrderArgs {
    orderConfig: types.BorrowOrderConfigArgsFields;
    minExpectedCurrentRemainingDebtAmount: BN;
}
export interface SetBorrowOrderAccounts {
    /** The [Self::obligation]'s owner. */
    owner: TransactionSigner;
    /** The obligation to set the [BorrowOrder] on. */
    obligation: Address;
    /** The [Self::obligation]'s market - needed only to validate the borrow orders' feature flag. */
    lendingMarket: Address;
    /**
     * The [BorrowOrder::filled_debt_destination] to set on order creation. Not editable on order
     * updates.
     * Ignored when cancelling the order.
     */
    filledDebtDestination: Address;
    /**
     * The [BorrowOrder::debt_liquidity_mint] to set on order creation. Not editable on order
     * updates.
     * Ignored when cancelling the order.
     */
    debtLiquidityMint: Address;
    eventAuthority: Address;
    program: Address;
}
export declare const layout: import("buffer-layout").Layout<SetBorrowOrderArgs>;
export declare function setBorrowOrder(args: SetBorrowOrderArgs, accounts: SetBorrowOrderAccounts, remainingAccounts?: Array<AccountMeta | AccountSignerMeta>, programAddress?: Address): Instruction<string, readonly (AccountMeta<string> | import("@solana/kit").AccountLookupMeta<string, string>)[]>;
//# sourceMappingURL=setBorrowOrder.d.ts.map
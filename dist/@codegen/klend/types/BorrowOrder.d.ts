import { Address } from "@solana/kit";
import BN from "bn.js";
import * as types from "../types";
export interface BorrowOrderFields {
    /**
     * The asset to be borrowed.
     * The reserves used for [Obligation::borrows] *must* all provide exactly this asset.
     */
    debtLiquidityMint: Address;
    /** The amount of debt that still needs to be filled, in lamports. */
    remainingDebtAmount: BN;
    /**
     * The token account owned by the [Obligation::owner] and holding [Self::debt_liquidity_mint],
     * where the filled funds should be transferred to.
     */
    filledDebtDestination: Address;
    /**
     * The minimum allowed debt term that the obligation owner agrees to.
     * The reserves used to fill this order *cannot* define their debt term *lower* than this.
     *
     * If zeroed, then only indefinite-term reserves may be used.
     */
    minDebtTermSeconds: BN;
    /** The time until which the borrow order can still be filled. */
    fillableUntilTimestamp: BN;
    /**
     * The time at which this order was placed.
     * Currently, this is only a piece of metadata.
     */
    placedAtTimestamp: BN;
    /**
     * The time at which this order was most-recently updated (including: created).
     * Currently, this is only a piece of metadata.
     */
    lastUpdatedAtTimestamp: BN;
    /**
     * The amount of debt that was originally requested when this order was most-recently updated.
     * In other words: this field holds a value of [Self::remaining_debt_amount] captured at
     * [Self::last_updated_at_timestamp].
     * Currently, this is only a piece of metadata.
     */
    requestedDebtAmount: BN;
    /**
     * The maximum borrow rate that the obligation owner agrees to.
     * The reserves used for [Obligation::borrows] *cannot* define their maximum borrow rate
     * *higher* than this.
     */
    maxBorrowRateBps: number;
    /** Alignment padding. */
    padding1: Array<number>;
    /** End padding. */
    endPadding: Array<BN>;
}
export interface BorrowOrderJSON {
    /**
     * The asset to be borrowed.
     * The reserves used for [Obligation::borrows] *must* all provide exactly this asset.
     */
    debtLiquidityMint: string;
    /** The amount of debt that still needs to be filled, in lamports. */
    remainingDebtAmount: string;
    /**
     * The token account owned by the [Obligation::owner] and holding [Self::debt_liquidity_mint],
     * where the filled funds should be transferred to.
     */
    filledDebtDestination: string;
    /**
     * The minimum allowed debt term that the obligation owner agrees to.
     * The reserves used to fill this order *cannot* define their debt term *lower* than this.
     *
     * If zeroed, then only indefinite-term reserves may be used.
     */
    minDebtTermSeconds: string;
    /** The time until which the borrow order can still be filled. */
    fillableUntilTimestamp: string;
    /**
     * The time at which this order was placed.
     * Currently, this is only a piece of metadata.
     */
    placedAtTimestamp: string;
    /**
     * The time at which this order was most-recently updated (including: created).
     * Currently, this is only a piece of metadata.
     */
    lastUpdatedAtTimestamp: string;
    /**
     * The amount of debt that was originally requested when this order was most-recently updated.
     * In other words: this field holds a value of [Self::remaining_debt_amount] captured at
     * [Self::last_updated_at_timestamp].
     * Currently, this is only a piece of metadata.
     */
    requestedDebtAmount: string;
    /**
     * The maximum borrow rate that the obligation owner agrees to.
     * The reserves used for [Obligation::borrows] *cannot* define their maximum borrow rate
     * *higher* than this.
     */
    maxBorrowRateBps: number;
    /** Alignment padding. */
    padding1: Array<number>;
    /** End padding. */
    endPadding: Array<string>;
}
/**
 * A borrow order.
 *
 * When the [Obligation::borrow_order] is populated (i.e. non-zeroed) on an Obligation, then the
 * permissionless "fill" operations may borrow liquidity to the owner according to this
 * specification.
 */
export declare class BorrowOrder {
    /**
     * The asset to be borrowed.
     * The reserves used for [Obligation::borrows] *must* all provide exactly this asset.
     */
    readonly debtLiquidityMint: Address;
    /** The amount of debt that still needs to be filled, in lamports. */
    readonly remainingDebtAmount: BN;
    /**
     * The token account owned by the [Obligation::owner] and holding [Self::debt_liquidity_mint],
     * where the filled funds should be transferred to.
     */
    readonly filledDebtDestination: Address;
    /**
     * The minimum allowed debt term that the obligation owner agrees to.
     * The reserves used to fill this order *cannot* define their debt term *lower* than this.
     *
     * If zeroed, then only indefinite-term reserves may be used.
     */
    readonly minDebtTermSeconds: BN;
    /** The time until which the borrow order can still be filled. */
    readonly fillableUntilTimestamp: BN;
    /**
     * The time at which this order was placed.
     * Currently, this is only a piece of metadata.
     */
    readonly placedAtTimestamp: BN;
    /**
     * The time at which this order was most-recently updated (including: created).
     * Currently, this is only a piece of metadata.
     */
    readonly lastUpdatedAtTimestamp: BN;
    /**
     * The amount of debt that was originally requested when this order was most-recently updated.
     * In other words: this field holds a value of [Self::remaining_debt_amount] captured at
     * [Self::last_updated_at_timestamp].
     * Currently, this is only a piece of metadata.
     */
    readonly requestedDebtAmount: BN;
    /**
     * The maximum borrow rate that the obligation owner agrees to.
     * The reserves used for [Obligation::borrows] *cannot* define their maximum borrow rate
     * *higher* than this.
     */
    readonly maxBorrowRateBps: number;
    /** Alignment padding. */
    readonly padding1: Array<number>;
    /** End padding. */
    readonly endPadding: Array<BN>;
    constructor(fields: BorrowOrderFields);
    static layout(property?: string): import("buffer-layout").Layout<unknown>;
    static fromDecoded(obj: any): types.BorrowOrder;
    static toEncodable(fields: BorrowOrderFields): {
        debtLiquidityMint: Address;
        remainingDebtAmount: BN;
        filledDebtDestination: Address;
        minDebtTermSeconds: BN;
        fillableUntilTimestamp: BN;
        placedAtTimestamp: BN;
        lastUpdatedAtTimestamp: BN;
        requestedDebtAmount: BN;
        maxBorrowRateBps: number;
        padding1: number[];
        endPadding: BN[];
    };
    toJSON(): BorrowOrderJSON;
    static fromJSON(obj: BorrowOrderJSON): BorrowOrder;
    toEncodable(): {
        debtLiquidityMint: Address;
        remainingDebtAmount: BN;
        filledDebtDestination: Address;
        minDebtTermSeconds: BN;
        fillableUntilTimestamp: BN;
        placedAtTimestamp: BN;
        lastUpdatedAtTimestamp: BN;
        requestedDebtAmount: BN;
        maxBorrowRateBps: number;
        padding1: number[];
        endPadding: BN[];
    };
}
//# sourceMappingURL=BorrowOrder.d.ts.map
import BN from "bn.js";
import * as types from "../types";
export interface BorrowOrderConfigArgsFields {
    remainingDebtAmount: BN;
    maxBorrowRateBps: number;
    minDebtTermSeconds: BN;
    fillableUntilTimestamp: BN;
}
export interface BorrowOrderConfigArgsJSON {
    remainingDebtAmount: string;
    maxBorrowRateBps: number;
    minDebtTermSeconds: string;
    fillableUntilTimestamp: string;
}
/** A subset of [BorrowOrderConfig] excluding the accounts passed via [SetBorrowOrder]. */
export declare class BorrowOrderConfigArgs {
    readonly remainingDebtAmount: BN;
    readonly maxBorrowRateBps: number;
    readonly minDebtTermSeconds: BN;
    readonly fillableUntilTimestamp: BN;
    constructor(fields: BorrowOrderConfigArgsFields);
    static layout(property?: string): import("buffer-layout").Layout<unknown>;
    static fromDecoded(obj: any): types.BorrowOrderConfigArgs;
    static toEncodable(fields: BorrowOrderConfigArgsFields): {
        remainingDebtAmount: BN;
        maxBorrowRateBps: number;
        minDebtTermSeconds: BN;
        fillableUntilTimestamp: BN;
    };
    toJSON(): BorrowOrderConfigArgsJSON;
    static fromJSON(obj: BorrowOrderConfigArgsJSON): BorrowOrderConfigArgs;
    toEncodable(): {
        remainingDebtAmount: BN;
        maxBorrowRateBps: number;
        minDebtTermSeconds: BN;
        fillableUntilTimestamp: BN;
    };
}
//# sourceMappingURL=BorrowOrderConfigArgs.d.ts.map
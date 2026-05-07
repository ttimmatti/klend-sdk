"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BorrowOrder = void 0;
const kit_1 = require("@solana/kit"); // eslint-disable-line @typescript-eslint/no-unused-vars
const bn_js_1 = __importDefault(require("bn.js")); // eslint-disable-line @typescript-eslint/no-unused-vars
const borsh = __importStar(require("@coral-xyz/borsh"));
const utils_1 = require("../utils");
/**
 * A borrow order.
 *
 * When the [Obligation::borrow_order] is populated (i.e. non-zeroed) on an Obligation, then the
 * permissionless "fill" operations may borrow liquidity to the owner according to this
 * specification.
 */
class BorrowOrder {
    /**
     * The asset to be borrowed.
     * The reserves used for [Obligation::borrows] *must* all provide exactly this asset.
     */
    debtLiquidityMint;
    /** The amount of debt that still needs to be filled, in lamports. */
    remainingDebtAmount;
    /**
     * The token account owned by the [Obligation::owner] and holding [Self::debt_liquidity_mint],
     * where the filled funds should be transferred to.
     */
    filledDebtDestination;
    /**
     * The minimum allowed debt term that the obligation owner agrees to.
     * The reserves used to fill this order *cannot* define their debt term *lower* than this.
     *
     * If zeroed, then only indefinite-term reserves may be used.
     */
    minDebtTermSeconds;
    /** The time until which the borrow order can still be filled. */
    fillableUntilTimestamp;
    /**
     * The time at which this order was placed.
     * Currently, this is only a piece of metadata.
     */
    placedAtTimestamp;
    /**
     * The time at which this order was most-recently updated (including: created).
     * Currently, this is only a piece of metadata.
     */
    lastUpdatedAtTimestamp;
    /**
     * The amount of debt that was originally requested when this order was most-recently updated.
     * In other words: this field holds a value of [Self::remaining_debt_amount] captured at
     * [Self::last_updated_at_timestamp].
     * Currently, this is only a piece of metadata.
     */
    requestedDebtAmount;
    /**
     * The maximum borrow rate that the obligation owner agrees to.
     * The reserves used for [Obligation::borrows] *cannot* define their maximum borrow rate
     * *higher* than this.
     */
    maxBorrowRateBps;
    /** Alignment padding. */
    padding1;
    /** End padding. */
    endPadding;
    constructor(fields) {
        this.debtLiquidityMint = fields.debtLiquidityMint;
        this.remainingDebtAmount = fields.remainingDebtAmount;
        this.filledDebtDestination = fields.filledDebtDestination;
        this.minDebtTermSeconds = fields.minDebtTermSeconds;
        this.fillableUntilTimestamp = fields.fillableUntilTimestamp;
        this.placedAtTimestamp = fields.placedAtTimestamp;
        this.lastUpdatedAtTimestamp = fields.lastUpdatedAtTimestamp;
        this.requestedDebtAmount = fields.requestedDebtAmount;
        this.maxBorrowRateBps = fields.maxBorrowRateBps;
        this.padding1 = fields.padding1;
        this.endPadding = fields.endPadding;
    }
    static layout(property) {
        return borsh.struct([
            (0, utils_1.borshAddress)("debtLiquidityMint"),
            borsh.u64("remainingDebtAmount"),
            (0, utils_1.borshAddress)("filledDebtDestination"),
            borsh.u64("minDebtTermSeconds"),
            borsh.u64("fillableUntilTimestamp"),
            borsh.u64("placedAtTimestamp"),
            borsh.u64("lastUpdatedAtTimestamp"),
            borsh.u64("requestedDebtAmount"),
            borsh.u32("maxBorrowRateBps"),
            borsh.array(borsh.u8(), 4, "padding1"),
            borsh.array(borsh.u64(), 5, "endPadding"),
        ], property);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromDecoded(obj) {
        return new BorrowOrder({
            debtLiquidityMint: obj.debtLiquidityMint,
            remainingDebtAmount: obj.remainingDebtAmount,
            filledDebtDestination: obj.filledDebtDestination,
            minDebtTermSeconds: obj.minDebtTermSeconds,
            fillableUntilTimestamp: obj.fillableUntilTimestamp,
            placedAtTimestamp: obj.placedAtTimestamp,
            lastUpdatedAtTimestamp: obj.lastUpdatedAtTimestamp,
            requestedDebtAmount: obj.requestedDebtAmount,
            maxBorrowRateBps: obj.maxBorrowRateBps,
            padding1: obj.padding1,
            endPadding: obj.endPadding,
        });
    }
    static toEncodable(fields) {
        return {
            debtLiquidityMint: fields.debtLiquidityMint,
            remainingDebtAmount: fields.remainingDebtAmount,
            filledDebtDestination: fields.filledDebtDestination,
            minDebtTermSeconds: fields.minDebtTermSeconds,
            fillableUntilTimestamp: fields.fillableUntilTimestamp,
            placedAtTimestamp: fields.placedAtTimestamp,
            lastUpdatedAtTimestamp: fields.lastUpdatedAtTimestamp,
            requestedDebtAmount: fields.requestedDebtAmount,
            maxBorrowRateBps: fields.maxBorrowRateBps,
            padding1: fields.padding1,
            endPadding: fields.endPadding,
        };
    }
    toJSON() {
        return {
            debtLiquidityMint: this.debtLiquidityMint,
            remainingDebtAmount: this.remainingDebtAmount.toString(),
            filledDebtDestination: this.filledDebtDestination,
            minDebtTermSeconds: this.minDebtTermSeconds.toString(),
            fillableUntilTimestamp: this.fillableUntilTimestamp.toString(),
            placedAtTimestamp: this.placedAtTimestamp.toString(),
            lastUpdatedAtTimestamp: this.lastUpdatedAtTimestamp.toString(),
            requestedDebtAmount: this.requestedDebtAmount.toString(),
            maxBorrowRateBps: this.maxBorrowRateBps,
            padding1: this.padding1,
            endPadding: this.endPadding.map((item) => item.toString()),
        };
    }
    static fromJSON(obj) {
        return new BorrowOrder({
            debtLiquidityMint: (0, kit_1.address)(obj.debtLiquidityMint),
            remainingDebtAmount: new bn_js_1.default(obj.remainingDebtAmount),
            filledDebtDestination: (0, kit_1.address)(obj.filledDebtDestination),
            minDebtTermSeconds: new bn_js_1.default(obj.minDebtTermSeconds),
            fillableUntilTimestamp: new bn_js_1.default(obj.fillableUntilTimestamp),
            placedAtTimestamp: new bn_js_1.default(obj.placedAtTimestamp),
            lastUpdatedAtTimestamp: new bn_js_1.default(obj.lastUpdatedAtTimestamp),
            requestedDebtAmount: new bn_js_1.default(obj.requestedDebtAmount),
            maxBorrowRateBps: obj.maxBorrowRateBps,
            padding1: obj.padding1,
            endPadding: obj.endPadding.map((item) => new bn_js_1.default(item)),
        });
    }
    toEncodable() {
        return BorrowOrder.toEncodable(this);
    }
}
exports.BorrowOrder = BorrowOrder;
//# sourceMappingURL=BorrowOrder.js.map
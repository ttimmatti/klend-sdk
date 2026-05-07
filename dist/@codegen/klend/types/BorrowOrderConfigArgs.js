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
exports.BorrowOrderConfigArgs = void 0;
const bn_js_1 = __importDefault(require("bn.js")); // eslint-disable-line @typescript-eslint/no-unused-vars
const borsh = __importStar(require("@coral-xyz/borsh"));
/** A subset of [BorrowOrderConfig] excluding the accounts passed via [SetBorrowOrder]. */
class BorrowOrderConfigArgs {
    remainingDebtAmount;
    maxBorrowRateBps;
    minDebtTermSeconds;
    fillableUntilTimestamp;
    constructor(fields) {
        this.remainingDebtAmount = fields.remainingDebtAmount;
        this.maxBorrowRateBps = fields.maxBorrowRateBps;
        this.minDebtTermSeconds = fields.minDebtTermSeconds;
        this.fillableUntilTimestamp = fields.fillableUntilTimestamp;
    }
    static layout(property) {
        return borsh.struct([
            borsh.u64("remainingDebtAmount"),
            borsh.u32("maxBorrowRateBps"),
            borsh.u64("minDebtTermSeconds"),
            borsh.u64("fillableUntilTimestamp"),
        ], property);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromDecoded(obj) {
        return new BorrowOrderConfigArgs({
            remainingDebtAmount: obj.remainingDebtAmount,
            maxBorrowRateBps: obj.maxBorrowRateBps,
            minDebtTermSeconds: obj.minDebtTermSeconds,
            fillableUntilTimestamp: obj.fillableUntilTimestamp,
        });
    }
    static toEncodable(fields) {
        return {
            remainingDebtAmount: fields.remainingDebtAmount,
            maxBorrowRateBps: fields.maxBorrowRateBps,
            minDebtTermSeconds: fields.minDebtTermSeconds,
            fillableUntilTimestamp: fields.fillableUntilTimestamp,
        };
    }
    toJSON() {
        return {
            remainingDebtAmount: this.remainingDebtAmount.toString(),
            maxBorrowRateBps: this.maxBorrowRateBps,
            minDebtTermSeconds: this.minDebtTermSeconds.toString(),
            fillableUntilTimestamp: this.fillableUntilTimestamp.toString(),
        };
    }
    static fromJSON(obj) {
        return new BorrowOrderConfigArgs({
            remainingDebtAmount: new bn_js_1.default(obj.remainingDebtAmount),
            maxBorrowRateBps: obj.maxBorrowRateBps,
            minDebtTermSeconds: new bn_js_1.default(obj.minDebtTermSeconds),
            fillableUntilTimestamp: new bn_js_1.default(obj.fillableUntilTimestamp),
        });
    }
    toEncodable() {
        return BorrowOrderConfigArgs.toEncodable(this);
    }
}
exports.BorrowOrderConfigArgs = BorrowOrderConfigArgs;
//# sourceMappingURL=BorrowOrderConfigArgs.js.map
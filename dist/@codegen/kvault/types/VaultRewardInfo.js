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
exports.VaultRewardInfo = void 0;
const bn_js_1 = __importDefault(require("bn.js")); // eslint-disable-line @typescript-eslint/no-unused-vars
const borsh = __importStar(require("@coral-xyz/borsh"));
class VaultRewardInfo {
    rewardPerSecond;
    lastIssuanceTs;
    /** Rewards available to distribute (topped up but not yet moved to vault.token_available) */
    rewardsAvailable;
    cumulativeRewardsDistributedAnalytics;
    padding;
    constructor(fields) {
        this.rewardPerSecond = fields.rewardPerSecond;
        this.lastIssuanceTs = fields.lastIssuanceTs;
        this.rewardsAvailable = fields.rewardsAvailable;
        this.cumulativeRewardsDistributedAnalytics =
            fields.cumulativeRewardsDistributedAnalytics;
        this.padding = fields.padding;
    }
    static layout(property) {
        return borsh.struct([
            borsh.u64("rewardPerSecond"),
            borsh.u64("lastIssuanceTs"),
            borsh.u64("rewardsAvailable"),
            borsh.u64("cumulativeRewardsDistributedAnalytics"),
            borsh.array(borsh.u64(), 8, "padding"),
        ], property);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromDecoded(obj) {
        return new VaultRewardInfo({
            rewardPerSecond: obj.rewardPerSecond,
            lastIssuanceTs: obj.lastIssuanceTs,
            rewardsAvailable: obj.rewardsAvailable,
            cumulativeRewardsDistributedAnalytics: obj.cumulativeRewardsDistributedAnalytics,
            padding: obj.padding,
        });
    }
    static toEncodable(fields) {
        return {
            rewardPerSecond: fields.rewardPerSecond,
            lastIssuanceTs: fields.lastIssuanceTs,
            rewardsAvailable: fields.rewardsAvailable,
            cumulativeRewardsDistributedAnalytics: fields.cumulativeRewardsDistributedAnalytics,
            padding: fields.padding,
        };
    }
    toJSON() {
        return {
            rewardPerSecond: this.rewardPerSecond.toString(),
            lastIssuanceTs: this.lastIssuanceTs.toString(),
            rewardsAvailable: this.rewardsAvailable.toString(),
            cumulativeRewardsDistributedAnalytics: this.cumulativeRewardsDistributedAnalytics.toString(),
            padding: this.padding.map((item) => item.toString()),
        };
    }
    static fromJSON(obj) {
        return new VaultRewardInfo({
            rewardPerSecond: new bn_js_1.default(obj.rewardPerSecond),
            lastIssuanceTs: new bn_js_1.default(obj.lastIssuanceTs),
            rewardsAvailable: new bn_js_1.default(obj.rewardsAvailable),
            cumulativeRewardsDistributedAnalytics: new bn_js_1.default(obj.cumulativeRewardsDistributedAnalytics),
            padding: obj.padding.map((item) => new bn_js_1.default(item)),
        });
    }
    toEncodable() {
        return VaultRewardInfo.toEncodable(this);
    }
}
exports.VaultRewardInfo = VaultRewardInfo;
//# sourceMappingURL=VaultRewardInfo.js.map
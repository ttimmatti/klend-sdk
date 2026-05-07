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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReserveWhitelistEntry = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const kit_1 = require("@solana/kit");
const borsh = __importStar(require("@coral-xyz/borsh")); // eslint-disable-line @typescript-eslint/no-unused-vars
const utils_1 = require("../utils"); // eslint-disable-line @typescript-eslint/no-unused-vars
const programId_1 = require("../programId");
class ReserveWhitelistEntry {
    /**
     * The token mint is stored to solve the problem of finding all the whitelisted reserves for a particular token mint:
     * when storing the token mint inside the PDA, finding all the whitelisted reserves becomes a `getProgramAccounts` with
     * a filter on discriminator + the mint field
     * The reserve pubkey, as seed of the reserve whitelist PDA account, it stored so you can link back the PDA to its seeds
     * (for instance, in the operation above we easily find the reserve corresponding to the PDA)
     */
    tokenMint;
    reserve;
    whitelistAddAllocation;
    whitelistInvest;
    padding;
    static discriminator = Buffer.from([
        135, 130, 156, 210, 58, 58, 91, 170,
    ]);
    static layout = borsh.struct([
        (0, utils_1.borshAddress)("tokenMint"),
        (0, utils_1.borshAddress)("reserve"),
        borsh.u8("whitelistAddAllocation"),
        borsh.u8("whitelistInvest"),
        borsh.array(borsh.u8(), 62, "padding"),
    ]);
    constructor(fields) {
        this.tokenMint = fields.tokenMint;
        this.reserve = fields.reserve;
        this.whitelistAddAllocation = fields.whitelistAddAllocation;
        this.whitelistInvest = fields.whitelistInvest;
        this.padding = fields.padding;
    }
    static async fetch(rpc, address, programId = programId_1.PROGRAM_ID) {
        const info = await (0, kit_1.fetchEncodedAccount)(rpc, address);
        if (!info.exists) {
            return null;
        }
        if (info.programAddress !== programId) {
            throw new Error(`ReserveWhitelistEntryFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`);
        }
        return this.decode(Buffer.from(info.data));
    }
    static async fetchMultiple(rpc, addresses, programId = programId_1.PROGRAM_ID) {
        const infos = await (0, kit_1.fetchEncodedAccounts)(rpc, addresses);
        return infos.map((info) => {
            if (!info.exists) {
                return null;
            }
            if (info.programAddress !== programId) {
                throw new Error(`ReserveWhitelistEntryFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`);
            }
            return this.decode(Buffer.from(info.data));
        });
    }
    static decode(data) {
        if (!data.slice(0, 8).equals(ReserveWhitelistEntry.discriminator)) {
            throw new Error("invalid account discriminator");
        }
        const dec = ReserveWhitelistEntry.layout.decode(data.slice(8));
        return new ReserveWhitelistEntry({
            tokenMint: dec.tokenMint,
            reserve: dec.reserve,
            whitelistAddAllocation: dec.whitelistAddAllocation,
            whitelistInvest: dec.whitelistInvest,
            padding: dec.padding,
        });
    }
    toJSON() {
        return {
            tokenMint: this.tokenMint,
            reserve: this.reserve,
            whitelistAddAllocation: this.whitelistAddAllocation,
            whitelistInvest: this.whitelistInvest,
            padding: this.padding,
        };
    }
    static fromJSON(obj) {
        return new ReserveWhitelistEntry({
            tokenMint: (0, kit_1.address)(obj.tokenMint),
            reserve: (0, kit_1.address)(obj.reserve),
            whitelistAddAllocation: obj.whitelistAddAllocation,
            whitelistInvest: obj.whitelistInvest,
            padding: obj.padding,
        });
    }
}
exports.ReserveWhitelistEntry = ReserveWhitelistEntry;
//# sourceMappingURL=ReserveWhitelistEntry.js.map
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
exports.MinWithdrawalPenaltyBPS = exports.MinWithdrawalPenaltyLamports = exports.PendingAdmin = void 0;
exports.fromDecoded = fromDecoded;
exports.fromJSON = fromJSON;
exports.layout = layout;
const kit_1 = require("@solana/kit"); // eslint-disable-line @typescript-eslint/no-unused-vars
const bn_js_1 = __importDefault(require("bn.js")); // eslint-disable-line @typescript-eslint/no-unused-vars
const borsh = __importStar(require("@coral-xyz/borsh"));
const utils_1 = require("../utils");
class PendingAdmin {
    static discriminator = 0;
    static kind = "PendingAdmin";
    discriminator = 0;
    kind = "PendingAdmin";
    value;
    constructor(value) {
        this.value = [value[0]];
    }
    toJSON() {
        return {
            kind: "PendingAdmin",
            value: [this.value[0]],
        };
    }
    toEncodable() {
        return {
            PendingAdmin: {
                _0: this.value[0],
            },
        };
    }
}
exports.PendingAdmin = PendingAdmin;
class MinWithdrawalPenaltyLamports {
    static discriminator = 1;
    static kind = "MinWithdrawalPenaltyLamports";
    discriminator = 1;
    kind = "MinWithdrawalPenaltyLamports";
    value;
    constructor(value) {
        this.value = [value[0]];
    }
    toJSON() {
        return {
            kind: "MinWithdrawalPenaltyLamports",
            value: [this.value[0].toString()],
        };
    }
    toEncodable() {
        return {
            MinWithdrawalPenaltyLamports: {
                _0: this.value[0],
            },
        };
    }
}
exports.MinWithdrawalPenaltyLamports = MinWithdrawalPenaltyLamports;
class MinWithdrawalPenaltyBPS {
    static discriminator = 2;
    static kind = "MinWithdrawalPenaltyBPS";
    discriminator = 2;
    kind = "MinWithdrawalPenaltyBPS";
    value;
    constructor(value) {
        this.value = [value[0]];
    }
    toJSON() {
        return {
            kind: "MinWithdrawalPenaltyBPS",
            value: [this.value[0].toString()],
        };
    }
    toEncodable() {
        return {
            MinWithdrawalPenaltyBPS: {
                _0: this.value[0],
            },
        };
    }
}
exports.MinWithdrawalPenaltyBPS = MinWithdrawalPenaltyBPS;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDecoded(obj) {
    if (typeof obj !== "object") {
        throw new Error("Invalid enum object");
    }
    if ("PendingAdmin" in obj) {
        const val = obj["PendingAdmin"];
        return new PendingAdmin([val["_0"]]);
    }
    if ("MinWithdrawalPenaltyLamports" in obj) {
        const val = obj["MinWithdrawalPenaltyLamports"];
        return new MinWithdrawalPenaltyLamports([val["_0"]]);
    }
    if ("MinWithdrawalPenaltyBPS" in obj) {
        const val = obj["MinWithdrawalPenaltyBPS"];
        return new MinWithdrawalPenaltyBPS([val["_0"]]);
    }
    throw new Error("Invalid enum object");
}
function fromJSON(obj) {
    switch (obj.kind) {
        case "PendingAdmin": {
            return new PendingAdmin([(0, kit_1.address)(obj.value[0])]);
        }
        case "MinWithdrawalPenaltyLamports": {
            return new MinWithdrawalPenaltyLamports([new bn_js_1.default(obj.value[0])]);
        }
        case "MinWithdrawalPenaltyBPS": {
            return new MinWithdrawalPenaltyBPS([new bn_js_1.default(obj.value[0])]);
        }
    }
}
function layout(property) {
    const ret = borsh.rustEnum([
        borsh.struct([(0, utils_1.borshAddress)("_0")], "PendingAdmin"),
        borsh.struct([borsh.u64("_0")], "MinWithdrawalPenaltyLamports"),
        borsh.struct([borsh.u64("_0")], "MinWithdrawalPenaltyBPS"),
    ]);
    if (property !== undefined) {
        return ret.replicate(property);
    }
    return ret;
}
//# sourceMappingURL=UpdateGlobalConfigMode.js.map
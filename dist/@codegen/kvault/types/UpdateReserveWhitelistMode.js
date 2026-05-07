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
exports.AddAllocation = exports.Invest = void 0;
exports.fromDecoded = fromDecoded;
exports.fromJSON = fromJSON;
exports.layout = layout;
const borsh = __importStar(require("@coral-xyz/borsh"));
class Invest {
    static discriminator = 0;
    static kind = "Invest";
    discriminator = 0;
    kind = "Invest";
    value;
    constructor(value) {
        this.value = [value[0]];
    }
    toJSON() {
        return {
            kind: "Invest",
            value: [this.value[0]],
        };
    }
    toEncodable() {
        return {
            Invest: {
                _0: this.value[0],
            },
        };
    }
}
exports.Invest = Invest;
class AddAllocation {
    static discriminator = 1;
    static kind = "AddAllocation";
    discriminator = 1;
    kind = "AddAllocation";
    value;
    constructor(value) {
        this.value = [value[0]];
    }
    toJSON() {
        return {
            kind: "AddAllocation",
            value: [this.value[0]],
        };
    }
    toEncodable() {
        return {
            AddAllocation: {
                _0: this.value[0],
            },
        };
    }
}
exports.AddAllocation = AddAllocation;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDecoded(obj) {
    if (typeof obj !== "object") {
        throw new Error("Invalid enum object");
    }
    if ("Invest" in obj) {
        const val = obj["Invest"];
        return new Invest([val["_0"]]);
    }
    if ("AddAllocation" in obj) {
        const val = obj["AddAllocation"];
        return new AddAllocation([val["_0"]]);
    }
    throw new Error("Invalid enum object");
}
function fromJSON(obj) {
    switch (obj.kind) {
        case "Invest": {
            return new Invest([obj.value[0]]);
        }
        case "AddAllocation": {
            return new AddAllocation([obj.value[0]]);
        }
    }
}
function layout(property) {
    const ret = borsh.rustEnum([
        borsh.struct([borsh.u8("_0")], "Invest"),
        borsh.struct([borsh.u8("_0")], "AddAllocation"),
    ]);
    if (property !== undefined) {
        return ret.replicate(property);
    }
    return ret;
}
//# sourceMappingURL=UpdateReserveWhitelistMode.js.map
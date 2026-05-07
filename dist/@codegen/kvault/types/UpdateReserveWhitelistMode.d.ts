import * as types from "../types";
import * as borsh from "@coral-xyz/borsh";
export type InvestFields = [number];
export type InvestValue = [number];
export interface InvestJSON {
    kind: "Invest";
    value: [number];
}
export declare class Invest {
    static readonly discriminator = 0;
    static readonly kind = "Invest";
    readonly discriminator = 0;
    readonly kind = "Invest";
    readonly value: InvestValue;
    constructor(value: InvestFields);
    toJSON(): InvestJSON;
    toEncodable(): {
        Invest: {
            _0: number;
        };
    };
}
export type AddAllocationFields = [number];
export type AddAllocationValue = [number];
export interface AddAllocationJSON {
    kind: "AddAllocation";
    value: [number];
}
export declare class AddAllocation {
    static readonly discriminator = 1;
    static readonly kind = "AddAllocation";
    readonly discriminator = 1;
    readonly kind = "AddAllocation";
    readonly value: AddAllocationValue;
    constructor(value: AddAllocationFields);
    toJSON(): AddAllocationJSON;
    toEncodable(): {
        AddAllocation: {
            _0: number;
        };
    };
}
export declare function fromDecoded(obj: any): types.UpdateReserveWhitelistModeKind;
export declare function fromJSON(obj: types.UpdateReserveWhitelistModeJSON): types.UpdateReserveWhitelistModeKind;
export declare function layout(property?: string): borsh.EnumLayout<unknown>;
//# sourceMappingURL=UpdateReserveWhitelistMode.d.ts.map
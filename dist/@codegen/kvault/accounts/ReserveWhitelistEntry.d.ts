import { Address, GetAccountInfoApi, GetMultipleAccountsApi, Rpc } from "@solana/kit";
export interface ReserveWhitelistEntryFields {
    /**
     * The token mint is stored to solve the problem of finding all the whitelisted reserves for a particular token mint:
     * when storing the token mint inside the PDA, finding all the whitelisted reserves becomes a `getProgramAccounts` with
     * a filter on discriminator + the mint field
     * The reserve pubkey, as seed of the reserve whitelist PDA account, it stored so you can link back the PDA to its seeds
     * (for instance, in the operation above we easily find the reserve corresponding to the PDA)
     */
    tokenMint: Address;
    reserve: Address;
    whitelistAddAllocation: number;
    whitelistInvest: number;
    padding: Array<number>;
}
export interface ReserveWhitelistEntryJSON {
    /**
     * The token mint is stored to solve the problem of finding all the whitelisted reserves for a particular token mint:
     * when storing the token mint inside the PDA, finding all the whitelisted reserves becomes a `getProgramAccounts` with
     * a filter on discriminator + the mint field
     * The reserve pubkey, as seed of the reserve whitelist PDA account, it stored so you can link back the PDA to its seeds
     * (for instance, in the operation above we easily find the reserve corresponding to the PDA)
     */
    tokenMint: string;
    reserve: string;
    whitelistAddAllocation: number;
    whitelistInvest: number;
    padding: Array<number>;
}
export declare class ReserveWhitelistEntry {
    /**
     * The token mint is stored to solve the problem of finding all the whitelisted reserves for a particular token mint:
     * when storing the token mint inside the PDA, finding all the whitelisted reserves becomes a `getProgramAccounts` with
     * a filter on discriminator + the mint field
     * The reserve pubkey, as seed of the reserve whitelist PDA account, it stored so you can link back the PDA to its seeds
     * (for instance, in the operation above we easily find the reserve corresponding to the PDA)
     */
    readonly tokenMint: Address;
    readonly reserve: Address;
    readonly whitelistAddAllocation: number;
    readonly whitelistInvest: number;
    readonly padding: Array<number>;
    static readonly discriminator: Buffer<ArrayBuffer>;
    static readonly layout: import("buffer-layout").Layout<ReserveWhitelistEntry>;
    constructor(fields: ReserveWhitelistEntryFields);
    static fetch(rpc: Rpc<GetAccountInfoApi>, address: Address, programId?: Address): Promise<ReserveWhitelistEntry | null>;
    static fetchMultiple(rpc: Rpc<GetMultipleAccountsApi>, addresses: Address[], programId?: Address): Promise<Array<ReserveWhitelistEntry | null>>;
    static decode(data: Buffer): ReserveWhitelistEntry;
    toJSON(): ReserveWhitelistEntryJSON;
    static fromJSON(obj: ReserveWhitelistEntryJSON): ReserveWhitelistEntry;
}
//# sourceMappingURL=ReserveWhitelistEntry.d.ts.map
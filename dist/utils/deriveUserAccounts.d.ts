import { Address } from '@solana/kit';
export type DeriveReserveInfo = {
    address: Address;
    mint: Address;
    cTokenMint: Address;
    farmCollateral: Address;
    farmDebt: Address;
};
type MintPair = {
    coll: Address;
    debt: Address;
    obligationPda?: Address;
};
export type DeriveUserAccountsParams = {
    wallet: Address;
    /** KLend-specific context. Omit if tx doesn't touch KLend. */
    klend?: {
        market: Address;
        programId: Address;
        reservesInfo: DeriveReserveInfo[];
        multiplyMints?: MintPair[];
        leverageMints?: MintPair[];
        referrer?: Address;
    };
    /**
     * Extra mints to derive ATAs for — strategy shares, vault shares, swap tokens,
     * or any other token the user holds. These generate user ATAs automatically.
     */
    additionalMints?: Address[];
};
/**
 * Deterministically derives all user-specific accounts for a Kamino transaction.
 * Pass the result as `userAccounts` to POST /luts/find-minimal.
 * Over-deriving is safe — the API only uses userAccounts to filter uncovered addresses.
 */
export declare function deriveUserAccounts(params: DeriveUserAccountsParams): Promise<Address[]>;
export {};
//# sourceMappingURL=deriveUserAccounts.d.ts.map
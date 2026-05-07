/**
 * CDN data structure containing Kamino resources for different networks
 */
export interface AllKaminoCdnData {
    'mainnet-beta': KaminoCdnData;
    devnet: KaminoCdnData;
}
/**
 * Kamino CDN data structure
 * This type can be extended with additional fields as needed
 */
export interface KaminoCdnData {
    /**
     * List of deprecated reserve addresses (pubkeys as strings)
     * Note: This field is named 'deprecatedAssets' in the CDN but represents deprecated reserves
     */
    deprecatedAssets: string[];
    [key: string]: unknown;
}
/**
 * Fetches Kamino CDN data from the resources endpoint
 * @returns Promise resolving to the CDN data for the specified cluster or undefined if fetching/parsing fails
 */
export declare function fetchKaminoCdnData(): Promise<KaminoCdnData | undefined>;
//# sourceMappingURL=readCdnData.d.ts.map
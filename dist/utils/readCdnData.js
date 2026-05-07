"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchKaminoCdnData = fetchKaminoCdnData;
const constants_1 = require("./constants");
/**
 * Fetches Kamino CDN data from the resources endpoint
 * @returns Promise resolving to the CDN data for the specified cluster or undefined if fetching/parsing fails
 */
async function fetchKaminoCdnData() {
    const url = `${constants_1.CDN_ENDPOINT}/resources.json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return data['mainnet-beta'];
        }
        catch (parseError) {
            throw new Error('Invalid JSON in response');
        }
    }
    catch (error) {
        return undefined;
    }
}
//# sourceMappingURL=readCdnData.js.map
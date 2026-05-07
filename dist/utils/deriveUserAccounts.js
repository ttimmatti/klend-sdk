"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveUserAccounts = deriveUserAccounts;
const ata_1 = require("./ata");
const seeds_1 = require("./seeds");
const pubkey_1 = require("./pubkey");
const ObligationType_1 = require("./ObligationType");
/**
 * Deterministically derives all user-specific accounts for a Kamino transaction.
 * Pass the result as `userAccounts` to POST /luts/find-minimal.
 * Over-deriving is safe — the API only uses userAccounts to filter uncovered addresses.
 */
async function deriveUserAccounts(params) {
    const { wallet, klend, additionalMints = [] } = params;
    // Run additional ATAs and klend derivation in parallel
    const [additionalAtas, klendAddresses] = await Promise.all([
        Promise.all(additionalMints.map((mint) => (0, ata_1.getAssociatedTokenAddress)(mint, wallet))),
        klend ? deriveKlendUserAccounts(klend, wallet) : Promise.resolve([]),
    ]);
    const addresses = new Set([wallet, ...additionalAtas, ...klendAddresses]);
    return [...addresses];
}
async function deriveKlendUserAccounts(klend, wallet) {
    const { market, programId, reservesInfo, multiplyMints = [], leverageMints = [], referrer } = klend;
    // User metadata + vanilla obligation in parallel
    const [[userMetadata], vanillaObligationPda] = await Promise.all([
        (0, seeds_1.userMetadataPda)(wallet, programId),
        new ObligationType_1.VanillaObligation(programId).toPda(market, wallet),
    ]);
    // Per-reserve: all derivations in a single Promise.all
    const reservePromises = reservesInfo.map(async (reserve) => {
        const promises = [
            (0, ata_1.getAssociatedTokenAddress)(reserve.mint, wallet),
            (0, ata_1.getAssociatedTokenAddress)(reserve.cTokenMint, wallet),
            new ObligationType_1.LendingObligation(reserve.mint, programId).toPda(market, wallet),
        ];
        if ((0, pubkey_1.isNotNullPubkey)(reserve.farmCollateral)) {
            promises.push((0, seeds_1.obligationFarmStatePda)(reserve.farmCollateral, vanillaObligationPda));
        }
        if ((0, pubkey_1.isNotNullPubkey)(reserve.farmDebt)) {
            promises.push((0, seeds_1.obligationFarmStatePda)(reserve.farmDebt, vanillaObligationPda));
        }
        if (referrer && referrer !== pubkey_1.DEFAULT_PUBLIC_KEY) {
            promises.push((0, seeds_1.referrerTokenStatePda)(referrer, reserve.address, programId));
        }
        return Promise.all(promises);
    });
    // Shared helper for multiply/leverage — same structure, different obligation type
    const deriveObligationWithFarms = async (ObligationType, coll, debt, precomputedPda) => {
        const obligationPda = precomputedPda ?? (await new ObligationType(coll, debt, programId).toPda(market, wallet));
        const collReserve = reservesInfo.find((r) => r.mint === coll);
        const debtReserve = reservesInfo.find((r) => r.mint === debt);
        const farmPromises = [];
        if (collReserve && (0, pubkey_1.isNotNullPubkey)(collReserve.farmCollateral)) {
            farmPromises.push((0, seeds_1.obligationFarmStatePda)(collReserve.farmCollateral, obligationPda));
        }
        if (debtReserve && (0, pubkey_1.isNotNullPubkey)(debtReserve.farmDebt)) {
            farmPromises.push((0, seeds_1.obligationFarmStatePda)(debtReserve.farmDebt, obligationPda));
        }
        return [obligationPda, ...(await Promise.all(farmPromises))];
    };
    const multiplyPromises = multiplyMints.map(({ coll, debt, obligationPda }) => deriveObligationWithFarms(ObligationType_1.MultiplyObligation, coll, debt, obligationPda));
    const leveragePromises = leverageMints.map(({ coll, debt, obligationPda }) => deriveObligationWithFarms(ObligationType_1.LeverageObligation, coll, debt, obligationPda));
    const allResults = await Promise.all([...reservePromises, ...multiplyPromises, ...leveragePromises]);
    return [userMetadata, vanillaObligationPda, ...allResults.flat()];
}
//# sourceMappingURL=deriveUserAccounts.js.map
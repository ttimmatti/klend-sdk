"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarket = getMarket;
const classes_1 = require("../../classes");
async function getMarket(rpc, marketAddress, programId) {
    const kaminoMarket = await classes_1.KaminoMarket.load(rpc, marketAddress, classes_1.DEFAULT_RECENT_SLOT_DURATION_MS, programId);
    if (kaminoMarket === null) {
        throw new Error(`${programId.toString()} Kamino market ${marketAddress} not found`);
    }
    return kaminoMarket;
}
//# sourceMappingURL=market.js.map
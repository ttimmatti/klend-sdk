"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printReserve = printReserve;
const market_1 = require("../services/market");
const kit_1 = require("@solana/kit");
async function printReserve(rpc, marketAddress, programId, reserve, symbol) {
    const kaminoMarket = await (0, market_1.getMarket)(rpc, marketAddress, programId);
    const result = reserve
        ? kaminoMarket.getReserveByAddress((0, kit_1.address)(reserve))
        : kaminoMarket.getReserveBySymbol(symbol);
    console.log(result);
    console.log(result?.stats?.reserveDepositLimit.toString());
}
//# sourceMappingURL=printReserve.js.map
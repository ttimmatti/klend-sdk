"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCRIMINATOR = void 0;
exports.seedDepositOnInitReserve = seedDepositOnInitReserve;
const programId_1 = require("../programId");
exports.DISCRIMINATOR = Buffer.from([
    254, 197, 228, 118, 183, 206, 62, 226,
]);
function seedDepositOnInitReserve(accounts, remainingAccounts = [], programAddress = programId_1.PROGRAM_ID) {
    const keys = [
        { address: accounts.signer.address, role: 2, signer: accounts.signer },
        { address: accounts.lendingMarket, role: 0 },
        { address: accounts.reserve, role: 1 },
        { address: accounts.reserveLiquidityMint, role: 0 },
        { address: accounts.reserveLiquiditySupply, role: 1 },
        { address: accounts.initialLiquiditySource, role: 1 },
        { address: accounts.liquidityTokenProgram, role: 0 },
        ...remainingAccounts,
    ];
    const data = exports.DISCRIMINATOR;
    const ix = { accounts: keys, programAddress, data };
    return ix;
}
//# sourceMappingURL=seedDepositOnInitReserve.js.map
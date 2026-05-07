"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCRIMINATOR = void 0;
exports.fillBorrowOrder = fillBorrowOrder;
/* eslint-disable @typescript-eslint/no-unused-vars */
const kit_1 = require("@solana/kit");
const programId_1 = require("../programId");
exports.DISCRIMINATOR = Buffer.from([102, 4, 167, 76, 131, 170, 93, 19]);
function fillBorrowOrder(accounts, remainingAccounts = [], programAddress = programId_1.PROGRAM_ID) {
    const keys = [
        {
            address: accounts.borrowAccounts.payer.address,
            role: 2,
            signer: accounts.borrowAccounts.payer,
        },
        { address: accounts.borrowAccounts.obligation, role: 1 },
        { address: accounts.borrowAccounts.lendingMarket, role: 0 },
        { address: accounts.borrowAccounts.lendingMarketAuthority, role: 0 },
        { address: accounts.borrowAccounts.borrowReserve, role: 1 },
        { address: accounts.borrowAccounts.borrowReserveLiquidityMint, role: 0 },
        { address: accounts.borrowAccounts.reserveSourceLiquidity, role: 1 },
        {
            address: accounts.borrowAccounts.borrowReserveLiquidityFeeReceiver,
            role: 1,
        },
        { address: accounts.borrowAccounts.userDestinationLiquidity, role: 1 },
        (0, kit_1.isSome)(accounts.borrowAccounts.referrerTokenState)
            ? { address: accounts.borrowAccounts.referrerTokenState.value, role: 1 }
            : { address: programAddress, role: 0 },
        { address: accounts.borrowAccounts.tokenProgram, role: 0 },
        (0, kit_1.isSome)(accounts.farmsAccounts.obligationFarmUserState)
            ? {
                address: accounts.farmsAccounts.obligationFarmUserState.value,
                role: 1,
            }
            : { address: programAddress, role: 0 },
        (0, kit_1.isSome)(accounts.farmsAccounts.reserveFarmState)
            ? { address: accounts.farmsAccounts.reserveFarmState.value, role: 1 }
            : { address: programAddress, role: 0 },
        { address: accounts.farmsProgram, role: 0 },
        { address: accounts.eventAuthority, role: 0 },
        { address: accounts.program, role: 0 },
        ...remainingAccounts,
    ];
    const data = exports.DISCRIMINATOR;
    const ix = { accounts: keys, programAddress, data };
    return ix;
}
//# sourceMappingURL=fillBorrowOrder.js.map
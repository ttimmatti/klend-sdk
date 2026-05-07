"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deposit = deposit;
const utils_1 = require("../../utils");
const classes_1 = require("../../classes");
const scope_sdk_1 = require("@kamino-finance/scope-sdk");
const market_1 = require("../services/market");
const processor_1 = require("../tx/processor");
async function deposit(env, mode, token, depositAmount, marketAddress) {
    const signer = await env.getSigner();
    const kaminoMarket = await (0, market_1.getMarket)(env.c.rpc, marketAddress, env.klendProgramId);
    const scope = new scope_sdk_1.Scope(env.cluster, env.c.rpc);
    const kaminoAction = await classes_1.KaminoAction.buildDepositTxns(kaminoMarket, depositAmount, kaminoMarket.getReserveBySymbol(token).getLiquidityMint(), signer, new utils_1.VanillaObligation(marketAddress), true, { scope, scopeConfigurations: await scope.getAllConfigurations() });
    console.log('User obligation', await kaminoAction.getObligationPda());
    console.log('Deposit SetupIxs:', kaminoAction.setupIxsLabels);
    console.log('Deposit LendingIxs:', kaminoAction.lendingIxsLabels);
    console.log('Deposit CleanupIxs:', kaminoAction.cleanupIxsLabels);
    await (0, processor_1.processTx)(env.c, signer, classes_1.KaminoAction.actionToIxs(kaminoAction), mode);
}
//# sourceMappingURL=deposit.js.map
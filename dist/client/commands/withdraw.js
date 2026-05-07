"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdraw = withdraw;
const utils_1 = require("../../utils");
const classes_1 = require("../../classes");
const scope_sdk_1 = require("@kamino-finance/scope-sdk");
const market_1 = require("../services/market");
const processor_1 = require("../tx/processor");
async function withdraw(env, mode, token, withdrawAmount, marketAddress) {
    const signer = await env.getSigner();
    const kaminoMarket = await (0, market_1.getMarket)(env.c.rpc, marketAddress, env.klendProgramId);
    const scope = new scope_sdk_1.Scope(env.cluster, env.c.rpc);
    const kaminoAction = await classes_1.KaminoAction.buildWithdrawTxns(kaminoMarket, withdrawAmount, kaminoMarket.getReserveBySymbol(token).getLiquidityMint(), signer, new utils_1.VanillaObligation(marketAddress), true, { scope, scopeConfigurations: await scope.getAllConfigurations() });
    console.log('User obligation', await kaminoAction.getObligationPda());
    console.log('Withdraw SetupIxs:', kaminoAction.setupIxsLabels);
    console.log('Withdraw LendingIxs:', kaminoAction.lendingIxsLabels);
    console.log('Withdraw CleanupIxs:', kaminoAction.cleanupIxsLabels);
    await (0, processor_1.processTx)(env.c, signer, classes_1.KaminoAction.actionToIxs(kaminoAction), mode);
}
//# sourceMappingURL=withdraw.js.map
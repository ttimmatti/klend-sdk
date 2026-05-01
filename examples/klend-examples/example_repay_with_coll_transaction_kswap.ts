import {
  getComputeBudgetAndPriorityFeeIxs,
  getRepayWithCollIxs,
  getUserLutAddressAndSetupIxs,
  getScopeRefreshIxForObligationAndReserves,
  RepayWithCollIxsResponse,
} from '@kamino-finance/klend-sdk';
import { KswapSdk, RouteOutput } from '@kamino-finance/kswap-sdk';
import { getConnectionPool } from '../utils/connection';
import { getKeypair } from '../utils/keypair';
import { SYRUP_USDC_MARKET, SYRUP_USDC_MINT, USDC_MINT } from '../utils/constants';
import { executeUserSetupLutsTransactions, getMarket } from '../utils/helpers';
import { Account, address, Address, IInstruction, none, Rpc, SolanaRpcApi } from '@solana/kit';
import Decimal from 'decimal.js';
import { getKswapQuoter, getKswapSwapper, getTokenPriceFromBirdeye, KSWAP_API } from '../utils/kswap_utils';
import { Scope } from '@kamino-finance/scope-sdk/';
import { sendAndConfirmTx, simulateTx } from '../utils/tx';
import { getKaminoResources } from '../utils/kamino_resources';
import { AddressLookupTable, fetchAllAddressLookupTable } from '@solana-program/address-lookup-table';

// Helper to get repay-with-coll LUTs for a given pair (both directions)
function getRepayWithCollLuts(
  repayWithCollLUTs: Record<string, string>,
  collMint: Address,
  debtMint: Address
): Address[] {
  const lutAddressCollDebt = repayWithCollLUTs[`${collMint}-${debtMint}`];
  const lutAddressDebtColl = repayWithCollLUTs[`${debtMint}-${collMint}`];
  return [
    lutAddressCollDebt ? address(lutAddressCollDebt) : [],
    lutAddressDebtColl ? address(lutAddressDebtColl) : [],
  ].flat();
}

type SimulatedRoute = {
  route: RepayWithCollIxsResponse<RouteOutput>;
  routerType: string;
  luts: Address[];
};

async function simulateAndSelectBestRoute(
  rpc: Rpc<SolanaRpcApi>,
  wallet: Address,
  routes: RepayWithCollIxsResponse<RouteOutput>[],
  klendLutKeys: Address[],
  klendLutAccounts: Account<AddressLookupTable>[]
): Promise<SimulatedRoute> {
  console.log(`\nGot ${routes.length} routes, simulating all...`);

  const simulationResults = await Promise.all(
    routes.map(async (route, i) => {
      const { ixs, lookupTables, quote } = route;
      const routerType = quote?.routerType || 'unknown';

      // Combine swap LUTs with klend LUTs
      const allLuts = [...lookupTables, ...klendLutAccounts];

      try {
        const simulation = await simulateTx(rpc, wallet, ixs, allLuts);

        if (!simulation || simulation.value.err) {
          console.log(`Route ${i} (${routerType}): simulation FAILED -`, simulation?.value?.err);
          return undefined;
        }

        console.log(`Route ${i} (${routerType}): simulation PASSED`);

        return {
          route,
          routerType,
          luts: [...lookupTables.map((l) => l.address), ...klendLutKeys],
        } as SimulatedRoute;
      } catch (e) {
        console.log(`Route ${i} (${routerType}): simulation ERROR -`, e);
        return undefined;
      }
    })
  );

  // Filter out failed simulations
  const passingRoutes = simulationResults.filter((r): r is SimulatedRoute => r !== undefined);

  if (passingRoutes.length === 0) {
    throw new Error('No routes passed simulation');
  }

  console.log(`\n${passingRoutes.length} routes passed simulation`);

  // Pick the best route based on swap price (highest output for given input)
  const bestRoute = passingRoutes.reduce((best, current) => {
    const bestQuote = best.route.quote;
    const currentQuote = current.route.quote;

    if (!bestQuote || !currentQuote) return best;

    const bestInAmount = new Decimal(bestQuote.amountsExactIn.amountIn.toString());
    const bestOutAmount = new Decimal(bestQuote.amountsExactIn.amountOut.toString());
    const bestPrice = bestOutAmount.div(bestInAmount);

    const currentInAmount = new Decimal(currentQuote.amountsExactIn.amountIn.toString());
    const currentOutAmount = new Decimal(currentQuote.amountsExactIn.amountOut.toString());
    const currentPrice = currentOutAmount.div(currentInAmount);

    return currentPrice.gt(bestPrice) ? current : best;
  });

  return bestRoute;
}

// a bunch of code is just for the sake of the examples, such as the hardcoded obligation address and the token mints, or the repayAmount, configure your own
(async () => {
  const c = getConnectionPool();
  const wallet = await getKeypair();

  const market = await getMarket({ rpc: c.rpc, marketPubkey: SYRUP_USDC_MARKET });
  const scope = new Scope('mainnet-beta', c.rpc);

  const kswapSdk = new KswapSdk(KSWAP_API, c.rpc, c.wsRpc);

  // Fetch Kamino resources for repay-with-coll LUTs
  const kaminoResources = await getKaminoResources();

  // just for the sake of the example
  const collTokenMint = SYRUP_USDC_MINT;
  const debtTokenMint = USDC_MINT;
  const slippageBps = 100;

  // Set to true to repay all debt and withdraw all collateral (close position)
  const isClosingPosition = false;

  // Replace with your actual obligation address
  const obligationAddress = address('GGT1QUJRRTqVA1Zes81x96dZ44ePoegXrxhBkFgeQQtE');
  const obligation = await market.getObligationByAddress(obligationAddress);

  if (!obligation) {
    throw new Error(`Obligation not found: ${obligationAddress}`);
  }

  const collTokenReserve = market.getReserveByMint(collTokenMint);
  const debtTokenReserve = market.getReserveByMint(debtTokenMint);

  if (!collTokenReserve) {
    throw new Error(`Collateral reserve not found for mint: ${collTokenMint}`);
  }
  if (!debtTokenReserve) {
    throw new Error(`Debt reserve not found for mint: ${debtTokenMint}`);
  }

  const debtPosition = obligation.getBorrowByReserve(debtTokenReserve.address);
  const collPosition = obligation.getDepositByReserve(collTokenReserve.address);

  if (!debtPosition) {
    throw new Error(`No debt position found for ${debtTokenReserve.symbol} in obligation`);
  }
  if (!collPosition) {
    throw new Error(`No collateral position found for ${collTokenReserve.symbol} in obligation`);
  }

  console.log(`Current debt: ${debtPosition.amount} ${debtTokenReserve.symbol}`);
  console.log(`Current collateral: ${collPosition.amount} ${collTokenReserve.symbol}`);

  // Amount to repay (in debt token units, not lamports)
  // For partial repay, specify an amount less than total debt
  // For full repay, use the full debt amount or set isClosingPosition = true
  const repayAmount = isClosingPosition ? debtPosition.amount : new Decimal(1); // Repay 1 USDC

  // Setup user LUT if needed (first time setup)
  const [userLookupTable, txsIxs] = await getUserLutAddressAndSetupIxs(market, wallet, none(), false);

  await executeUserSetupLutsTransactions(c, wallet, txsIxs);

  const currentSlot = await c.rpc.getSlot().send();

  const priceCollToDebt = await getTokenPriceFromBirdeye(kswapSdk, collTokenMint, debtTokenMint);
  console.log(`Price ${collTokenReserve.symbol} to ${debtTokenReserve.symbol}: ${priceCollToDebt}`);

  const computeIxs = getComputeBudgetAndPriorityFeeIxs(1_400_000, new Decimal(500000));

  const preferredMaxAccounts = 20;

  // Build repay with collateral transaction using KSwap
  const repayWithCollResults = await getRepayWithCollIxs({
    kaminoMarket: market,
    debtTokenMint,
    collTokenMint,
    owner: wallet,
    obligation,
    referrer: none(),
    currentSlot,
    repayAmount,
    isClosingPosition,
    budgetAndPriorityFeeIxs: computeIxs,
    scopeRefreshIx: [],
    useV2Ixs: true,
    // KSwap Quoter: estimates the swap price for calculating amounts
    // For repay with coll, we swap collateral (input) -> debt (output)
    quoter: getKswapQuoter(kswapSdk, wallet.address, slippageBps, collTokenReserve, debtTokenReserve),
    // KSwap Swapper: returns actual swap instructions
    swapper: getKswapSwapper(kswapSdk, wallet.address, slippageBps, preferredMaxAccounts),
  });

  // Collect klend LUTs
  const klendLutKeys: Address[] = [];
  if (userLookupTable) {
    klendLutKeys.push(userLookupTable);
  }

  // Add repay-with-coll LUTs from CDN
  const repayWithCollLutKeys = getRepayWithCollLuts(kaminoResources.repayWithCollLUTs, collTokenMint, debtTokenMint);
  klendLutKeys.push(...repayWithCollLutKeys);

  // Fetch all klend LUT accounts
  const klendLutAccounts = klendLutKeys.length > 0 ? await fetchAllAddressLookupTable(c.rpc, klendLutKeys) : [];

  // Simulate all routes and select the best one
  const bestRoute = await simulateAndSelectBestRoute(
    c.rpc,
    wallet.address,
    repayWithCollResults,
    klendLutKeys,
    klendLutAccounts
  );

  const { ixs, swapInputs, initialInputs } = bestRoute.route;

  console.log(`\n--- Best Route: ${bestRoute.routerType} ---`);
  console.log(`Repaying: ${repayAmount} ${debtTokenReserve.symbol}`);
  console.log(
    `Swap input: ${swapInputs.inputAmountLamports.div(collTokenReserve.getMintFactor())} ${collTokenReserve.symbol}`
  );
  console.log(
    `Flash borrow: ${initialInputs.debtRepayAmountLamports.div(debtTokenReserve.getMintFactor())} ${
      debtTokenReserve.symbol
    }`
  );
  console.log(
    `Max withdrawable collateral: ${initialInputs.maxCollateralWithdrawLamports.div(collTokenReserve.getMintFactor())} ${
      collTokenReserve.symbol
    }`
  );

  console.log(`\nUsing lookup tables: ${bestRoute.luts.join(', ')}`);
  console.log(`Instructions: ${ixs.length} (programs: ${[...new Set(ixs.map((ix) => ix.programAddress))].join(', ')})`);

  console.log('\nSending transaction...');
  const txHash = await sendAndConfirmTx(
    c,
    wallet,
    ixs,
    [],
    [...bestRoute.luts, ...klendLutKeys],
    'repayWithCollateral'
  );

  console.log('\n--- Success ---');
  console.log('Transaction hash:', txHash);
  console.log(`View on Solscan: https://solscan.io/tx/${txHash}`);
})().catch(async (e) => {
  console.error('Error:', e);
  process.exit(1);
});

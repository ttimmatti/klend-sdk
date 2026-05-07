"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_ADMIN_ONLY_MODES = exports.ENTIRE_RESERVE_CONFIG_UPDATER = exports.RESERVE_CONFIG_UPDATER = exports.KaminoReserve = exports.DEFAULT_RECENT_SLOT_DURATION_MS = void 0;
exports.createReserveIxs = createReserveIxs;
exports.updateReserveConfigIx = updateReserveConfigIx;
exports.isGlobalAdminOnly = isGlobalAdminOnly;
exports.parseForChangesReserveConfigAndGetIxs = parseForChangesReserveConfigAndGetIxs;
exports.shouldSkipValidation = shouldSkipValidation;
exports.buildReserveConfigPriority = buildReserveConfigPriority;
exports.priorityOf = priorityOf;
/* eslint-disable max-classes-per-file */
const kit_1 = require("@solana/kit");
const decimal_js_1 = __importDefault(require("decimal.js"));
const utils_1 = require("../utils");
const shared_1 = require("./shared");
const accounts_1 = require("../@codegen/klend/accounts");
const types_1 = require("../@codegen/klend/types");
const utils_2 = require("./utils");
const configItems_1 = require("./configItems");
const fraction_1 = require("./fraction");
const lib_1 = require("../lib");
const kliquidity_sdk_1 = require("@kamino-finance/kliquidity-sdk");
const farms_sdk_1 = require("@kamino-finance/farms-sdk");
const token_1 = require("@solana-program/token");
const bigint_1 = require("../utils/bigint");
const system_1 = require("@solana-program/system");
const sysvars_1 = require("@solana/sysvars");
const signer_1 = require("../utils/signer");
const farm_utils_1 = require("./farm_utils");
const scope_sdk_1 = require("@kamino-finance/scope-sdk");
const readCdnData_1 = require("../utils/readCdnData");
exports.DEFAULT_RECENT_SLOT_DURATION_MS = 400;
class KaminoReserve {
    state;
    address;
    symbol;
    tokenOraclePrice;
    stats;
    farmData = { fetched: false, farms: [] };
    rpc;
    recentSlotDurationMs;
    metadata;
    constructor(state, address, tokenOraclePrice, connection, recentSlotDurationMs) {
        this.state = state;
        this.address = address;
        this.tokenOraclePrice = tokenOraclePrice;
        this.stats = {};
        this.rpc = connection;
        this.symbol = (0, utils_2.parseTokenSymbol)(state.config.tokenInfo.name);
        this.recentSlotDurationMs = recentSlotDurationMs;
    }
    static initialize(address, state, tokenOraclePrice, rpc, recentSlotDurationMs, cdnResourcesData) {
        const reserve = new KaminoReserve(state, address, tokenOraclePrice, rpc, recentSlotDurationMs);
        reserve.stats = reserve.formatReserveData(state, cdnResourcesData?.deprecatedAssets ?? []);
        return reserve;
    }
    static async initializeFromAddress(address, rpc, recentSlotDurationMs, reserveState, oracleAccounts) {
        const reserve = reserveState ?? (await accounts_1.Reserve.fetch(rpc, address));
        if (reserve === null) {
            throw new Error(`Reserve account ${address} does not exist`);
        }
        const tokenOracleDataWithReserve = await (0, utils_1.getTokenOracleData)(rpc, [{ address: address, state: reserve }], oracleAccounts);
        if (!tokenOracleDataWithReserve[0]) {
            throw new Error('Token oracle data not found');
        }
        const tokenOracleData = tokenOracleDataWithReserve[0][1];
        return new KaminoReserve(reserve, address, tokenOracleData, rpc, recentSlotDurationMs);
    }
    /// GETTERS
    /**
     * @returns the parsed token symbol of the reserve
     */
    getTokenSymbol() {
        return (0, utils_2.parseTokenSymbol)(this.state.config.tokenInfo.name);
    }
    /**
     * @returns list of logo names and human readable oracle descriptions
     */
    async getOracleMetadata() {
        if (!this.metadata) {
            const scope = new scope_sdk_1.Scope('mainnet-beta', this.rpc);
            const { priceFeed, priceChain } = this.state.config.tokenInfo.scopeConfiguration;
            this.metadata = await scope.getChainMetadata({ prices: priceFeed }, priceChain);
        }
        return this.metadata.map((m) => [m.provider, m.name]);
    }
    /**
     * @returns the total borrowed amount of the reserve in lamports
     */
    getBorrowedAmount() {
        return new fraction_1.Fraction(this.state.liquidity.borrowedAmountSf).toDecimal();
    }
    /**
     * @returns the available liquidity amount of the reserve in lamports
     */
    getLiquidityAvailableAmount() {
        return new decimal_js_1.default(this.state.liquidity.availableAmount.toString());
    }
    /**
     *
     * @returns the last cached price stored in the reserve in USD
     */
    getReserveMarketPrice() {
        return new fraction_1.Fraction(this.state.liquidity.marketPriceSf).toDecimal();
    }
    /**
     * @returns the current market price of the reserve in USD
     */
    getOracleMarketPrice() {
        return this.tokenOraclePrice.price;
    }
    /**
     * @returns the total accumulated protocol fees of the reserve
     */
    getAccumulatedProtocolFees() {
        return new fraction_1.Fraction(this.state.liquidity.accumulatedProtocolFeesSf).toDecimal();
    }
    /**
     * @returns the total accumulated referrer fees of the reserve
     */
    getAccumulatedReferrerFees() {
        return new fraction_1.Fraction(this.state.liquidity.accumulatedReferrerFeesSf).toDecimal();
    }
    /**
     * @returns the total pending referrer fees of the reserve
     */
    getPendingReferrerFees() {
        return new fraction_1.Fraction(this.state.liquidity.pendingReferrerFeesSf).toDecimal();
    }
    /**
     *
     * @returns the flash loan fee percentage of the reserve
     */
    getFlashLoanFee = () => {
        if (this.state.config.fees.flashLoanFeeSf.toString() === utils_1.U64_MAX) {
            return new decimal_js_1.default('0');
        }
        return new fraction_1.Fraction(this.state.config.fees.flashLoanFeeSf).toDecimal();
    };
    /**
     *
     * @returns the origination fee percentage of the reserve
     */
    getBorrowFee = () => {
        return new fraction_1.Fraction(this.state.config.fees.originationFeeSf).toDecimal();
    };
    /**
     *
     * @returns the fixed interest rate allocated to the host
     */
    getFixedHostInterestRate = () => {
        return new decimal_js_1.default(this.state.config.hostFixedInterestRateBps).div(10_000);
    };
    /**
     * Use getEstimatedTotalSupply() for the most accurate value
     * @returns the stale total liquidity supply of the reserve from the last refresh
     */
    getTotalSupply() {
        return this.getLiquidityAvailableAmount()
            .add(this.getBorrowedAmount())
            .sub(this.getAccumulatedProtocolFees())
            .sub(this.getAccumulatedReferrerFees())
            .sub(this.getPendingReferrerFees());
    }
    /**
     * Calculates the total liquidity supply of the reserve
     */
    getEstimatedTotalSupply(slot, referralFeeBps) {
        const { totalSupply } = this.getEstimatedDebtAndSupply(slot, referralFeeBps);
        return totalSupply;
    }
    /**
     * Use getEstimatedCumulativeBorrowRate() for the most accurate value
     * @returns the stale cumulative borrow rate of the reserve from the last refresh
     */
    getCumulativeBorrowRate() {
        return (0, fraction_1.bfToDecimal)(this.state.liquidity.cumulativeBorrowRateBsf);
    }
    /**
     * @Returns estimated cumulative borrow rate of the reserve
     */
    getEstimatedCumulativeBorrowRate(currentSlot, referralFeeBps) {
        const currentBorrowRate = new decimal_js_1.default(this.calculateBorrowAPR(currentSlot, referralFeeBps));
        const slotsElapsed = (0, bigint_1.maxBigInt)(currentSlot - BigInt(this.state.lastUpdate.slot.toString()), 0n);
        const compoundInterest = this.approximateCompoundedInterest(currentBorrowRate, slotsElapsed);
        const previousCumulativeBorrowRate = this.getCumulativeBorrowRate();
        return previousCumulativeBorrowRate.mul(compoundInterest);
    }
    /**
     * Use getEstimatedCollateralExchangeRate() for the most accurate value
     * @returns the stale exchange rate between the collateral tokens and the liquidity - this is a decimal number scaled by 1e18
     */
    getCollateralExchangeRate() {
        const totalSupply = this.getTotalSupply();
        const mintTotalSupply = this.state.collateral.mintTotalSupply;
        if (mintTotalSupply.isZero() || totalSupply.isZero()) {
            return utils_1.INITIAL_COLLATERAL_RATE;
        }
        else {
            return new decimal_js_1.default(mintTotalSupply.toString()).dividedBy(totalSupply.toString());
        }
    }
    /**
     *
     * @returns the estimated exchange rate between the collateral tokens and the liquidity - this is a decimal number scaled by 1e18
     */
    getEstimatedCollateralExchangeRate(slot, referralFeeBps) {
        const totalSupply = this.getEstimatedTotalSupply(slot, referralFeeBps);
        const mintTotalSupply = this.state.collateral.mintTotalSupply;
        if (mintTotalSupply.isZero() || totalSupply.isZero()) {
            return utils_1.INITIAL_COLLATERAL_RATE;
        }
        else {
            return new decimal_js_1.default(mintTotalSupply.toString()).dividedBy(totalSupply.toString());
        }
    }
    /**
     *
     * @returns the total USD value of the existing collateral in the reserve
     */
    getDepositTvl = () => {
        return new decimal_js_1.default(this.getTotalSupply().toString()).mul(this.getOracleMarketPrice()).div(this.getMintFactor());
    };
    /**
     *
     * Get the total USD value of the borrowed assets from the reserve
     */
    getBorrowTvl = () => {
        return this.getBorrowedAmount().mul(this.getOracleMarketPrice()).div(this.getMintFactor());
    };
    /**
     * @returns 10^mint_decimals
     */
    getMintFactor() {
        return new decimal_js_1.default(10).pow(this.getMintDecimals());
    }
    /**
     * @returns mint_decimals of the liquidity token
     */
    getMintDecimals() {
        return this.state.liquidity.mintDecimals.toNumber();
    }
    /**
     * @returns the collateral farm address if it is set, otherwise none
     */
    getCollateralFarmAddress() {
        if (this.state.farmCollateral === utils_1.DEFAULT_PUBLIC_KEY) {
            return (0, kit_1.none)();
        }
        return (0, kit_1.some)(this.state.farmCollateral);
    }
    /**
     * @returns the debt farm address if it is set, otherwise none
     */
    getDebtFarmAddress() {
        if (this.state.farmDebt === utils_1.DEFAULT_PUBLIC_KEY) {
            return (0, kit_1.none)();
        }
        return (0, kit_1.some)(this.state.farmDebt);
    }
    /**
     * @Returns true if the total liquidity supply of the reserve is greater than the deposit limit
     */
    depositLimitCrossed() {
        return this.getTotalSupply().gt(new decimal_js_1.default(this.state.config.depositLimit.toString()));
    }
    /**
     * @Returns true if the total borrowed amount of the reserve is greater than the borrow limit
     */
    borrowLimitCrossed() {
        return this.getBorrowedAmount().gt(new decimal_js_1.default(this.state.config.borrowLimit.toString()));
    }
    /**
     *
     * @returns the max capacity of the deposit withdrawal cap
     */
    getDepositWithdrawalCapCapacity() {
        return new decimal_js_1.default(this.state.config.depositWithdrawalCap.configCapacity.toString());
    }
    /**
     *
     * @returns the current capacity of the deposit withdrawal cap
     */
    getDepositWithdrawalCapCurrent(currentUnixTimestamp) {
        return this.getWithdrawalCapCurrent(this.state.config.depositWithdrawalCap, currentUnixTimestamp);
    }
    /**
     *
     * @returns the max capacity of the debt withdrawal cap
     */
    getDebtWithdrawalCapCapacity() {
        return new decimal_js_1.default(this.state.config.debtWithdrawalCap.configCapacity.toString());
    }
    /**
     *
     * @returns the borrow limit of the reserve outside the elevation group
     */
    getBorrowLimitOutsideElevationGroup() {
        return new decimal_js_1.default(this.state.config.borrowLimitOutsideElevationGroup.toString());
    }
    /**
     *
     * @returns the borrowed amount of the reserve outside the elevation group
     */
    getBorrowedAmountOutsideElevationGroup() {
        return new decimal_js_1.default(this.state.borrowedAmountOutsideElevationGroup.toString());
    }
    /**
     *
     * @returns the borrow limit against the collateral reserve in the elevation group
     */
    getBorrowLimitAgainstCollateralInElevationGroup(elevationGroupIndex) {
        return new decimal_js_1.default(this.state.config.borrowLimitAgainstThisCollateralInElevationGroup[elevationGroupIndex].toString());
    }
    /**
     *
     * @returns the borrowed amount against the collateral reserve in the elevation group
     */
    getBorrowedAmountAgainstCollateralInElevationGroup(elevationGroupIndex) {
        return new decimal_js_1.default(this.state.borrowedAmountsAgainstThisReserveInElevationGroups[elevationGroupIndex].toString());
    }
    getWithdrawalCapCurrent(caps, currentUnixTimestamp) {
        const intervalLength = Number(caps.configIntervalLengthSeconds.toString());
        if (intervalLength === 0) {
            return new decimal_js_1.default(0);
        }
        const elapsed = currentUnixTimestamp - Number(caps.lastIntervalStartTimestamp.toString());
        if (elapsed >= intervalLength) {
            return new decimal_js_1.default(0);
        }
        return new decimal_js_1.default(caps.currentTotal.toString());
    }
    /**
     *
     * @returns the current capacity of the debt withdrawal cap
     */
    getDebtWithdrawalCapCurrent(currentUnixTimestamp) {
        return this.getWithdrawalCapCurrent(this.state.config.debtWithdrawalCap, currentUnixTimestamp);
    }
    getBorrowFactor() {
        return new decimal_js_1.default(this.state.config.borrowFactorPct.toString()).div(100);
    }
    calculateSupplyAPR(slot, referralFeeBps) {
        const currentUtilization = this.calculateUtilizationRatio();
        const borrowRate = this.calculateEstimatedBorrowRate(slot, referralFeeBps);
        const protocolTakeRatePct = 1 - this.state.config.protocolTakeRatePct / 100;
        return currentUtilization * borrowRate * protocolTakeRatePct;
    }
    getEstimatedDebtAndSupply(slot, referralFeeBps) {
        const slotsElapsed = (0, bigint_1.maxBigInt)(slot - BigInt(this.state.lastUpdate.slot.toNumber()), 0n);
        let totalBorrow;
        let totalSupply;
        if (slotsElapsed === 0n) {
            totalBorrow = this.getBorrowedAmount();
            totalSupply = this.getTotalSupply();
        }
        else {
            const { newDebt, newAccProtocolFees, pendingReferralFees } = this.compoundInterest(slotsElapsed, referralFeeBps);
            const newTotalSupply = this.getLiquidityAvailableAmount()
                .add(newDebt)
                .sub(newAccProtocolFees)
                .sub(this.getAccumulatedReferrerFees())
                .sub(pendingReferralFees);
            totalBorrow = newDebt;
            totalSupply = newTotalSupply;
        }
        return { totalBorrow, totalSupply };
    }
    getEstimatedAccumulatedProtocolFees(slot, referralFeeBps) {
        const slotsElapsed = (0, bigint_1.maxBigInt)(slot - BigInt(this.state.lastUpdate.slot.toString()), 0n);
        let accumulatedProtocolFees;
        let compoundedVariableProtocolFee;
        let compoundedFixedHostFee;
        if (slotsElapsed === 0n) {
            accumulatedProtocolFees = this.getAccumulatedProtocolFees();
            compoundedVariableProtocolFee = new decimal_js_1.default(0);
            compoundedFixedHostFee = new decimal_js_1.default(0);
        }
        else {
            const { newAccProtocolFees, variableProtocolFee, fixedHostFee } = this.compoundInterest(slotsElapsed, referralFeeBps);
            accumulatedProtocolFees = newAccProtocolFees;
            compoundedVariableProtocolFee = variableProtocolFee;
            compoundedFixedHostFee = fixedHostFee;
        }
        return { accumulatedProtocolFees, compoundedVariableProtocolFee, compoundedFixedHostFee };
    }
    calculateUtilizationRatio() {
        const totalBorrows = this.getBorrowedAmount();
        const totalSupply = this.getTotalSupply();
        if (totalSupply.eq(0)) {
            return 0;
        }
        return totalBorrows.dividedBy(totalSupply).toNumber();
    }
    getEstimatedUtilizationRatio(slot, referralFeeBps) {
        const { totalBorrow: estimatedTotalBorrowed, totalSupply: estimatedTotalSupply } = this.getEstimatedDebtAndSupply(slot, referralFeeBps);
        if (estimatedTotalSupply.eq(0)) {
            return 0;
        }
        return estimatedTotalBorrowed.dividedBy(estimatedTotalSupply).toNumber();
    }
    calcSimulatedUtilizationRatio(amount, action, slot, referralFeeBps, outflowAmount) {
        const { totalBorrow: previousTotalBorrowed, totalSupply: previousTotalSupply } = this.getEstimatedDebtAndSupply(slot, referralFeeBps);
        switch (action) {
            case 'deposit': {
                const newTotalSupply = previousTotalSupply.add(amount);
                return previousTotalBorrowed.dividedBy(newTotalSupply).toNumber();
            }
            case 'withdraw': {
                const newTotalSupply = previousTotalSupply.sub(amount);
                if (newTotalSupply.eq(0)) {
                    return 0;
                }
                else {
                    return previousTotalBorrowed.dividedBy(newTotalSupply).toNumber();
                }
            }
            case 'borrow': {
                const newTotalBorrowed = previousTotalBorrowed.add(amount);
                return newTotalBorrowed.dividedBy(previousTotalSupply).toNumber();
            }
            case 'repay': {
                const newTotalBorrowed = previousTotalBorrowed.sub(amount);
                return newTotalBorrowed.dividedBy(previousTotalSupply).toNumber();
            }
            case 'depositAndBorrow': {
                const newTotalSupply = previousTotalSupply.add(amount);
                const newTotalBorrowed = previousTotalBorrowed.add(outflowAmount);
                return newTotalBorrowed.dividedBy(newTotalSupply).toNumber();
            }
            case 'repayAndWithdraw': {
                const newTotalBorrowed = previousTotalBorrowed.sub(amount);
                const newTotalSupply = previousTotalSupply.sub(outflowAmount);
                if (newTotalSupply.eq(0)) {
                    return 0;
                }
                return newTotalBorrowed.dividedBy(newTotalSupply).toNumber();
            }
            case 'mint': {
                const newTotalSupply = previousTotalSupply.add(amount);
                return previousTotalBorrowed.dividedBy(newTotalSupply).toNumber();
            }
            case 'redeem': {
                const newTotalSupply = previousTotalSupply.sub(amount);
                return previousTotalBorrowed.dividedBy(newTotalSupply).toNumber();
            }
            default:
                throw Error(`Invalid action type ${action} for simulatedUtilizationRatio`);
        }
    }
    getMaxBorrowAmountWithCollReserve(market, collReserve) {
        const groups = market.state.elevationGroups;
        const commonElevationGroups = market.getCommonElevationGroupsForPair(collReserve, this);
        let eModeGroup = 0;
        if (commonElevationGroups.length !== 0) {
            const eModeGroupWithMaxLtvAndDebtReserve = commonElevationGroups.reduce((prev, curr) => {
                const prevGroup = groups.find((group) => group.id === prev);
                const currGroup = groups.find((group) => group.id === curr);
                return prevGroup.ltvPct > currGroup.ltvPct ? prev : curr;
            });
            eModeGroup = groups.find((group) => group.id === eModeGroupWithMaxLtvAndDebtReserve).id;
        }
        const elevationGroupActivated = this.state.config.elevationGroups.includes(eModeGroup) && eModeGroup !== 0;
        const reserveAvailableAmount = this.getLiquidityAvailableAmount();
        const reserveBorrowCapRemained = this.stats.reserveBorrowLimit.sub(this.getBorrowedAmount());
        let maxBorrowAmount = decimal_js_1.default.min(reserveAvailableAmount, reserveBorrowCapRemained);
        const currentUnixTimestamp = Math.floor(Date.now() / 1000);
        const debtWithdrawalCap = this.getDebtWithdrawalCapCapacity().sub(this.getDebtWithdrawalCapCurrent(currentUnixTimestamp));
        maxBorrowAmount = this.getDebtWithdrawalCapCapacity().gt(0)
            ? decimal_js_1.default.min(maxBorrowAmount, debtWithdrawalCap)
            : maxBorrowAmount;
        let originationFeeRate = this.getBorrowFee();
        // Inclusive fee rate
        originationFeeRate = originationFeeRate.div(originationFeeRate.add(new decimal_js_1.default(1)));
        const borrowFee = maxBorrowAmount.mul(originationFeeRate);
        maxBorrowAmount = maxBorrowAmount.sub(borrowFee);
        const utilizationRatioLimit = this.state.config.utilizationLimitBlockBorrowingAbovePct / 100;
        const currentUtilizationRatio = this.calculateUtilizationRatio();
        if (utilizationRatioLimit > 0 && currentUtilizationRatio > utilizationRatioLimit) {
            return new decimal_js_1.default(0);
        }
        else if (utilizationRatioLimit > 0 && currentUtilizationRatio < utilizationRatioLimit) {
            const maxBorrowBasedOnUtilization = new decimal_js_1.default(utilizationRatioLimit - currentUtilizationRatio).mul(this.getTotalSupply());
            maxBorrowAmount = decimal_js_1.default.min(maxBorrowAmount, maxBorrowBasedOnUtilization);
        }
        let borrowLimitDependentOnElevationGroup = new decimal_js_1.default(utils_1.U64_MAX);
        if (!elevationGroupActivated) {
            borrowLimitDependentOnElevationGroup = this.getBorrowLimitOutsideElevationGroup().sub(this.getBorrowedAmountOutsideElevationGroup());
        }
        else {
            let maxDebtTakenAgainstCollaterals = new decimal_js_1.default(utils_1.U64_MAX);
            const maxDebtAllowedAgainstCollateral = collReserve
                .getBorrowLimitAgainstCollateralInElevationGroup(eModeGroup - 1)
                .sub(collReserve.getBorrowedAmountAgainstCollateralInElevationGroup(eModeGroup - 1));
            maxDebtTakenAgainstCollaterals = decimal_js_1.default.max(new decimal_js_1.default(0), decimal_js_1.default.min(maxDebtAllowedAgainstCollateral, maxDebtTakenAgainstCollaterals));
            borrowLimitDependentOnElevationGroup = maxDebtTakenAgainstCollaterals;
        }
        maxBorrowAmount = decimal_js_1.default.min(maxBorrowAmount, borrowLimitDependentOnElevationGroup);
        return decimal_js_1.default.max(new decimal_js_1.default(0), maxBorrowAmount);
    }
    calcSimulatedBorrowRate(amount, action, slot, referralFeeBps, outflowAmount) {
        const slotAdjustmentFactor = this.slotAdjustmentFactor();
        const newUtilization = this.calcSimulatedUtilizationRatio(amount, action, slot, referralFeeBps, outflowAmount);
        const curve = truncateBorrowCurve(this.state.config.borrowRateCurve.points);
        return (0, utils_2.getBorrowRate)(newUtilization, curve) * slotAdjustmentFactor;
    }
    calcSimulatedBorrowAPR(amount, action, slot, referralFeeBps, outflowAmount) {
        return (this.calcSimulatedBorrowRate(amount, action, slot, referralFeeBps, outflowAmount) +
            this.getFixedHostInterestRate().toNumber() * this.slotAdjustmentFactor());
    }
    calcSimulatedSupplyAPR(amount, action, slot, referralFeeBps, outflowAmount) {
        const newUtilization = this.calcSimulatedUtilizationRatio(amount, action, slot, referralFeeBps, outflowAmount);
        const simulatedBorrowAPR = this.calcSimulatedBorrowRate(amount, action, slot, referralFeeBps, outflowAmount);
        const protocolTakeRatePct = 1 - this.state.config.protocolTakeRatePct / 100;
        return newUtilization * simulatedBorrowAPR * protocolTakeRatePct;
    }
    slotAdjustmentFactor() {
        return 1000 / utils_1.SLOTS_PER_SECOND / this.recentSlotDurationMs;
    }
    calculateBorrowRate() {
        const slotAdjustmentFactor = this.slotAdjustmentFactor();
        const currentUtilization = this.calculateUtilizationRatio();
        const curve = truncateBorrowCurve(this.state.config.borrowRateCurve.points);
        return (0, utils_2.getBorrowRate)(currentUtilization, curve) * slotAdjustmentFactor;
    }
    calculateEstimatedBorrowRate(slot, referralFeeBps) {
        const slotAdjustmentFactor = this.slotAdjustmentFactor();
        const estimatedCurrentUtilization = this.getEstimatedUtilizationRatio(slot, referralFeeBps);
        const curve = truncateBorrowCurve(this.state.config.borrowRateCurve.points);
        return (0, utils_2.getBorrowRate)(estimatedCurrentUtilization, curve) * slotAdjustmentFactor;
    }
    calculateBorrowAPR(slot, referralFeeBps) {
        const slotAdjustmentFactor = this.slotAdjustmentFactor();
        const borrowRate = this.calculateEstimatedBorrowRate(slot, referralFeeBps);
        return borrowRate + this.getFixedHostInterestRate().toNumber() * slotAdjustmentFactor;
    }
    /**
     * @returns the mint of the reserve liquidity token
     */
    getLiquidityMint() {
        return this.state.liquidity.mintPubkey;
    }
    /**
     * @returns the token program of the reserve liquidity mint
     */
    getLiquidityTokenProgram() {
        return this.state.liquidity.tokenProgram;
    }
    /**
     * @returns the mint of the reserve collateral token , i.e. the cToken minted for depositing the liquidity token
     */
    getCTokenMint() {
        return this.state.collateral.mintPubkey;
    }
    calculateFees(amountLamports, borrowFeeRate, feeCalculation, referralFeeBps, hasReferrer) {
        const referralFeeRate = new decimal_js_1.default(referralFeeBps).div(utils_1.ONE_HUNDRED_PCT_IN_BPS);
        if (borrowFeeRate.gt('0') && amountLamports.gt('0')) {
            const needToAssessReferralFee = referralFeeRate.gt('0') && hasReferrer;
            const minimumFee = new decimal_js_1.default('1'); // 1 token to market owner, nothing to referrer
            let borrowFeeAmount;
            if (feeCalculation === shared_1.FeeCalculation.Exclusive) {
                borrowFeeAmount = amountLamports.mul(borrowFeeRate);
            }
            else {
                const borrowFeeFactor = borrowFeeRate.div(borrowFeeRate.add('1'));
                borrowFeeAmount = amountLamports.mul(borrowFeeFactor);
            }
            const borrowFee = decimal_js_1.default.max(borrowFeeAmount, minimumFee);
            if (borrowFee.gte(amountLamports)) {
                throw Error('Borrow amount is too small to receive liquidity after fees');
            }
            const referralFee = needToAssessReferralFee
                ? referralFeeRate.eq(1)
                    ? borrowFee
                    : borrowFee.mul(referralFeeRate).floor()
                : new decimal_js_1.default(0);
            const protocolFee = borrowFee.sub(referralFee);
            return { protocolFees: protocolFee, referrerFees: referralFee };
        }
        else {
            return { protocolFees: new decimal_js_1.default(0), referrerFees: new decimal_js_1.default(0) };
        }
    }
    calculateFlashLoanFees(flashLoanAmountLamports, referralFeeBps, hasReferrer) {
        return this.calculateFees(flashLoanAmountLamports, this.getFlashLoanFee(), shared_1.FeeCalculation.Exclusive, referralFeeBps, hasReferrer);
    }
    async load(tokenOraclePrice) {
        const [parsedData, cdnResourcesData] = await Promise.all([
            accounts_1.Reserve.fetch(this.rpc, this.address),
            (0, readCdnData_1.fetchKaminoCdnData)(),
        ]);
        if (!parsedData) {
            throw Error(`Unable to parse data of reserve ${this.symbol}`);
        }
        this.state = parsedData;
        this.tokenOraclePrice = tokenOraclePrice;
        this.stats = this.formatReserveData(parsedData, cdnResourcesData?.deprecatedAssets ?? []);
    }
    totalSupplyAPY(currentSlot) {
        const { stats } = this;
        if (!stats) {
            throw Error('KaminoMarket must call loadRewards.');
        }
        return (0, utils_2.calculateAPYFromAPR)(this.calculateSupplyAPR(currentSlot, 0));
    }
    totalBorrowAPY(currentSlot) {
        const { stats } = this;
        if (!stats) {
            throw Error('KaminoMarket must call loadRewards.');
        }
        return (0, utils_2.calculateAPYFromAPR)(this.calculateBorrowAPR(currentSlot, 0));
    }
    async loadFarmStates(farmsProgramId) {
        if (!this.farmData.fetched) {
            const farmStates = [];
            const debtFarmAddress = this.getDebtFarmAddress();
            if ((0, kit_1.isSome)(debtFarmAddress)) {
                const farmState = await farms_sdk_1.FarmState.fetch(this.rpc, debtFarmAddress.value, farmsProgramId);
                if (farmState !== null) {
                    farmStates.push({ farmState, key: debtFarmAddress.value });
                }
            }
            const collateralFarmAddress = this.getCollateralFarmAddress();
            if ((0, kit_1.isSome)(collateralFarmAddress)) {
                const farmState = await farms_sdk_1.FarmState.fetch(this.rpc, collateralFarmAddress.value, farmsProgramId);
                if (farmState !== null) {
                    farmStates.push({ farmState, key: collateralFarmAddress.value });
                }
            }
            this.farmData.farms = farmStates;
            this.farmData.fetched = true;
        }
    }
    async getRewardYields(prices, farmsProgramId) {
        const { stats } = this;
        if (!stats) {
            throw Error('KaminoMarket must call loadReserves.');
        }
        await this.loadFarmStates(farmsProgramId);
        const yields = [];
        for (const farmAndKey of this.farmData.farms) {
            const isDebtReward = this.state.farmDebt === farmAndKey.key;
            for (const rewardInfo of farmAndKey.farmState.rewardInfos.filter((x) => x.token.mint !== utils_1.DEFAULT_PUBLIC_KEY && !x.rewardsAvailable.isZero())) {
                const { apy, apr } = this.calculateRewardYield(prices, rewardInfo, isDebtReward, new decimal_js_1.default(farmAndKey.farmState.totalActiveStakeScaled.toString()));
                if (apy.isZero() && apr.isZero()) {
                    continue;
                }
                yields.push({ apy, apr, rewardInfo });
            }
        }
        return yields;
    }
    calculateRewardYield(prices, rewardInfo, isDebtReward, farmTotalStakeLamports) {
        const mintAddress = this.getLiquidityMint();
        const rewardPerTimeUnitSecond = (0, farm_utils_1.getRewardPerTimeUnitSecond)(rewardInfo, farmTotalStakeLamports);
        const reserveToken = prices.spot[mintAddress.toString()];
        const rewardToken = prices.spot[rewardInfo.token.mint.toString()];
        if (rewardPerTimeUnitSecond.isZero() || reserveToken === undefined || rewardToken === undefined) {
            return { apy: new decimal_js_1.default(0), apr: new decimal_js_1.default(0) };
        }
        const { decimals } = this.stats;
        const totalBorrows = this.getBorrowedAmount();
        const totalSupply = this.getTotalSupply();
        const totalAmount = isDebtReward
            ? (0, utils_2.lamportsToNumberDecimal)(totalBorrows, decimals)
            : (0, utils_2.lamportsToNumberDecimal)(totalSupply, decimals);
        const totalValue = totalAmount.mul(reserveToken.price);
        const rewardsInYear = rewardPerTimeUnitSecond.mul(60 * 60 * 24 * 365);
        const rewardsInYearValue = rewardsInYear.mul(rewardToken.price);
        const apr = rewardsInYearValue.div(totalValue);
        return { apy: (0, kliquidity_sdk_1.aprToApy)(apr, 365), apr };
    }
    formatReserveData(parsedData, deprecatedAssets) {
        const mintTotalSupply = new decimal_js_1.default(parsedData.collateral.mintTotalSupply.toString()).div(this.getMintFactor());
        let reserveStatus = shared_1.ReserveStatus.Active;
        switch (parsedData.config.status) {
            case 0:
                reserveStatus = shared_1.ReserveStatus.Active;
                break;
            case 1:
                reserveStatus = shared_1.ReserveStatus.Obsolete;
                break;
            case 2:
                reserveStatus = shared_1.ReserveStatus.Hidden;
                break;
        }
        const reserveIsUIDeprecated = deprecatedAssets.length > 0 ? deprecatedAssets.includes(this.address.toString()) : undefined;
        return {
            // Reserve config
            status: reserveStatus,
            mintAddress: parsedData.liquidity.mintPubkey,
            borrowCurve: truncateBorrowCurve(parsedData.config.borrowRateCurve.points),
            loanToValue: parsedData.config.loanToValuePct / 100,
            maxLiquidationBonus: parsedData.config.maxLiquidationBonusBps / 10000,
            minLiquidationBonus: parsedData.config.minLiquidationBonusBps / 10000,
            liquidationThreshold: parsedData.config.liquidationThresholdPct / 100,
            protocolTakeRate: parsedData.config.protocolTakeRatePct / 100,
            reserveDepositLimit: new decimal_js_1.default(parsedData.config.depositLimit.toString()),
            reserveBorrowLimit: new decimal_js_1.default(parsedData.config.borrowLimit.toString()),
            // Reserve info
            symbol: (0, utils_2.parseTokenSymbol)(parsedData.config.tokenInfo.name),
            decimals: this.getMintDecimals(),
            accumulatedProtocolFees: this.getAccumulatedProtocolFees().div(this.getMintFactor()),
            mintTotalSupply,
            depositLimitCrossedTimestamp: parsedData.liquidity.depositLimitCrossedTimestamp.toNumber(),
            borrowLimitCrossedTimestamp: parsedData.liquidity.borrowLimitCrossedTimestamp.toNumber(),
            borrowFactor: parsedData.config.borrowFactorPct.toNumber(),
            isUIDeprecated: reserveIsUIDeprecated,
        };
    }
    /**
     * Compound current borrow rate over elapsed slots
     *
     * This also calculates protocol fees, which are taken for all obligations that have borrowed from current reserve.
     *
     * This also calculates referral fees, which are taken into pendingReferralFees.
     *
     * https://github.com/Kamino-Finance/klend/blob/release/1.3.0/programs/klend/src/state/reserve.rs#L517
     *
     * @param slotsElapsed
     * @param referralFeeBps
     */
    compoundInterest(slotsElapsed, referralFeeBps) {
        const currentBorrowRate = this.calculateBorrowRate();
        const protocolTakeRate = new decimal_js_1.default(this.state.config.protocolTakeRatePct).div(100);
        const referralRate = new decimal_js_1.default(referralFeeBps).div(10_000);
        const fixedHostInterestRate = this.getFixedHostInterestRate();
        const compoundedInterestRate = this.approximateCompoundedInterest(new decimal_js_1.default(currentBorrowRate).plus(fixedHostInterestRate), slotsElapsed);
        const compoundedFixedRate = this.approximateCompoundedInterest(fixedHostInterestRate, slotsElapsed);
        const previousDebt = this.getBorrowedAmount();
        const newDebt = previousDebt.mul(compoundedInterestRate);
        const fixedHostFee = previousDebt.mul(compoundedFixedRate).sub(previousDebt);
        const netNewDebt = newDebt.sub(previousDebt).sub(fixedHostFee);
        const variableProtocolFee = netNewDebt.mul(protocolTakeRate);
        const absoluteReferralFee = protocolTakeRate.mul(referralRate);
        const maxReferralFees = netNewDebt.mul(absoluteReferralFee);
        const newAccProtocolFees = variableProtocolFee
            .add(fixedHostFee)
            .sub(maxReferralFees)
            .add(this.getAccumulatedProtocolFees());
        const pendingReferralFees = this.getPendingReferrerFees().add(maxReferralFees);
        return {
            newDebt,
            netNewDebt,
            variableProtocolFee,
            fixedHostFee,
            absoluteReferralFee,
            maxReferralFees,
            newAccProtocolFees,
            pendingReferralFees,
        };
    }
    /**
     * Approximation to match the smart contract calculation
     * https://github.com/Kamino-Finance/klend/blob/release/1.3.0/programs/klend/src/state/reserve.rs#L1026
     * @param rate
     * @param elapsedSlots
     * @private
     */
    approximateCompoundedInterest(rate, elapsedSlots) {
        const base = rate.div(utils_1.SLOTS_PER_YEAR);
        switch (elapsedSlots) {
            case 0n:
                return new decimal_js_1.default(1);
            case 1n:
                return base.add(1);
            case 2n:
                return base.add(1).mul(base.add(1));
            case 3n:
                return base.add(1).mul(base.add(1)).mul(base.add(1));
            case 4n:
                // eslint-disable-next-line no-case-declarations
                const pow2 = base.add(1).mul(base.add(1));
                return pow2.mul(pow2);
        }
        const exp = elapsedSlots;
        const expMinus1 = exp - 1n;
        const expMinus2 = exp - 2n;
        const basePow2 = base.mul(base);
        const basePow3 = basePow2.mul(base);
        const firstTerm = base.mul(exp.toString());
        const secondTerm = basePow2.mul(exp.toString()).mul(expMinus1.toString()).div(2);
        const thirdTerm = basePow3.mul(exp.toString()).mul(expMinus1.toString()).mul(expMinus2.toString()).div(6);
        return new decimal_js_1.default(1).add(firstTerm).add(secondTerm).add(thirdTerm);
    }
    getBorrowCapForReserve(market) {
        // Utilization cap
        const utilizationCap = this.state.config.utilizationLimitBlockBorrowingAbovePct;
        const utilizationCurrentValue = this.calculateUtilizationRatio();
        // Daily borrow cap
        const withdrawalCap = this.state.config.debtWithdrawalCap;
        // Debt against collaterals in elevation groups
        const debtAgainstCollateralReserveCaps = market
            .getMarketElevationGroupDescriptions()
            .filter((x) => x.debtReserve === this.address)
            .map((elevationGroupDescription) => [...elevationGroupDescription.collateralReserves].map((collateralReserveAddress) => {
            const collRes = market.reserves.get(collateralReserveAddress);
            const debtLimitAgainstThisCollInGroup = collRes.state.config.borrowLimitAgainstThisCollateralInElevationGroup[elevationGroupDescription.elevationGroup - 1].toString();
            const debtCounterAgainstThisCollInGroup = collRes.state.borrowedAmountsAgainstThisReserveInElevationGroups[elevationGroupDescription.elevationGroup - 1].toString();
            return {
                collateralReserve: collRes.address,
                elevationGroup: elevationGroupDescription.elevationGroup,
                maxDebt: new decimal_js_1.default(debtLimitAgainstThisCollInGroup),
                currentValue: new decimal_js_1.default(debtCounterAgainstThisCollInGroup),
            };
        }))
            .flat();
        const caps = {
            // Utilization cap
            utilizationCap: new decimal_js_1.default(utilizationCap > 0 ? utilizationCap / 100 : 1),
            utilizationCurrentValue: new decimal_js_1.default(utilizationCurrentValue),
            // Daily borrow cap
            netWithdrawalCap: new decimal_js_1.default(withdrawalCap.configCapacity.toString()),
            netWithdrawalCurrentValue: new decimal_js_1.default(withdrawalCap.currentTotal.toString()),
            netWithdrawalLastUpdateTs: new decimal_js_1.default(withdrawalCap.lastIntervalStartTimestamp.toString()),
            netWithdrawalIntervalDurationSeconds: new decimal_js_1.default(withdrawalCap.configIntervalLengthSeconds.toString()),
            // Global cap
            globalDebtCap: new decimal_js_1.default(this.state.config.borrowLimit.toString()),
            globalTotalBorrowed: this.getBorrowedAmount(),
            // Debt outside emode cap
            debtOutsideEmodeCap: new decimal_js_1.default(this.state.config.borrowLimitOutsideElevationGroup.toString()),
            borrowedOutsideEmode: this.getBorrowedAmountOutsideElevationGroup(),
            debtAgainstCollateralReserveCaps: debtAgainstCollateralReserveCaps,
        };
        return caps;
    }
    /* This takes into account all the caps */
    getLiquidityAvailableForDebtReserveGivenCaps(market, elevationGroups, collateralReserves = []) {
        const caps = this.getBorrowCapForReserve(market);
        const liquidityAvailable = this.getLiquidityAvailableAmount();
        // Cap this to utilization cap first
        const utilizationRatioLimit = caps.utilizationCap;
        const currentUtilizationRatio = this.calculateUtilizationRatio();
        const liquidityGivenUtilizationCap = this.getTotalSupply().mul(utilizationRatioLimit.minus(currentUtilizationRatio));
        const remainingDailyCap = caps.netWithdrawalIntervalDurationSeconds.eq(new decimal_js_1.default(0))
            ? new decimal_js_1.default(utils_1.U64_MAX)
            : caps.netWithdrawalCap.minus(caps.netWithdrawalCurrentValue);
        const remainingGlobalCap = caps.globalDebtCap.minus(caps.globalTotalBorrowed);
        const remainingOutsideEmodeCap = caps.debtOutsideEmodeCap.minus(caps.borrowedOutsideEmode);
        const available = elevationGroups.map((elevationGroup) => {
            if (elevationGroup === 0) {
                const availableInCrossMode = decimal_js_1.default.min((0, utils_2.positiveOrZero)(liquidityAvailable), (0, utils_2.positiveOrZero)(remainingOutsideEmodeCap), (0, utils_2.positiveOrZero)(remainingDailyCap), (0, utils_2.positiveOrZero)(remainingGlobalCap), (0, utils_2.positiveOrZero)(liquidityGivenUtilizationCap));
                return availableInCrossMode;
            }
            else {
                let remainingInsideEmodeCaps = new decimal_js_1.default(0);
                const capsGivenEgroup = caps.debtAgainstCollateralReserveCaps.filter((x) => x.elevationGroup === elevationGroup);
                if (capsGivenEgroup.length > 0) {
                    remainingInsideEmodeCaps = decimal_js_1.default.min(...capsGivenEgroup.map((x) => {
                        // check reserve is part of collReserves array
                        if (collateralReserves.find((collateralReserve) => collateralReserve === x.collateralReserve)) {
                            return x.maxDebt.minus(x.currentValue);
                        }
                        else {
                            return new decimal_js_1.default(utils_1.U64_MAX);
                        }
                    }));
                }
                return decimal_js_1.default.min((0, utils_2.positiveOrZero)(liquidityAvailable), (0, utils_2.positiveOrZero)(remainingInsideEmodeCaps), (0, utils_2.positiveOrZero)(remainingDailyCap), (0, utils_2.positiveOrZero)(remainingGlobalCap), (0, utils_2.positiveOrZero)(liquidityGivenUtilizationCap));
            }
        });
        return available;
    }
}
exports.KaminoReserve = KaminoReserve;
const truncateBorrowCurve = (points) => {
    const curve = [];
    for (const { utilizationRateBps, borrowRateBps } of points) {
        curve.push([utilizationRateBps / utils_1.ONE_HUNDRED_PCT_IN_BPS, borrowRateBps / utils_1.ONE_HUNDRED_PCT_IN_BPS]);
        if (utilizationRateBps === utils_1.ONE_HUNDRED_PCT_IN_BPS) {
            break;
        }
    }
    return curve;
};
async function createReserveIxs(rpc, owner, ownerLiquiditySource, lendingMarket, liquidityMint, liquidityMintTokenProgram, reserveAddress, programId) {
    const size = BigInt(accounts_1.Reserve.layout.span + 8);
    const createReserveIx = (0, system_1.getCreateAccountInstruction)({
        payer: owner,
        space: size,
        lamports: await rpc.getMinimumBalanceForRentExemption(size).send(),
        programAddress: programId,
        newAccount: reserveAddress,
    });
    const { liquiditySupplyVault, collateralMint, collateralSupplyVault, feeVault } = await (0, utils_1.reservePdas)(programId, reserveAddress.address);
    const [lendingMarketAuthority] = await (0, utils_1.lendingMarketAuthPda)(lendingMarket, programId);
    const accounts = {
        signer: owner,
        lendingMarket: lendingMarket,
        lendingMarketAuthority: lendingMarketAuthority,
        reserve: reserveAddress.address,
        reserveLiquidityMint: liquidityMint,
        reserveLiquiditySupply: liquiditySupplyVault,
        feeReceiver: feeVault,
        reserveCollateralMint: collateralMint,
        reserveCollateralSupply: collateralSupplyVault,
        initialLiquiditySource: ownerLiquiditySource,
        liquidityTokenProgram: liquidityMintTokenProgram,
        collateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
        systemProgram: system_1.SYSTEM_PROGRAM_ADDRESS,
        rent: sysvars_1.SYSVAR_RENT_ADDRESS,
    };
    const initReserveIx = (0, lib_1.initReserve)(accounts, undefined, programId);
    return [createReserveIx, initReserveIx];
}
async function updateReserveConfigIx(signer, marketAddress, reserveAddress, mode, value, programId, skipConfigIntegrityValidation = false) {
    const args = {
        mode,
        value,
        skipConfigIntegrityValidation,
    };
    const globalConfig = await (0, utils_1.globalConfigPda)(programId);
    const accounts = {
        signer,
        lendingMarket: marketAddress,
        reserve: reserveAddress,
        globalConfig,
    };
    return (0, lib_1.updateReserveConfig)(args, accounts, undefined, programId);
}
exports.RESERVE_CONFIG_UPDATER = new configItems_1.ConfigUpdater(types_1.UpdateConfigMode.fromDecoded, types_1.ReserveConfig, (config) => ({
    [types_1.UpdateConfigMode.UpdateLoanToValuePct.kind]: config.loanToValuePct,
    [types_1.UpdateConfigMode.UpdateMaxLiquidationBonusBps.kind]: config.maxLiquidationBonusBps,
    [types_1.UpdateConfigMode.UpdateLiquidationThresholdPct.kind]: config.liquidationThresholdPct,
    [types_1.UpdateConfigMode.UpdateProtocolLiquidationFee.kind]: config.protocolLiquidationFeePct,
    [types_1.UpdateConfigMode.UpdateProtocolTakeRate.kind]: config.protocolTakeRatePct,
    [types_1.UpdateConfigMode.UpdateFeesOriginationFee.kind]: config.fees.originationFeeSf,
    [types_1.UpdateConfigMode.UpdateFeesFlashLoanFee.kind]: config.fees.flashLoanFeeSf,
    [types_1.UpdateConfigMode.DeprecatedUpdateFeesReferralFeeBps.kind]: [], // deprecated
    [types_1.UpdateConfigMode.UpdateDepositLimit.kind]: config.depositLimit,
    [types_1.UpdateConfigMode.UpdateBorrowLimit.kind]: config.borrowLimit,
    [types_1.UpdateConfigMode.UpdateTokenInfoLowerHeuristic.kind]: config.tokenInfo.heuristic.lower,
    [types_1.UpdateConfigMode.UpdateTokenInfoUpperHeuristic.kind]: config.tokenInfo.heuristic.upper,
    [types_1.UpdateConfigMode.UpdateTokenInfoExpHeuristic.kind]: config.tokenInfo.heuristic.exp,
    [types_1.UpdateConfigMode.UpdateTokenInfoTwapDivergence.kind]: config.tokenInfo.maxTwapDivergenceBps,
    [types_1.UpdateConfigMode.UpdateTokenInfoScopeTwap.kind]: config.tokenInfo.scopeConfiguration.twapChain,
    [types_1.UpdateConfigMode.UpdateTokenInfoScopeChain.kind]: config.tokenInfo.scopeConfiguration.priceChain,
    [types_1.UpdateConfigMode.UpdateTokenInfoName.kind]: config.tokenInfo.name,
    [types_1.UpdateConfigMode.UpdateTokenInfoPriceMaxAge.kind]: config.tokenInfo.maxAgePriceSeconds,
    [types_1.UpdateConfigMode.UpdateTokenInfoTwapMaxAge.kind]: config.tokenInfo.maxAgeTwapSeconds,
    [types_1.UpdateConfigMode.UpdateScopePriceFeed.kind]: config.tokenInfo.scopeConfiguration.priceFeed,
    [types_1.UpdateConfigMode.UpdatePythPrice.kind]: config.tokenInfo.pythConfiguration.price,
    [types_1.UpdateConfigMode.UpdateSwitchboardFeed.kind]: config.tokenInfo.switchboardConfiguration.priceAggregator,
    [types_1.UpdateConfigMode.UpdateSwitchboardTwapFeed.kind]: config.tokenInfo.switchboardConfiguration.twapAggregator,
    [types_1.UpdateConfigMode.UpdateBorrowRateCurve.kind]: config.borrowRateCurve,
    [types_1.UpdateConfigMode.UpdateEntireReserveConfig.kind]: [], // technically `config` would be a valid thing here, but we actually do NOT want entire config update among ixs produced for field-by-field updates
    [types_1.UpdateConfigMode.UpdateDebtWithdrawalCap.kind]: new configItems_1.CompositeConfigItem(config.debtWithdrawalCap.configCapacity, config.debtWithdrawalCap.configIntervalLengthSeconds),
    [types_1.UpdateConfigMode.UpdateDepositWithdrawalCap.kind]: new configItems_1.CompositeConfigItem(config.depositWithdrawalCap.configCapacity, config.depositWithdrawalCap.configIntervalLengthSeconds),
    [types_1.UpdateConfigMode.DeprecatedUpdateDebtWithdrawalCapCurrentTotal.kind]: [], // deprecated
    [types_1.UpdateConfigMode.DeprecatedUpdateDepositWithdrawalCapCurrentTotal.kind]: [], // deprecated
    [types_1.UpdateConfigMode.UpdateBadDebtLiquidationBonusBps.kind]: config.badDebtLiquidationBonusBps,
    [types_1.UpdateConfigMode.UpdateMinLiquidationBonusBps.kind]: config.minLiquidationBonusBps,
    [types_1.UpdateConfigMode.UpdateDeleveragingMarginCallPeriod.kind]: config.deleveragingMarginCallPeriodSecs,
    [types_1.UpdateConfigMode.UpdateBorrowFactor.kind]: config.borrowFactorPct,
    [types_1.UpdateConfigMode.DeprecatedUpdateAssetTier.kind]: [],
    [types_1.UpdateConfigMode.UpdateElevationGroup.kind]: config.elevationGroups,
    [types_1.UpdateConfigMode.UpdateDeleveragingThresholdDecreaseBpsPerDay.kind]: config.deleveragingThresholdDecreaseBpsPerDay,
    [types_1.UpdateConfigMode.DeprecatedUpdateMultiplierSideBoost.kind]: [], // deprecated
    [types_1.UpdateConfigMode.DeprecatedUpdateMultiplierTagBoost.kind]: [], // deprecated
    [types_1.UpdateConfigMode.UpdateReserveStatus.kind]: config.status,
    [types_1.UpdateConfigMode.UpdateFarmCollateral.kind]: [], // the farm fields live on the `Reserve` level...
    [types_1.UpdateConfigMode.UpdateFarmDebt.kind]: [], // ...so we are not concerned with them in the `ReserveConfig`'s field-by-field update tx
    [types_1.UpdateConfigMode.UpdateDisableUsageAsCollateralOutsideEmode.kind]: config.disableUsageAsCollOutsideEmode,
    [types_1.UpdateConfigMode.UpdateBlockBorrowingAboveUtilizationPct.kind]: config.utilizationLimitBlockBorrowingAbovePct,
    [types_1.UpdateConfigMode.UpdateBlockPriceUsage.kind]: config.tokenInfo.blockPriceUsage,
    [types_1.UpdateConfigMode.UpdateBorrowLimitOutsideElevationGroup.kind]: config.borrowLimitOutsideElevationGroup,
    [types_1.UpdateConfigMode.UpdateBorrowLimitsInElevationGroupAgainstThisReserve.kind]: config.borrowLimitAgainstThisCollateralInElevationGroup,
    [types_1.UpdateConfigMode.UpdateHostFixedInterestRateBps.kind]: config.hostFixedInterestRateBps,
    [types_1.UpdateConfigMode.UpdateAutodeleverageEnabled.kind]: config.autodeleverageEnabled,
    [types_1.UpdateConfigMode.UpdateDeleveragingBonusIncreaseBpsPerDay.kind]: config.deleveragingBonusIncreaseBpsPerDay,
    [types_1.UpdateConfigMode.UpdateProtocolOrderExecutionFee.kind]: config.protocolOrderExecutionFeePct,
    [types_1.UpdateConfigMode.UpdateProposerAuthorityLock.kind]: config.proposerAuthorityLocked,
    [types_1.UpdateConfigMode.UpdateMinDeleveragingBonusBps.kind]: config.minDeleveragingBonusBps,
    [types_1.UpdateConfigMode.UpdateBlockCTokenUsage.kind]: config.blockCtokenUsage,
    [types_1.UpdateConfigMode.UpdateDebtMaturityTimestamp.kind]: config.debtMaturityTimestamp,
    [types_1.UpdateConfigMode.UpdateDebtTermSeconds.kind]: config.debtTermSeconds,
}));
exports.ENTIRE_RESERVE_CONFIG_UPDATER = new configItems_1.PriorityOrderedConfigUpdater(exports.RESERVE_CONFIG_UPDATER);
exports.GLOBAL_ADMIN_ONLY_MODES = new Set([
    types_1.UpdateConfigMode.UpdateProtocolTakeRate.discriminator,
    types_1.UpdateConfigMode.UpdateProtocolLiquidationFee.discriminator,
    types_1.UpdateConfigMode.UpdateHostFixedInterestRateBps.discriminator,
    types_1.UpdateConfigMode.UpdateProtocolOrderExecutionFee.discriminator,
    types_1.UpdateConfigMode.UpdateFeesOriginationFee.discriminator,
    types_1.UpdateConfigMode.UpdateFeesFlashLoanFee.discriminator,
    types_1.UpdateConfigMode.UpdateBlockCTokenUsage.discriminator,
]);
function isGlobalAdminOnly(mode) {
    return exports.GLOBAL_ADMIN_ONLY_MODES.has(mode.discriminator);
}
function parseForChangesReserveConfigAndGetIxs(marketWithAddress, reserve, reserveAddress, reserveConfig, programId, lendingMarketOwner = (0, signer_1.noopSigner)(marketWithAddress.state.lendingMarketOwner), globalAdminSigner) {
    const currentConfig = reserve?.config ?? defaultReserveConfig();
    const encodedConfigUpdates = exports.ENTIRE_RESERVE_CONFIG_UPDATER.encodeAllUpdates(currentConfig, reserveConfig, buildReserveConfigPriority(currentConfig, reserveConfig));
    const filteredUpdates = encodedConfigUpdates.filter((encodedConfigUpdate) => {
        if (isGlobalAdminOnly(encodedConfigUpdate.mode) && !globalAdminSigner) {
            console.warn(`WARN: Skipping ${encodedConfigUpdate.mode.kind}. Global admin must update this parameter separately.`);
            return false;
        }
        return true;
    });
    return Promise.all(filteredUpdates.map(async (encodedConfigUpdate) => {
        const requiresGlobalAdmin = isGlobalAdminOnly(encodedConfigUpdate.mode);
        const signer = requiresGlobalAdmin ? globalAdminSigner : lendingMarketOwner;
        const ix = await updateReserveConfigIx(signer, marketWithAddress.address, reserveAddress, encodedConfigUpdate.mode, encodedConfigUpdate.value, programId, shouldSkipValidation(encodedConfigUpdate.mode, reserve));
        return { ix, requiresGlobalAdmin };
    }));
}
// Updating the deposit/borrow limit will automatically unblock usage and force validation inside the smart contract
const VALIDATED_DISCRIMINATORS = [
    types_1.UpdateConfigMode.UpdateDepositLimit.discriminator,
    types_1.UpdateConfigMode.UpdateBorrowLimit.discriminator,
];
function shouldSkipValidation(mode, reserve) {
    if (VALIDATED_DISCRIMINATORS.includes(mode.discriminator)) {
        return false;
    }
    if (reserve == undefined) {
        return true;
    }
    const isUsed = reserve.liquidity.availableAmount.gtn(utils_1.MIN_INITIAL_DEPOSIT) ||
        reserve.liquidity.borrowedAmountSf.gtn(0) ||
        reserve.collateral.mintTotalSupply.gtn(utils_1.MIN_INITIAL_DEPOSIT);
    const isUsageBlocked = reserve.config.depositLimit.isZero() && reserve.config.borrowLimit.isZero();
    return isUsageBlocked && !isUsed;
}
/**
 * Returns a ReserveConfig matching the on-chain defaults after init_reserve
 * (status = Hidden, everything else zeroed).
 * Used as the baseline for diffing when no existing reserve config is available
 * (reserve does not exist on-chain yet)
 */
function defaultReserveConfig() {
    const layout = types_1.ReserveConfig.layout();
    const zeroed = types_1.ReserveConfig.fromDecoded(layout.decode(Buffer.alloc(layout.span)));
    return new types_1.ReserveConfig({ ...zeroed, status: types_1.ReserveStatus.Hidden.discriminator });
}
function buildReserveConfigPriority(previous, changed) {
    const currentLiquidationThreshold = previous?.liquidationThresholdPct ?? 0;
    const liquidationThresholdIncreasing = changed.liquidationThresholdPct > currentLiquidationThreshold;
    const autodeleverageDisabling = (previous?.autodeleverageEnabled ?? 0) !== 0 && changed.autodeleverageEnabled === 0;
    return (mode) => priorityOf(mode, liquidationThresholdIncreasing, autodeleverageDisabling);
}
// Lowest priority gets updated first
function priorityOf(mode, liquidationThresholdIncreasing = false, autodeleverageDisabling = false) {
    switch (mode.discriminator) {
        case types_1.UpdateConfigMode.UpdateScopePriceFeed.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoScopeTwap.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoScopeChain.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoLowerHeuristic.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoUpperHeuristic.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoExpHeuristic.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoTwapDivergence.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoName.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoPriceMaxAge.discriminator:
        case types_1.UpdateConfigMode.UpdateTokenInfoTwapMaxAge.discriminator:
        case types_1.UpdateConfigMode.UpdatePythPrice.discriminator:
        case types_1.UpdateConfigMode.UpdateSwitchboardFeed.discriminator:
        case types_1.UpdateConfigMode.UpdateSwitchboardTwapFeed.discriminator:
            return 0;
        // When disabling autodeleverage, it must be disabled before params can be zeroed out;
        // when enabling, params must be set first (non-zero) before autodeleverage can be enabled
        case types_1.UpdateConfigMode.UpdateDeleveragingBonusIncreaseBpsPerDay.discriminator:
        case types_1.UpdateConfigMode.UpdateDeleveragingMarginCallPeriod.discriminator:
        case types_1.UpdateConfigMode.UpdateDeleveragingThresholdDecreaseBpsPerDay.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateAutodeleverageEnabled()) + (autodeleverageDisabling ? 1 : -1);
        case types_1.UpdateConfigMode.UpdateAutodeleverageEnabled.discriminator:
            return 4;
        case types_1.UpdateConfigMode.UpdateBorrowFactor.discriminator:
            return 6;
        case types_1.UpdateConfigMode.UpdateLoanToValuePct.discriminator:
            return 8;
        // LiquidationThreshold >= LTV must always hold
        // If liquidation threshold is increasing, update it first
        // All other cases, we update LTV first
        case types_1.UpdateConfigMode.UpdateLiquidationThresholdPct.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateLoanToValuePct()) + (liquidationThresholdIncreasing ? -1 : 1);
        // Always update last bc we cannot skip validation
        case types_1.UpdateConfigMode.UpdateElevationGroup.discriminator:
        case types_1.UpdateConfigMode.UpdateBorrowLimitsInElevationGroupAgainstThisReserve.discriminator:
        case types_1.UpdateConfigMode.UpdateMinLiquidationBonusBps.discriminator:
            return 62;
        case types_1.UpdateConfigMode.UpdateDepositLimit.discriminator:
        case types_1.UpdateConfigMode.UpdateMaxLiquidationBonusBps.discriminator:
            return 63;
        case types_1.UpdateConfigMode.UpdateBorrowLimit.discriminator:
            return 63;
        default:
            return 10;
    }
}
//# sourceMappingURL=reserve.js.map
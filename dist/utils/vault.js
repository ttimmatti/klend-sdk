"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeVaultState = decodeVaultState;
exports.decodeReserveWhitelistEntry = decodeReserveWhitelistEntry;
const accounts_1 = require("../@codegen/kvault/accounts");
const VaultState_1 = require("../@codegen/kvault/accounts/VaultState");
const VaultAllocation_1 = require("../@codegen/kvault/types/VaultAllocation");
const VaultRewardInfo_1 = require("../@codegen/kvault/types/VaultRewardInfo");
function decodeVaultState(data) {
    if (!VaultState_1.VaultState.discriminator.equals(data.slice(0, 8))) {
        throw new Error('invalid account discriminator');
    }
    const dec = VaultState_1.VaultState.layout.decode(data.slice(8));
    return new VaultState_1.VaultState({
        vaultAdminAuthority: dec.vaultAdminAuthority,
        baseVaultAuthority: dec.baseVaultAuthority,
        baseVaultAuthorityBump: dec.baseVaultAuthorityBump,
        tokenMint: dec.tokenMint,
        tokenMintDecimals: dec.tokenMintDecimals,
        tokenVault: dec.tokenVault,
        tokenProgram: dec.tokenProgram,
        sharesMint: dec.sharesMint,
        sharesMintDecimals: dec.sharesMintDecimals,
        tokenAvailable: dec.tokenAvailable,
        sharesIssued: dec.sharesIssued,
        availableCrankFunds: dec.availableCrankFunds,
        unallocatedWeight: dec.unallocatedWeight,
        unallocatedTokensCap: dec.unallocatedTokensCap,
        performanceFeeBps: dec.performanceFeeBps,
        managementFeeBps: dec.managementFeeBps,
        lastFeeChargeTimestamp: dec.lastFeeChargeTimestamp,
        prevAumSf: dec.prevAumSf,
        pendingFeesSf: dec.pendingFeesSf,
        vaultAllocationStrategy: dec.vaultAllocationStrategy.map((item /* eslint-disable-line @typescript-eslint/no-explicit-any */) => VaultAllocation_1.VaultAllocation.fromDecoded(item)),
        padding1: dec.padding1,
        minDepositAmount: dec.minDepositAmount,
        minWithdrawAmount: dec.minWithdrawAmount,
        minInvestAmount: dec.minInvestAmount,
        minInvestDelaySlots: dec.minInvestDelaySlots,
        crankFundFeePerReserve: dec.crankFundFeePerReserve,
        pendingAdmin: dec.pendingAdmin,
        cumulativeEarnedInterestSf: dec.cumulativeEarnedInterestSf,
        cumulativeMgmtFeesSf: dec.cumulativeMgmtFeesSf,
        cumulativePerfFeesSf: dec.cumulativePerfFeesSf,
        name: dec.name,
        vaultLookupTable: dec.vaultLookupTable,
        vaultFarm: dec.vaultFarm,
        creationTimestamp: dec.creationTimestamp,
        allocationAdmin: dec.allocationAdmin,
        withdrawalPenaltyLamports: dec.withdrawalPenaltyLamports,
        withdrawalPenaltyBps: dec.withdrawalPenaltyBps,
        padding2: dec.padding2,
        firstLossCapitalFarm: dec.firstLossCapitalFarm,
        allowAllocationsInWhitelistedReservesOnly: dec.allowAllocationsInWhitelistedReservesOnly,
        allowInvestInWhitelistedReservesOnly: dec.allowInvestInWhitelistedReservesOnly,
        rewardInfo: new VaultRewardInfo_1.VaultRewardInfo({ ...dec.rewardInfo }),
        padding3: dec.padding3,
    });
}
function decodeReserveWhitelistEntry(data) {
    if (!accounts_1.ReserveWhitelistEntry.discriminator.equals(data.slice(0, 8))) {
        throw new Error('invalid account discriminator');
    }
    const dec = accounts_1.ReserveWhitelistEntry.layout.decode(data.slice(8));
    return new accounts_1.ReserveWhitelistEntry({
        tokenMint: dec.tokenMint,
        reserve: dec.reserve,
        whitelistAddAllocation: dec.whitelistAddAllocation,
        whitelistInvest: dec.whitelistInvest,
        padding: dec.padding,
    });
}
//# sourceMappingURL=vault.js.map
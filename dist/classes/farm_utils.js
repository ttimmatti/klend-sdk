"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FARMS_ADMIN_MAINNET = exports.FARMS_GLOBAL_CONFIG_DEVNET = exports.FARMS_GLOBAL_CONFIG_MAINNET = void 0;
exports.getFarmStakeIxs = getFarmStakeIxs;
exports.getFarmUserStatePDA = getFarmUserStatePDA;
exports.getFarmUnstakeIx = getFarmUnstakeIx;
exports.getFarmWithdrawUnstakedDepositIx = getFarmWithdrawUnstakedDepositIx;
exports.getFarmUnstakeAndWithdrawIxs = getFarmUnstakeAndWithdrawIxs;
exports.getSetupFarmIxsWithFarm = getSetupFarmIxsWithFarm;
exports.getUserSharesInTokensStakedInFarm = getUserSharesInTokensStakedInFarm;
exports.setVaultIdForFarmIx = setVaultIdForFarmIx;
exports.getSharesInFarmUserPosition = getSharesInFarmUserPosition;
exports.getRewardPerTimeUnitSecond = getRewardPerTimeUnitSecond;
exports.getUserPendingRewardsInFarm = getUserPendingRewardsInFarm;
const farms_sdk_1 = require("@kamino-finance/farms-sdk");
const kit_1 = require("@solana/kit");
const decimal_1 = __importDefault(require("decimal.js/decimal"));
const utils_1 = require("../utils");
const option_1 = require("@kamino-finance/farms-sdk/dist/utils/option");
exports.FARMS_GLOBAL_CONFIG_MAINNET = (0, kit_1.address)('6UodrBjL2ZreDy7QdR4YV1oxqMBjVYSEyrFpctqqwGwL');
exports.FARMS_GLOBAL_CONFIG_DEVNET = (0, kit_1.address)('5AnzjL3J8FKpQuC1VN7ABRwrFTjdsuaoWEyxYz68rZFb');
exports.FARMS_ADMIN_MAINNET = (0, kit_1.address)('BbM3mbcLsa3QcYEVx8iovwfKaA1iZ6DK5fEbbtHwS3N8');
async function getFarmStakeIxs(rpc, user, lamportsToStake, farmAddress, fetchedFarmState, farmsProgramId) {
    const farmState = fetchedFarmState ? fetchedFarmState : await farms_sdk_1.FarmState.fetch(rpc, farmAddress, farmsProgramId);
    if (!farmState) {
        throw new Error(`Farm state not found for ${farmAddress}`);
    }
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    const scopePricesArg = (0, option_1.getScopePricesFromFarm)(farmState);
    const stakeIxs = [];
    const userState = await (0, farms_sdk_1.getUserStatePDA)(farmClient.getProgramID(), farmAddress, user.address);
    const userStateExists = await (0, kit_1.fetchEncodedAccount)(rpc, userState);
    if (!userStateExists.exists) {
        const createUserIx = await farmClient.createNewUserIx(user, farmAddress);
        stakeIxs.push(createUserIx);
    }
    const stakeIx = await farmClient.stakeIx(user, farmAddress, lamportsToStake, farmState.token.mint, scopePricesArg);
    stakeIxs.push(stakeIx);
    return stakeIxs;
}
async function getFarmUserStatePDA(rpc, user, farm, farmsProgramId) {
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    return (0, farms_sdk_1.getUserStatePDA)(farmClient.getProgramID(), farm, user);
}
async function getFarmUnstakeIx(rpc, user, lamportsToUnstake, farmAddress, fetchedFarmState, farmsProgramId) {
    const farmState = fetchedFarmState ? fetchedFarmState : await farms_sdk_1.FarmState.fetch(rpc, farmAddress, farmsProgramId);
    if (!farmState) {
        throw new Error(`Farm state not found for ${farmAddress}`);
    }
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    const scopePricesArg = (0, option_1.getScopePricesFromFarm)(farmState);
    const scaledLamportsToUnstake = lamportsToUnstake.floor().mul(farms_sdk_1.WAD);
    return farmClient.unstakeIx(user, farmAddress, scaledLamportsToUnstake, scopePricesArg);
}
// withdrawing from a farm is a 2 step operation: first we unstake the tokens from the farm, then we withdraw them
async function getFarmWithdrawUnstakedDepositIx(rpc, user, farm, stakeTokenMint, farmsProgramId) {
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    const userState = await (0, farms_sdk_1.getUserStatePDA)(farmClient.getProgramID(), farm, user.address);
    return farmClient.withdrawUnstakedDepositIx(user, userState, farm, stakeTokenMint);
}
async function getFarmUnstakeAndWithdrawIxs(connection, user, lamportsToUnstake, farmAddress, fetchedFarmState, farmsProgramId) {
    const farmState = fetchedFarmState
        ? fetchedFarmState
        : await farms_sdk_1.FarmState.fetch(connection, farmAddress, farmsProgramId);
    if (!farmState) {
        throw new Error(`Farm state not found for ${farmAddress}`);
    }
    const unstakeIx = await getFarmUnstakeIx(connection, user, lamportsToUnstake, farmAddress, farmState, farmsProgramId);
    const withdrawIx = await getFarmWithdrawUnstakedDepositIx(connection, user, farmAddress, farmState.token.mint, farmsProgramId);
    return { unstakeIx, withdrawIx };
}
async function getSetupFarmIxsWithFarm(connection, farmAdmin, farmTokenMint, farmsGlobalConfig = exports.FARMS_GLOBAL_CONFIG_MAINNET, farmsProgramId) {
    const farmClient = new farms_sdk_1.Farms(connection, farmsProgramId);
    const farm = await (0, kit_1.generateKeyPairSigner)();
    const ixs = await farmClient.createFarmIxs(farmAdmin, farm, farmsGlobalConfig, farmTokenMint);
    return { farm, setupFarmIxs: ixs };
}
/**
 * Returns the number of tokens the user has staked in the farm
 * @param connection - the connection to the cluster
 * @param user - the user's public key
 * @param farm - the farm's public key
 * @param farmTokenDecimals - the decimals of the farm token
 * @returns the number of tokens the user has staked in the farm
 */
async function getUserSharesInTokensStakedInFarm(rpc, user, farm, farmTokenDecimals, farmsProgramId) {
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    const userStatePDA = await (0, farms_sdk_1.getUserStatePDA)(farmClient.getProgramID(), farm, user);
    // if the user state does not exist, return 0
    const userState = await (0, kit_1.fetchEncodedAccount)(rpc, userStatePDA);
    if (!userState.exists) {
        return new decimal_1.default(0);
    }
    // if the user state exists, return the user shares if it is more than 1 lamport
    const stakedTokens = await farmClient.getUserTokensInUndelegatedFarm(user, farm, farmTokenDecimals);
    const stakedLamports = (0, farms_sdk_1.collToLamportsDecimal)(stakedTokens, farmTokenDecimals);
    if (stakedLamports.lt(new decimal_1.default(1))) {
        return new decimal_1.default(0);
    }
    return stakedTokens;
}
async function setVaultIdForFarmIx(rpc, farmAdmin, farm, vault, farmsProgramId) {
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    return farmClient.updateFarmConfigIx(farmAdmin, farm, utils_1.DEFAULT_PUBLIC_KEY, new farms_sdk_1.FarmConfigOption.UpdateVaultId(), vault);
}
/**
 * Returns the number of shares the user has in the farm, in tokens. If less than 1 lamport is staked, returns 0.
 * @param userState - the user's state in the farm
 * @param tokenDecimals - the decimals of the farm token
 * @returns the number of shares the user has in the farm, in tokens
 */
function getSharesInFarmUserPosition(userState, tokenDecimals) {
    const stakedLamports = new decimal_1.default((0, farms_sdk_1.scaleDownWads)(userState.activeStakeScaled));
    if (stakedLamports.lt(new decimal_1.default(1))) {
        return new decimal_1.default(0);
    }
    return (0, farms_sdk_1.lamportsToCollDecimal)(stakedLamports, tokenDecimals);
}
function getRewardPerTimeUnitSecond(reward, farmTotalStakeLamports) {
    const now = new decimal_1.default(new Date().getTime()).div(1000);
    let rewardPerTimeUnitSecond = new decimal_1.default(0);
    for (let i = 0; i < reward.rewardScheduleCurve.points.length - 1; i++) {
        const { tsStart: tsStartThisPoint, rewardPerTimeUnit } = reward.rewardScheduleCurve.points[i];
        const { tsStart: tsStartNextPoint } = reward.rewardScheduleCurve.points[i + 1];
        const thisPeriodStart = new decimal_1.default(tsStartThisPoint.toString());
        const thisPeriodEnd = new decimal_1.default(tsStartNextPoint.toString());
        const rps = new decimal_1.default(rewardPerTimeUnit.toString());
        if (thisPeriodStart <= now && thisPeriodEnd >= now) {
            rewardPerTimeUnitSecond = rps;
            break;
        }
        else if (thisPeriodStart > now && thisPeriodEnd > now) {
            rewardPerTimeUnitSecond = rps;
            break;
        }
    }
    const rewardTokenDecimals = reward.token.decimals.toNumber();
    const rewardAmountPerUnitDecimals = new decimal_1.default(10).pow(reward.rewardsPerSecondDecimals.toString());
    const rewardAmountPerUnitLamports = new decimal_1.default(10).pow(rewardTokenDecimals.toString());
    const constantRewardStakeAdjustment = reward.rewardType === farms_sdk_1.RewardType.Constant.discriminator ? farmTotalStakeLamports : new decimal_1.default(1);
    const rpsAdjusted = new decimal_1.default(rewardPerTimeUnitSecond.toString())
        .mul(constantRewardStakeAdjustment)
        .div(rewardAmountPerUnitDecimals)
        .div(rewardAmountPerUnitLamports);
    return rewardPerTimeUnitSecond ? rpsAdjusted : new decimal_1.default(0);
}
/**
 * reads the pending rewards for a user in a vault farm
 * @param rpc - the rpc connection
 * @param userStateAddress - the address of the user state (computed differently depending on farm type)
 * @param farm - the address of the farm
 * @returns a map of the pending rewards per token
 */
async function getUserPendingRewardsInFarm(rpc, userStateAddress, farm, farmsProgramId) {
    const pendingRewardsPerToken = new Map();
    const farmClient = new farms_sdk_1.Farms(rpc, farmsProgramId);
    // if the user state does not exist, return 0
    const userStateAccountInfo = await (0, kit_1.fetchEncodedAccount)(rpc, userStateAddress);
    if (!userStateAccountInfo.exists) {
        return pendingRewardsPerToken;
    }
    const userState = farms_sdk_1.UserState.decode(Buffer.from(userStateAccountInfo.data));
    const farmState = await farms_sdk_1.FarmState.fetch(rpc, farm, farmsProgramId);
    if (!farmState) {
        throw new Error(`Farm state not found for ${farm}`);
    }
    const currentTimestamp = new decimal_1.default(new Date().getTime() / 1000);
    const rawRewards = farmClient.getUserPendingRewards(userState, farmState, currentTimestamp, null);
    if (!rawRewards.hasReward) {
        return pendingRewardsPerToken;
    }
    for (let i = 0; i < rawRewards.userPendingRewardAmounts.length; i++) {
        const reward = rawRewards.userPendingRewardAmounts[i];
        const rewardToken = farmState.rewardInfos[i].token.mint;
        const existingReward = pendingRewardsPerToken.get(rewardToken);
        if (existingReward) {
            pendingRewardsPerToken.set(rewardToken, existingReward.add(reward));
        }
        else {
            pendingRewardsPerToken.set(rewardToken, reward);
        }
    }
    return pendingRewardsPerToken;
}
//# sourceMappingURL=farm_utils.js.map
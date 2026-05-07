"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const commander_1 = require("commander");
const kit_1 = require("@solana/kit");
const lib_1 = require("../lib");
const types_1 = require("../@codegen/klend/types");
const fraction_1 = require("../classes/fraction");
const curve_1 = require("../classes/curve");
const decimal_js_1 = __importDefault(require("decimal.js"));
const bn_js_1 = __importDefault(require("bn.js"));
const types_2 = require("../@codegen/kvault/types");
const accounts_1 = require("../@codegen/kvault/accounts");
const vault_1 = require("../classes/vault");
const api_1 = require("../utils/api");
const fs = __importStar(require("fs"));
const VaultConfigField_1 = require("../@codegen/kvault/types/VaultConfigField");
const rpc_1 = require("../utils/rpc");
const token_2022_1 = require("@solana-program/token-2022");
const ManagerEnv_1 = require("./tx/ManagerEnv");
const processor_1 = require("./tx/processor");
const priorityFee_1 = require("../client/tx/priorityFee");
const address_lookup_table_1 = require("@solana-program/address-lookup-table");
const signer_1 = require("../utils/signer");
dotenv_1.default.config({
    path: `.env${process.env.ENV ? '.' + process.env.ENV : ''}`,
});
async function main() {
    const commands = new commander_1.Command();
    commands.name('kamino-manager-cli').description('CLI to interact with the kvaults and klend programs');
    commands
        .command('init-kvault-global-config')
        .requiredOption('--mode <string>', 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option('--signer-path <string>', 'If set, it will use the provided signer')
        .action(async ({ mode, staging, devnet, multisig, signerPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, signerPath, undefined, devnet);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        let signer = undefined;
        if (signerPath) {
            signer = await (0, signer_1.parseKeypairFile)(signerPath);
        }
        else {
            const programData = await (0, lib_1.programDataPda)(env.kvaultProgramId);
            const programDataInfo = await env.c.rpc.getAccountInfo(programData).send();
            if (programDataInfo === null) {
                throw new Error('KVault program data not found');
            }
            const programAdmin = programDataInfo.value?.owner.toString();
            if (!programAdmin) {
                throw new Error('Program admin not found');
            }
            signer = (0, signer_1.noopSigner)((0, kit_1.address)(programAdmin));
        }
        const ix = await kaminoManager.initKvaultGlobalConfigIx(signer);
        await (0, processor_1.processTx)(env.c, signer, [
            ix,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('KVault global config initialized');
    });
    commands
        .command('update-kvault-global-config')
        .requiredOption('--mode <string>', 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--field <string>', 'The field to update')
        .requiredOption('--value <string>', 'The value to update the field to')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option('--signer-path <string>', 'If set, it will use the provided signer')
        .action(async ({ mode, field, value, staging, devnet, multisig, signerPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, signerPath, undefined, devnet);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        let signer = undefined;
        if (signerPath) {
            signer = await (0, signer_1.parseKeypairFile)(signerPath);
        }
        else {
            const globalConfigAddress = await (0, lib_1.getKvaultGlobalConfigPda)(env.kvaultProgramId);
            const globalConfigState = await lib_1.KVaultGlobalConfig.fetch(env.c.rpc, globalConfigAddress);
            if (!globalConfigState) {
                throw new Error('Global config not found');
            }
            signer = (0, signer_1.noopSigner)((0, kit_1.address)(globalConfigState.globalAdmin));
        }
        const vaultClient = kaminoManager.getKaminoVaultClient();
        const ix = await vaultClient.updateGlobalConfigIx(field, value);
        await (0, processor_1.processTx)(env.c, signer, [ix, ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({ priorityFeeMultiplier: 2500 })], mode, []);
        mode === 'execute' && console.log(`Global config updated to ${value} for field ${field}`);
    });
    commands
        .command('accept-kvault-global-config-ownership')
        .requiredOption('--mode <string>', 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option('--signer-path <string>', 'If set, it will use the provided signer')
        .action(async ({ mode, staging, devnet, multisig, signerPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        let signer = undefined;
        if (signerPath) {
            signer = await (0, signer_1.parseKeypairFile)(signerPath);
        }
        else {
            const globalConfigAddress = await (0, lib_1.getKvaultGlobalConfigPda)(env.kvaultProgramId);
            const globalConfigState = await lib_1.KVaultGlobalConfig.fetch(env.c.rpc, globalConfigAddress);
            if (!globalConfigState) {
                throw new Error('Global config not found');
            }
            signer = (0, signer_1.noopSigner)((0, kit_1.address)(globalConfigState.pendingAdmin));
        }
        const vaultClient = kaminoManager.getKaminoVaultClient();
        const ix = await vaultClient.acceptGlobalConfigOwnershipIx(signer);
        await (0, processor_1.processTx)(env.c, signer, [ix, ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({ priorityFeeMultiplier: 2500 })], mode, []);
        mode === 'execute' && console.log('Global config ownership accepted');
    });
    commands
        .command('create-vault')
        .requiredOption('--mint <string>', 'Vault token mint')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--name <string>', 'The onchain name of the strat')
        .requiredOption('--tokenName <string>', 'The name of the token in the vault')
        .requiredOption('--extraTokenName <string>', 'The extra string appended to the token symbol')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .action(async ({ mint, mode, name, tokenName, extraTokenName, staging, devnet, multisig }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const tokenMint = (0, kit_1.address)(mint);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const admin = await env.getSigner();
        const tokenProgramID = await (0, rpc_1.getAccountOwner)(env.c.rpc, tokenMint);
        const kaminoVaultConfig = new lib_1.KaminoVaultConfig({
            admin,
            tokenMint: tokenMint,
            tokenMintProgramId: tokenProgramID,
            performanceFeeRatePercentage: new decimal_js_1.default(0.0),
            managementFeeRatePercentage: new decimal_js_1.default(0.0),
            name,
            vaultTokenSymbol: tokenName,
            vaultTokenName: extraTokenName,
        });
        const useDevnetFarms = devnet ? true : false;
        const { vault: vaultKp, initVaultIxs: instructions } = await kaminoManager.createVaultIxs(kaminoVaultConfig, useDevnetFarms);
        await (0, processor_1.processTx)(env.c, admin, [
            ...instructions.createAtaIfNeededIxs,
            ...instructions.initVaultIxs,
            instructions.createLUTIx,
            instructions.setFarmToVaultIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        await (0, lib_1.sleep)(2000);
        // create the farm
        await (0, processor_1.processTx)(env.c, admin, [
            ...instructions.createVaultFarm.setupFarmIxs,
            ...instructions.createVaultFarm.updateFarmIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        await (0, lib_1.sleep)(2000);
        await (0, processor_1.processTx)(env.c, admin, [
            ...instructions.populateLUTIxs,
            ...instructions.cleanupIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        await (0, processor_1.processTx)(env.c, admin, [
            instructions.initSharesMetadataIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Vault created:', vaultKp.address);
    });
    commands
        .command('set-shares-metadata')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--symbol <string>', 'The symbol of the kVault token')
        .requiredOption('--extraName <string>', 'The name of the kVault token, appended to the symbol')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, mode, symbol, extraName, staging, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(undefined, staging);
        const kVault = new lib_1.KaminoVault(env.c.rpc, (0, kit_1.address)(vault));
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultState = await kVault.getState();
        const signer = await env.getSigner({ vaultState });
        const ix = await kaminoManager.getSetSharesMetadataIx(signer, kVault, symbol, extraName);
        await (0, processor_1.processTx)(env.c, signer, [
            ix,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
    });
    commands
        .command('update-vault-pending-admin')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--new-admin <string>', 'Pubkey of the new admin')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, newAdmin, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const instructions = await kaminoManager.updateVaultConfigIxs(kaminoVault, new VaultConfigField_1.PendingVaultAdmin(), newAdmin, signer, undefined, true);
        await (0, processor_1.processTx)(env.c, signer, [
            instructions.updateVaultConfigIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log(`Pending admin updated to ${newAdmin}`);
    });
    commands
        .command('update-vault-config')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--field <string>', 'The field to update')
        .requiredOption('--value <string>', 'The value to update the field to')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--skip-lut-update`, 'If set, it will skip the LUT update')
        .option(`--lutSigner <string>`, 'If set, it will use the provided signer instead of the default one for the LUT update')
        .option(`--global-admin <string>`, 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode). Required when setting AllowInvestInWhitelistedReservesOnly or AllowAllocationsInWhitelistedReservesOnly to false')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--error-on-override`, 'If set, it will throw an error if the vault already has a farm, if you want to override it set errorOnOverride to false')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, field, value, mode, staging, devnet, skipLutUpdate, lutSigner, globalAdmin, multisig, errorOnOverride, CU: cu, }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        // Use global admin signer if provided, otherwise fall back to vault admin/noop signer depending on mode
        let signer;
        if (mode === 'multisig' && globalAdmin) {
            signer = (0, signer_1.noopSigner)((0, kit_1.address)(globalAdmin));
        }
        else if (globalAdmin) {
            signer = await (0, signer_1.parseKeypairFile)(globalAdmin);
        }
        else {
            signer = await env.getSigner({ vaultState });
        }
        let lutSignerOrUndefined = undefined;
        if (lutSigner) {
            lutSignerOrUndefined = await (0, signer_1.parseKeypairFile)(lutSigner);
        }
        const shouldSkipLutUpdate = !!skipLutUpdate;
        const instructions = await kaminoManager.updateVaultConfigIxs(kaminoVault, field, value, signer, lutSignerOrUndefined, shouldSkipLutUpdate, errorOnOverride);
        await (0, processor_1.processTx)(env.c, signer, [
            instructions.updateVaultConfigIx,
            ...instructions.updateLUTIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Vault updated');
    });
    commands
        .command('add-update-whitelisted-reserve')
        .requiredOption('--reserve <string>', 'Reserve address to whitelist')
        .requiredOption('--whitelist-mode <string>', 'Whitelist mode: "Invest" or "AddAllocation"')
        .requiredOption('--value <string>', 'Value: "1" or "true" to add to whitelist, "0" or "false" to remove from whitelist')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--global-admin <string>', 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode)')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ reserve, whitelistMode, value, mode, globalAdmin, staging, devnet, multisig, CU: cu }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const reserveAddress = (0, kit_1.address)(reserve);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        // Parse the value (1/true = add, 0/false = remove)
        const flagValue = (0, lib_1.parseBooleanFlag)(value);
        // Parse the whitelist mode
        let whitelistModeEnum;
        if (whitelistMode === 'Invest') {
            whitelistModeEnum = new types_2.UpdateReserveWhitelistMode.Invest([flagValue]);
        }
        else if (whitelistMode === 'AddAllocation') {
            whitelistModeEnum = new types_2.UpdateReserveWhitelistMode.AddAllocation([flagValue]);
        }
        else {
            throw new Error(`Invalid whitelist mode '${whitelistMode}'. Expected 'Invest' or 'AddAllocation'.`);
        }
        let globalAdminSigner;
        if (mode === 'multisig') {
            globalAdminSigner = (0, signer_1.noopSigner)((0, kit_1.address)(globalAdmin));
        }
        else {
            globalAdminSigner = await (0, signer_1.parseKeypairFile)(globalAdmin);
        }
        const instruction = await kaminoManager.addUpdateWhitelistedReserveIx(reserveAddress, whitelistModeEnum, globalAdminSigner);
        await (0, processor_1.processTx)(env.c, globalAdminSigner, [
            instruction,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' &&
            console.log(`Reserve ${reserveAddress} whitelisted for ${whitelistMode} with value ${flagValue ? 'ALLOW' : 'DENY'}`);
    });
    commands
        .command('whitelist-reserves')
        .requiredOption('--reserves-file <string>', 'Path to a file containing newline-separated reserve addresses to whitelist')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--global-admin <string>', 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode)')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ reservesFile, mode, globalAdmin, staging, multisig, CU: cu }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const fileContent = fs.readFileSync(reservesFile, 'utf-8');
        const reserveAddresses = fileContent
            .split('\n')
            .map((r) => r.trim())
            .filter((r) => r.length > 0)
            .map((r) => (0, kit_1.address)(r));
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        let globalAdminSigner;
        if (mode === 'multisig') {
            globalAdminSigner = (0, signer_1.noopSigner)((0, kit_1.address)(globalAdmin));
        }
        else {
            globalAdminSigner = await (0, signer_1.parseKeypairFile)(globalAdmin);
        }
        const instructions = [];
        for (const reserveAddress of reserveAddresses) {
            let instruction = await kaminoManager.addUpdateWhitelistedReserveIx(reserveAddress, new types_2.UpdateReserveWhitelistMode.Invest([1]), globalAdminSigner);
            instructions.push(instruction);
            instruction = await kaminoManager.addUpdateWhitelistedReserveIx(reserveAddress, new types_2.UpdateReserveWhitelistMode.AddAllocation([1]), globalAdminSigner);
            instructions.push(instruction);
        }
        // batch the instructions in groups of 6
        const batchSize = 6;
        const batchInstructions = [];
        for (let i = 0; i < instructions.length; i += batchSize) {
            batchInstructions.push(instructions.slice(i, i + batchSize));
        }
        for (const batch of batchInstructions) {
            await (0, processor_1.processTx)(env.c, globalAdminSigner, [...batch, ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({ priorityFeeMultiplier: 2500, computeUnits })], mode, []);
        }
    });
    commands
        .command('backfill-whitelisted-reserves')
        .option('--value <string>', 'Value: "1" or "true" to add to whitelist, "0" or "false" to remove from whitelist', '1')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .requiredOption('--global-admin <string>', 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode)')
        .option(`--markets <string>`, 'Comma-separated list of market addresses. If not provided, all markets will be processed')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ value, mode, globalAdmin, markets, staging, devnet, multisig, CU: cu }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        let globalAdminSigner;
        if (mode === 'multisig') {
            globalAdminSigner = (0, signer_1.noopSigner)((0, kit_1.address)(globalAdmin));
        }
        else {
            globalAdminSigner = await (0, signer_1.parseKeypairFile)(globalAdmin);
        }
        // Get markets to process
        let marketsToProcess;
        if (markets) {
            const marketAddresses = markets.split(',').map((m) => (0, kit_1.address)(m.trim()));
            console.log(`Processing ${marketAddresses.length} specified markets...`);
            marketsToProcess = await Promise.all(marketAddresses.map(async (marketAddress) => {
                const market = await lib_1.KaminoMarket.load(env.c.rpc, marketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId);
                if (!market) {
                    throw new Error(`Market ${marketAddress} not found`);
                }
                return market;
            }));
        }
        else {
            console.log('Fetching all markets...');
            marketsToProcess = await kaminoManager.getAllMarkets(env.klendProgramId);
            console.log(`Found ${marketsToProcess.length} markets`);
        }
        // Collect all reserves from all markets
        const allReserves = [];
        for (const market of marketsToProcess) {
            const marketName = (0, lib_1.parseTokenSymbol)(market.state.name);
            const reserveAddresses = Array.from(market.reserves.keys());
            console.log(`Market ${market.getAddress()} (${marketName}): ${reserveAddresses.length} reserves`);
            allReserves.push(...reserveAddresses);
        }
        console.log(`\nTotal reserves to whitelist: ${allReserves.length}`);
        console.log(`Whitelist modes: Invest AND AddAllocation (both will be set)`);
        // Parse the value (1/true = add, 0/false = remove)
        const flagValue = (0, lib_1.parseBooleanFlag)(value);
        console.log(`Action: ${flagValue ? 'ADD to whitelist' : 'REMOVE from whitelist'}`);
        if (mode === 'simulate') {
            console.log('\nSimulation mode - no transactions will be executed');
        }
        // Create whitelist mode enums for both Invest and AddAllocation
        const investModeEnum = new types_2.UpdateReserveWhitelistMode.Invest([flagValue]);
        const addAllocationModeEnum = new types_2.UpdateReserveWhitelistMode.AddAllocation([flagValue]);
        // Process each reserve with both whitelist modes
        let successCount = 0;
        let errorCount = 0;
        for (const reserveAddress of allReserves) {
            try {
                const investInstruction = await kaminoManager.addUpdateWhitelistedReserveIx(reserveAddress, investModeEnum, globalAdminSigner);
                const addAllocationInstruction = await kaminoManager.addUpdateWhitelistedReserveIx(reserveAddress, addAllocationModeEnum, globalAdminSigner);
                await (0, processor_1.processTx)(env.c, globalAdminSigner, [
                    investInstruction,
                    addAllocationInstruction,
                    ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                        priorityFeeMultiplier: 2500,
                        computeUnits,
                    }),
                ], mode, []);
                successCount++;
                console.log(`✓ [${successCount}/${allReserves.length}] ${reserveAddress} (Invest + AddAllocation)`);
            }
            catch (error) {
                errorCount++;
                console.error(`✗ Failed to whitelist ${reserveAddress}:`, error);
            }
        }
        console.log(`\nBackfill complete!`);
        console.log(`Success: ${successCount} reserves (both modes set)`);
        console.log(`Errors: ${errorCount}`);
    });
    commands
        .command('is-reserve-whitelisted')
        .requiredOption('--reserve <string>', 'Reserve address to check')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ reserve, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const reserveAddress = (0, kit_1.address)(reserve);
        const pda = await (0, vault_1.getReserveWhitelistEntryPda)(reserveAddress, env.kvaultProgramId);
        const entry = await accounts_1.ReserveWhitelistEntry.fetch(env.c.rpc, pda, env.kvaultProgramId);
        if (!entry) {
            console.log(`Reserve ${reserveAddress}`);
            console.log(`  PDA: ${pda} (not initialized)`);
            console.log(`  whitelistInvest: 0`);
            console.log(`  whitelistAddAllocation: 0`);
        }
        else {
            console.log(`Reserve ${reserveAddress}`);
            console.log(`  PDA: ${pda}`);
            console.log(`  tokenMint: ${entry.tokenMint}`);
            console.log(`  whitelistInvest: ${entry.whitelistInvest}`);
            console.log(`  whitelistAddAllocation: ${entry.whitelistAddAllocation}`);
        }
    });
    commands
        .command('check-whitelist-for-mint')
        .requiredOption('--mint <string>', 'Token mint address to check across all UI markets')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ mint, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const tokenMint = (0, kit_1.address)(mint);
        const marketsConfig = await (0, api_1.getMarketsFromApi)({ api: { programId: env.klendProgramId } });
        console.log(`Found ${marketsConfig.length} UI markets from CDN\n`);
        const markets = await Promise.all(marketsConfig.map(async (cfg) => {
            const market = await lib_1.KaminoMarket.load(env.c.rpc, (0, kit_1.address)(cfg.lendingMarket), lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId);
            return { cfg, market };
        }));
        // Collect all reserves for this mint across all markets
        const reserveEntries = [];
        for (const { cfg, market } of markets) {
            if (!market)
                continue;
            const reserve = market.getReserveByMint(tokenMint);
            if (reserve) {
                reserveEntries.push({
                    marketName: cfg.name,
                    marketAddress: cfg.lendingMarket,
                    reserveAddress: reserve.address,
                    symbol: reserve.symbol,
                });
            }
        }
        if (reserveEntries.length === 0) {
            console.log(`No reserves found for mint ${tokenMint} in any UI market`);
            return;
        }
        // Derive all PDAs and batch-fetch whitelist entries
        const pdas = await Promise.all(reserveEntries.map((e) => (0, vault_1.getReserveWhitelistEntryPda)(e.reserveAddress, env.kvaultProgramId)));
        const entries = await accounts_1.ReserveWhitelistEntry.fetchMultiple(env.c.rpc, pdas, env.kvaultProgramId);
        let missingCount = 0;
        for (let i = 0; i < reserveEntries.length; i++) {
            const r = reserveEntries[i];
            const entry = entries[i];
            const pda = pdas[i];
            const invest = entry ? entry.whitelistInvest : 0;
            const addAlloc = entry ? entry.whitelistAddAllocation : 0;
            const pdaStatus = entry ? 'initialized' : 'NOT initialized';
            const isMissing = !entry || invest === 0 || addAlloc === 0;
            if (isMissing) {
                missingCount++;
                console.log(`[MISSING] ${r.symbol} reserve ${r.reserveAddress} in market "${r.marketName}" (${r.marketAddress})`);
                console.log(`  PDA: ${pda} (${pdaStatus})`);
                console.log(`  whitelistInvest: ${invest}`);
                console.log(`  whitelistAddAllocation: ${addAlloc}`);
                console.log('');
            }
        }
        if (missingCount === 0) {
            console.log(`All ${reserveEntries.length} reserves for mint ${tokenMint} are fully whitelisted (Invest + AddAllocation)`);
        }
        else {
            console.log(`${missingCount}/${reserveEntries.length} reserves need whitelisting`);
        }
    });
    commands
        .command('update-vault-mgmt-fee')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--fee-bps <string>', 'Management fee to set (in basis points)')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, feeBps, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const instructions = await kaminoManager.updateVaultConfigIxs(kaminoVault, new VaultConfigField_1.ManagementFeeBps(), feeBps, signer);
        await (0, processor_1.processTx)(env.c, signer, [
            instructions.updateVaultConfigIx,
            ...instructions.updateLUTIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Management fee updated');
    });
    commands
        .command('insert-into-lut')
        .requiredOption('--lut <string>', 'Lookup table address')
        .requiredOption('--addresses <string>', 'The addresses to insert into the LUT, space separated')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--signer <string>`, 'If set, it will use the provided signer instead of the default one')
        .action(async ({ lut, addresses, mode, staging, devnet, multisig, signer }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const lutAddress = (0, kit_1.address)(lut);
        let txSigner = await env.getSigner();
        // if the signer is provided (path to a keypair) we use it, otherwise we use the default one
        if (signer) {
            txSigner = await (0, signer_1.parseKeypairFile)(signer);
        }
        const addressesArr = addresses.split(' ').map((a) => (0, kit_1.address)(a));
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const instructions = await kaminoManager.insertIntoLutIxs(txSigner, lutAddress, addressesArr);
        await (0, processor_1.processTx)(env.c, txSigner, [
            ...instructions,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Management fee updated');
    });
    commands.command('create-lut').action(async () => {
        const env = await (0, ManagerEnv_1.initEnv)(false);
        const signer = await env.getSigner();
        const [initLutIx, lutAddress] = await (0, lib_1.initLookupTableIx)(signer, await env.c.rpc.getSlot().send());
        await (0, processor_1.processTx)(env.c, signer, [
            initLutIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], 'execute', []);
        console.log(`LUT created: ${lutAddress}`);
    });
    commands
        .command('sync-vault-lut')
        .requiredOption('--vault <string>', 'The vault address to sync')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--signer <string>`, 'If set, it will use the provided signer instead of the default one')
        .action(async ({ vault, mode, staging, devnet, signer }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        let txSigner = await env.getSigner({ vaultState });
        // if the signer is provided (path to a keypair) we use it, otherwise we use the default one
        if (signer) {
            txSigner = await (0, signer_1.parseKeypairFile)(signer);
        }
        const syncLUTIxs = await kaminoManager.syncVaultLUTIxs(txSigner, kaminoVault);
        // if we need to create the LUT we have to do that in a separate tx and wait a little bit after
        if (syncLUTIxs.setupLUTIfNeededIxs.length > 0) {
            await (0, processor_1.processTx)(env.c, txSigner, [
                ...syncLUTIxs.setupLUTIfNeededIxs,
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                }),
            ], mode, []);
            await (0, lib_1.sleep)(2000);
            mode === 'execute' && console.log('LUT created and set to the vault');
        }
        // if there are accounts to be added to the LUT we have to do that in a separate tx
        for (const ix of syncLUTIxs.syncLUTIxs) {
            await (0, processor_1.processTx)(env.c, txSigner, [
                ix,
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                }),
            ], mode, []);
            mode === 'execute' && console.log('Accounts added to the LUT');
        }
    });
    commands
        .command('update-vault-perf-fee')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--fee-bps <string>', 'Performance fee to set (in basis points)')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, feeBps, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const instructions = await kaminoManager.updateVaultConfigIxs(kaminoVault, new VaultConfigField_1.PerformanceFeeBps(), feeBps, signer);
        await (0, processor_1.processTx)(env.c, signer, [
            instructions.updateVaultConfigIx,
            ...instructions.updateLUTIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Performance fee updated');
    });
    commands
        .command('accept-vault-ownership')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const pendingAdmin = await env.getSigner({
            vaultState,
            useVaultPendingAdmin: true,
        });
        const instructions = await kaminoManager.acceptVaultOwnershipIxs(kaminoVault, pendingAdmin);
        await (0, processor_1.processTx)(env.c, pendingAdmin, [
            instructions.acceptVaultOwnershipIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log(`Vault ownership accepted by ${pendingAdmin.address}`);
        await (0, processor_1.processTx)(env.c, pendingAdmin, [
            instructions.initNewLUTIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Initialized new LUT and updated vault config');
        // send the LUT mgmt ixs one by one
        const lutIxs = [...instructions.updateLUTIxs];
        for (let i = 0; i < lutIxs.length; i++) {
            const lutIxsGroup = lutIxs.slice(i, i + 1);
            await (0, processor_1.processTx)(env.c, pendingAdmin, [
                ...lutIxsGroup,
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                }),
            ], mode, []);
            mode === 'execute' && console.log('LUT updated');
        }
    });
    commands
        .command('give-up-pending-fees')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--max-amount-to-give-up <string>', 'Max amount to give up')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, maxAmountToGiveUp, mode, staging, multisig, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(multisig, staging);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const instruction = await kaminoManager.giveUpPendingFeesIx(kaminoVault, new decimal_js_1.default(maxAmountToGiveUp), signer);
        await (0, processor_1.processTx)(env.c, signer, [
            instruction,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Gave up pending fees');
    });
    commands
        .command('withdraw-pending-fees')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const instructions = await kaminoManager.withdrawPendingFeesIxs(kaminoVault, undefined, signer);
        await (0, processor_1.processTx)(env.c, signer, [
            ...instructions,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Pending fees withdrawn');
    });
    commands
        .command('remove-vault-allocation')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, reserve, mode, staging, devnet, CU: cu }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const reserveAddress = (0, kit_1.address)(reserve);
        const vaultAddress = (0, kit_1.address)(vault);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState });
        const ixs = await kaminoManager.fullRemoveReserveFromVaultIxs(signer, kaminoVault, reserveAddress);
        const transactionIxs = [
            ...ixs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ];
        const lookupTableAddresses = [];
        if (vaultState.vaultLookupTable !== lib_1.DEFAULT_PUBLIC_KEY) {
            lookupTableAddresses.push(vaultState.vaultLookupTable);
        }
        const lookupTables = await (0, address_lookup_table_1.fetchAllAddressLookupTable)(env.c.rpc, lookupTableAddresses);
        await (0, processor_1.processTx)(env.c, signer, transactionIxs, mode, lookupTables);
        mode === 'execute' && console.log('Vault allocation removed');
    });
    commands
        .command('stake')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .action(async ({ vault, mode, staging, devnet, multisig }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const user = await env.getSigner();
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const stakeIxs = await new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId).stakeSharesIxs(user, kaminoVault);
        await (0, processor_1.processTx)(env.c, user, [
            ...stakeIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Staked into vault farm');
    });
    commands
        .command('update-vault-reserve-allocation')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option('--allocation-weight <number>', 'Allocation weight')
        .option('--allocation-cap <string>', 'Allocation cap decimal value')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--skip-lut-update`, 'If set, it will skip the LUT update')
        .option(`--use-allocation-admin`, 'Sign as allocationAdmin instead of vault admin')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, reserve, mode, allocationWeight, allocationCap, staging, devnet, multisig, skipLutUpdate, useAllocationAdmin, CU: cu, }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const reserveAddress = (0, kit_1.address)(reserve);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const signer = await env.getSigner({ vaultState, useVaultAllocationAdmin: useAllocationAdmin });
        const shouldUpdateLut = skipLutUpdate ? false : true;
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        let allocationWeightValue;
        let allocationCapDecimal;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId);
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, reserveAddress, env.klendProgramId);
        if (!reserveState) {
            throw new Error('Reserve not found');
        }
        const existentAllocation = kaminoManager.getVaultAllocations(vaultState).get(reserveAddress);
        if (allocationWeight) {
            allocationWeightValue = Number(allocationWeight);
        }
        else if (existentAllocation) {
            allocationWeightValue = existentAllocation.targetWeight.toNumber();
        }
        else {
            throw new Error('Allocation weight is required');
        }
        if (allocationCap) {
            allocationCapDecimal = new decimal_js_1.default(allocationCap);
        }
        else if (existentAllocation) {
            allocationCapDecimal = existentAllocation.tokenAllocationCap.div(new decimal_js_1.default(10).pow(Number(vaultState.tokenMintDecimals.toString())));
        }
        else {
            throw new Error('Allocation cap is required');
        }
        console.log('allocationWeightValue', allocationWeightValue);
        console.log('allocationCapDecimal', allocationCapDecimal.toString());
        const reserveWithAddress = {
            address: reserveAddress,
            state: reserveState,
        };
        const firstReserveAllocationConfig = new lib_1.ReserveAllocationConfig(reserveWithAddress, allocationWeightValue, allocationCapDecimal);
        const instructions = await kaminoManager.updateVaultReserveAllocationIxs(kaminoVault, firstReserveAllocationConfig, signer);
        const txInstructions = [
            instructions.updateReserveAllocationIx,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ];
        if (shouldUpdateLut) {
            txInstructions.push(...instructions.updateLUTIxs);
        }
        await (0, processor_1.processTx)(env.c, signer, txInstructions, mode, []);
        mode === 'execute' && console.log('Vault allocation updated');
    });
    commands
        .command('deposit')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--amount <number>', 'Token amount to deposit, in decimals')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .option(`--feePayer <string>`, 'Path to fee payer keypair file. If provided, this account pays tx fees and ATA rent instead of the user')
        .action(async ({ vault, amount, mode, staging, devnet, multisig, CU: cu, feePayer: feePayerPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const user = await env.getSigner();
        const feePayer = feePayerPath ? await (0, signer_1.parseKeypairFile)(feePayerPath) : undefined;
        const txPayer = feePayer ?? user;
        const depositInstructions = await kaminoManager.depositToVaultIxs(user, kaminoVault, amount, undefined, undefined, feePayer);
        const instructions = [...depositInstructions.depositIxs, ...depositInstructions.stakeInFarmIfNeededIxs];
        await (0, processor_1.processTx)(env.c, txPayer, [
            ...instructions,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log('User deposited');
    });
    commands
        .command('withdraw')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--amount <number>', 'Shares amount to withdraw')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .option(`--feePayer <string>`, 'Path to fee payer keypair file. If provided, this account pays tx fees and ATA rent instead of the user')
        .action(async ({ vault, amount, mode, staging, devnet, multisig, CU: cu, feePayer: feePayerPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const user = await env.getSigner();
        const feePayer = feePayerPath ? await (0, signer_1.parseKeypairFile)(feePayerPath) : undefined;
        const txPayer = feePayer ?? user;
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultState = await kaminoVault.getState();
        const lookupTableAddresses = [];
        if (vaultState.vaultLookupTable !== lib_1.DEFAULT_PUBLIC_KEY) {
            lookupTableAddresses.push(vaultState.vaultLookupTable);
        }
        const lookupTables = await (0, address_lookup_table_1.fetchAllAddressLookupTable)(env.c.rpc, lookupTableAddresses);
        const withdrawIxs = await kaminoManager.withdrawFromVaultIxs(user, kaminoVault, new decimal_js_1.default(amount), await env.c.rpc.getSlot({ commitment: 'confirmed' }).send(), undefined, undefined, feePayer);
        await (0, processor_1.processTx)(env.c, txPayer, [
            ...withdrawIxs.unstakeFromFarmIfNeededIxs,
            ...withdrawIxs.withdrawIxs,
            ...withdrawIxs.postWithdrawIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, lookupTables);
        mode === 'execute' && console.log('User withdrew');
    });
    commands
        .command('invest-all-reserves')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, mode, staging, devnet, multisig, CU: cu }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const payer = await env.getSigner();
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const instructions = await kaminoManager.investAllReservesIxs(payer, kaminoVault);
        for (let i = 0; i < instructions.length; i++) {
            const txInstructions = [];
            txInstructions.push();
            await (0, processor_1.processTx)(env.c, payer, [
                instructions[i],
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                    computeUnits,
                }),
            ], mode, []);
            mode === 'execute' && console.log('Reserves invested');
        }
    });
    commands
        .command('invest-single-reserve')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .option(`--CU <number>`, 'The number of compute units to use for the transaction')
        .action(async ({ vault, reserve, mode, staging, devnet, multisig, CU: cu }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const computeUnits = cu ? cu : lib_1.DEFAULT_CU_PER_TX;
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const reserveAddress = (0, kit_1.address)(reserve);
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, reserveAddress, env.klendProgramId);
        if (!reserveState) {
            throw new Error('Reserve not found');
        }
        const reserveWithAddress = {
            address: reserveAddress,
            state: reserveState,
        };
        const payer = await env.getSigner();
        const instructions = await kaminoManager.investSingleReserveIxs(payer, kaminoVault, reserveWithAddress);
        await (0, processor_1.processTx)(env.c, payer, [
            ...instructions,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits,
            }),
        ], mode, []);
        mode === 'execute' && console.log(`Reserve ${reserveAddress} invested`);
    });
    // commands
    //   .command('close-vault')
    //   .requiredOption('--vault <string>', 'Vault address')
    //   .option(`--staging`, 'If true, will use the staging programs')
    //   .action(async ({vault, staging}) => {
    //     const env = await initEnv(false, staging);
    //     const vaultAddress = address(vault);
    //     const kaminoManager = new KaminoManager(env.connection, env.klendProgramId, env.kvaultProgramId);
    //     const kaminoVault = new KaminoVault(vaultAddress, undefined, env.kvaultProgramId);
    //     const instructions = await kaminoManager.closeVault(kaminoVault);
    //     const closeVaultSig = await processTxn(env.client, env.payer, [instructions], 'execute', 2500, []);
    //     console.log('Vault closed:', closeVaultSig);
    //   });
    commands
        .command('get-vault-colls')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const vaultState = await new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId).getState();
        const vaultCollaterals = await kaminoManager.getVaultCollaterals(vaultState, await env.c.rpc.getSlot({ commitment: 'confirmed' }).send());
        vaultCollaterals.forEach((collateral) => {
            console.log('reserve ', collateral.address);
            console.log('market overview', collateral.reservesAsCollateral);
            console.log('min LTV', collateral.minLTVPct);
            console.log('max LTV', collateral.maxLTVPct);
        });
    });
    commands
        .command('get-vault-overview')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .requiredOption(`--token-price <number>`, 'Vault token price in USD')
        .action(async ({ vault, staging, devnet, tokenPrice }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId);
        const vaultOverview = await kaminoManager.getVaultOverview(kaminoVault, new decimal_js_1.default(tokenPrice), await env.c.rpc.getSlot({ commitment: 'confirmed' }).send());
        console.log('vaultOverview', vaultOverview);
        vaultOverview.reservesFarmsIncentives.reserveFarmsIncentives.forEach((incentive, reserveAddress) => {
            console.log('reserve ', reserveAddress);
            console.log('reserve incentive', incentive);
        });
        console.log('totalIncentivesAPY', vaultOverview.reservesFarmsIncentives.totalIncentivesAPY.toString());
    });
    commands
        .command('get-vault-farm-apy')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--token-price <number>', 'Vault token price in USD')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, tokenPrice, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, (0, kit_1.address)(vault), undefined, env.kvaultProgramId, slotDuration);
        const farmAPY = await kaminoManager.getVaultFarmRewardsAPY(kaminoVault, new decimal_js_1.default(tokenPrice));
        console.log('farmAPY', farmAPY);
    });
    commands
        .command('get-reserve-farms-apy')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption('--token-price <number>', 'Reserve token price in USD')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ reserve, tokenPrice, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const farmAPY = await kaminoManager.getReserveFarmRewardsAPY((0, kit_1.address)(reserve), new decimal_js_1.default(tokenPrice));
        console.log('farmAPY', farmAPY);
    });
    commands
        .command('get-vault-all-mints')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--vault <string>`, 'Vault address')
        .action(async ({ staging, devnet, vault }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration);
        const allVaultsTokenMints = await kaminoManager.getAllVaultsTokenMintsIncludingRewards([kaminoVault]);
        console.log('allVaultsTokenMints', allVaultsTokenMints);
    });
    commands
        .command('get-vault-allocation-distribution')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const vaultState = await new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration).getState();
        const allocationDistribution = kaminoManager.getAllocationsDistribuionPct(vaultState);
        allocationDistribution.forEach((allocation, reserveAddress) => {
            console.log('reserve ', reserveAddress);
            console.log('allocation', allocation);
        });
    });
    commands
        .command('get-user-shares-for-vault')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption('--wallet <string>', 'User wailt address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, wallet, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const walletAddress = (0, kit_1.address)(wallet);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration);
        const userShares = await kaminoManager.getUserSharesBalanceSingleVault(walletAddress, kaminoVault);
        console.log(`User shares for vault ${vaultAddress}: unstaked shares: ${userShares.unstakedShares} staked shares: ${userShares.stakedShares} total shares: ${userShares.totalShares}`);
    });
    commands
        .command('get-user-shares-all-vaults')
        .requiredOption('--wallet <string>', 'User wailt address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ wallet, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const walletAddress = (0, kit_1.address)(wallet);
        const userShares = await kaminoManager.getUserSharesBalanceAllVaults(walletAddress);
        console.log(`${userShares.size} positions for wallet ${walletAddress}`);
        userShares.forEach((userShares, vaultAddress) => {
            console.log(`User shares for vault ${vaultAddress}: staked shares ${userShares.stakedShares} unstaked shares ${userShares.unstakedShares} total shares ${userShares.totalShares}`);
        });
    });
    commands
        .command('get-tokens-per-share')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration);
        const tokensPerShare = await kaminoManager.getTokensPerShareSingleVault(kaminoVault, await env.c.rpc.getSlot({ commitment: 'confirmed' }).send());
        console.log(`Tokens per share for vault ${vaultAddress.toString()}: ${tokensPerShare}`);
    });
    commands
        .command('print-vault')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration);
        const vaultState = await kaminoVault.getState();
        const slot = await env.c.rpc.getSlot({ commitment: 'confirmed' }).send();
        const tokensPerShare = await kaminoManager.getTokensPerShareSingleVault(kaminoVault, slot);
        const holdings = await kaminoManager.getVaultHoldings(kaminoVault.state, slot);
        const sharesIssued = (0, lib_1.lamportsToDecimal)(vaultState.sharesIssued.toString(), vaultState.sharesMintDecimals.toString());
        const vaultOverview = await kaminoManager.getVaultOverview(kaminoVault, new decimal_js_1.default(1.0), slot);
        console.log('farm', vaultState.vaultFarm.toString());
        console.log('vault token mint', vaultState.tokenMint);
        console.log('Name: ', kaminoManager.getDecodedVaultName(kaminoVault.state));
        console.log('Shares issued: ', sharesIssued);
        holdings.print();
        console.log(`Tokens per share for vault ${vaultAddress}: ${tokensPerShare}`);
        console.log('vaultOverview', vaultOverview);
        for (const [reserveAddress, reserveOverview] of vaultOverview.reservesOverview) {
            console.log(`reserve ${reserveAddress} supplyAPY ${reserveOverview.supplyAPY}`);
        }
    });
    commands.command('get-cumulative-delegated-farms-rewards').action(async () => {
        const env = await (0, ManagerEnv_1.initEnv)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId);
        const cumulativeRewards = await kaminoManager.getCumulativeDelegatedFarmsRewardsIssuedForAllVaults();
        cumulativeRewards.forEach((reward, tokenMint) => {
            console.log(`token mint ${tokenMint} rewards issued (lamports) ${reward}`);
        });
    });
    commands.command('get-vaults-with-delegated-farm').action(async () => {
        const env = await (0, ManagerEnv_1.initEnv)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId);
        const vaultsWithDelegatedFarm = await kaminoManager.getVaultsWithDelegatedFarm();
        vaultsWithDelegatedFarm.forEach((delegatedFarm, vault) => {
            console.log(`vault ${vault} delegated farm ${delegatedFarm}`);
        });
    });
    commands
        .command('simulate-reserve-apy')
        .requiredOption('--reserve <string>', 'Reserve address')
        .action(async ({ reserve }) => {
        const env = await (0, ManagerEnv_1.initEnv)();
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, (0, kit_1.address)(reserve), env.klendProgramId);
        if (!reserveState) {
            throw new Error('Reserve not found');
        }
        const kaminoReserve = await lib_1.KaminoReserve.initializeFromAddress((0, kit_1.address)(reserve), env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, reserveState);
        const slot = await env.c.rpc.getSlot({ commitment: 'confirmed' }).send();
        const amount = new decimal_js_1.default(0);
        const simulatedApr = kaminoReserve.calcSimulatedSupplyAPR(amount, 'deposit', slot, 0);
        console.log('simulated apr', simulatedApr);
        const apy = (0, lib_1.calculateAPYFromAPR)(simulatedApr);
        console.log('simulated apy', apy);
        const computedAPR = kaminoReserve.calculateSupplyAPR(slot, 0);
        console.log('computed apr', computedAPR);
        const computedAPY = kaminoReserve.totalSupplyAPY(slot);
        console.log('computed apy', computedAPY);
    });
    commands
        .command('get-oracle-mappings')
        .requiredOption('--lending-market <string>', 'Lending Market Address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ staging, devnet, lendingMarket }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const market = await lib_1.KaminoMarket.load(env.c.rpc, (0, kit_1.address)(lendingMarket), lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId);
        if (!market) {
            throw Error(`Lending market ${lendingMarket} not found`);
        }
        console.log('Getting  oracle mappings');
        const oracleConfigs = await kaminoManager.getScopeOracleConfigs(market);
        for (const [oraclePrices, configs] of oracleConfigs.entries()) {
            console.log(`OraclePrices pubkey: ${oraclePrices}`, 'Configs:', JSON.parse(JSON.stringify(configs)));
        }
    });
    commands
        .command('get-all-vaults')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const allVaults = await kaminoManager.getAllVaults();
        console.log('all vaults', allVaults);
    });
    commands
        .command('get-all-vaults-for-token')
        .requiredOption('--token <string>', 'Token address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ token, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const allVaults = await kaminoManager.getAllVaultsForToken((0, kit_1.address)(token));
        console.log('all vaults for token ', token, allVaults);
    });
    commands
        .command('get-all-vaults-pks')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const allVaults = await kaminoManager.getAllVaults();
        console.log('all vaults', allVaults.map((vault) => vault.address));
    });
    commands
        .command('get-simulated-interest-and-fees')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultState = await new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration).getState();
        const simulatedHoldings = await kaminoManager.calculateSimulatedHoldingsWithInterest(vaultState);
        console.log('Simulated holdings with interest', simulatedHoldings);
        const simulatedFees = await kaminoManager.calculateSimulatedFees(vaultState, simulatedHoldings);
        console.log('Simulated fees', simulatedFees);
    });
    commands
        .command('compute-alloc')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const vaultState = await new lib_1.KaminoVault(env.c.rpc, vaultAddress, undefined, env.kvaultProgramId, slotDuration).getState();
        const computedAllocation = await kaminoManager.getVaultComputedReservesAllocation(vaultState);
        console.log('computedAllocation', computedAllocation);
    });
    // example:  yarn kamino-manager get-market-or-vault-admin-info --address A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK
    commands
        .command('check-vault-release-status')
        .requiredOption('--vault <string>', 'Vault address')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ vault, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const slotDuration = await (0, lib_1.getMedianSlotDurationInMsFromLastEpochs)();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, slotDuration, env.klendProgramId, env.kvaultProgramId);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, (0, kit_1.address)(vault), undefined, env.kvaultProgramId, slotDuration);
        const result = await kaminoManager.checkVaultReleaseStatus(kaminoVault);
        if (result.errors.length > 0) {
            console.log('\nErrors:');
            for (const error of result.errors) {
                console.log(`  ❌ ${error}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  ⚠️  ${warning}`);
            }
        }
        if (result.success) {
            console.log('\n✅ Vault is ready for release');
        }
        else {
            console.log('\n❌ Vault is NOT ready for release');
        }
    });
    commands
        .command('claim-rewards-for-vault')
        .requiredOption('--vault <string>', 'Vault address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--user <string>`, 'User address')
        .action(async ({ vault, mode, staging, devnet, user }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const vaultAddress = (0, kit_1.address)(vault);
        const kaminoVault = new lib_1.KaminoVault(env.c.rpc, vaultAddress);
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const userWallet = user ? (0, signer_1.noopSigner)((0, kit_1.address)(user)) : await env.getSigner();
        const rewardsIxs = await kaminoManager.getClaimAllRewardsForVaultIxs(userWallet, kaminoVault);
        if (rewardsIxs.length > 0) {
            await (0, processor_1.processTx)(env.c, userWallet, [
                ...rewardsIxs,
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                    computeUnits: 400_000,
                }),
            ], mode, []);
        }
        else {
            console.log('No rewards to claim');
        }
    });
    commands
        .command('create-market')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .action(async ({ mode, staging, devnet, multisig }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms, undefined, undefined, devnet);
        const admin = await env.getSigner();
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const { market: marketKp, ixs: createMarketIxs } = await kaminoManager.createMarketIxs({
            admin,
        });
        await (0, processor_1.processTx)(env.c, admin, [
            ...createMarketIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        mode === 'execute' && console.log('Market created:', marketKp.address);
    });
    commands
        .command('add-asset-to-market')
        .requiredOption('--market <string>', 'Market address to add asset to')
        .requiredOption('--mint <string>', 'Reserve liquidity token mint')
        .requiredOption('--reserve-config-path <string>', 'Path for the reserve config')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option('--global-admin <string>', 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode)')
        .option('--reserve-key-path <string>', 'Path to the reserve key pair file')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .action(async ({ market, mint, reserveConfigPath, mode, staging, globalAdmin, multisig, reserveKeyPath }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms);
        const tokenMint = (0, kit_1.address)(mint);
        const marketAddress = (0, kit_1.address)(market);
        const existingMarket = await lib_1.KaminoMarket.load(env.c.rpc, marketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (existingMarket === null) {
            throw new Error(`Market ${marketAddress} does not exist`);
        }
        const signer = await env.getSigner({ market: existingMarket });
        const mintAccount = await (0, token_2022_1.fetchMint)(env.c.rpc, mint);
        const tokenMintProgramId = mintAccount.programAddress;
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const reserveConfigFromFile = JSON.parse(fs.readFileSync(reserveConfigPath, 'utf8'));
        const reserveConfig = parseReserveConfigFromFile(reserveConfigFromFile);
        const assetConfig = new lib_1.AssetReserveConfigCli(tokenMint, tokenMintProgramId, reserveConfig);
        const [adminAta] = await (0, token_2022_1.findAssociatedTokenPda)({
            mint: tokenMint,
            owner: signer.address,
            tokenProgram: tokenMintProgramId,
        });
        let globalAdminSigner = undefined;
        if (globalAdmin) {
            globalAdminSigner =
                mode === 'multisig' ? (0, signer_1.noopSigner)((0, kit_1.address)(globalAdmin)) : await (0, signer_1.parseKeypairFile)(globalAdmin);
        }
        let reserveKeypair = undefined;
        if (reserveKeyPath) {
            reserveKeypair = await (0, signer_1.parseKeypairFile)(reserveKeyPath);
        }
        else {
            reserveKeypair = await (0, kit_1.generateKeyPairSigner)();
        }
        const { createReserveIxs, configUpdateIxs } = await kaminoManager.addAssetToMarketIxs({
            admin: signer,
            adminLiquiditySource: adminAta,
            marketAddress: marketAddress,
            assetConfig: assetConfig,
            reserveKeypair,
            globalAdminSigner,
        });
        console.log('reserve: ', reserveKeypair.address);
        await (0, processor_1.processTx)(env.c, signer, [
            ...createReserveIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode, []);
        const [lut, createLutIxs] = await createUpdateReserveConfigLutIxs(env, marketAddress, reserveKeypair.address);
        await (0, processor_1.processTx)(env.c, signer, [
            ...createLutIxs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
            }),
        ], mode);
        const lutAcc = await (0, address_lookup_table_1.fetchAddressLookupTable)(env.c.rpc, lut);
        // Split config update instructions into chunks to avoid transaction size limits
        const CHUNK_SIZE = 8;
        for (let i = 0; i < configUpdateIxs.length; i += CHUNK_SIZE) {
            const chunk = configUpdateIxs.slice(i, i + CHUNK_SIZE);
            await (0, processor_1.processTx)(env.c, signer, [
                ...chunk.map((ix) => ix.ix),
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                    computeUnits: 400_000,
                }),
            ], mode, [lutAcc]);
        }
        mode === 'execute' &&
            console.log('Reserve Created with config:', JSON.parse(JSON.stringify(reserveConfig)), '\nreserve address:', reserveKeypair.address);
    });
    commands
        .command('update-reserve-config')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption('--reserve-config-path <string>', 'Path for the reserve config')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option('--global-admin <string>', 'Global admin signer (keypair path in execute/simulate modes, pubkey in multisig mode)')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--multisig <string>`, 'If using multisig mode this is required, otherwise will be ignored')
        .action(async ({ reserve, reserveConfigPath, mode, staging, globalAdmin, multisig }) => {
        if (mode === 'multisig' && !multisig) {
            throw new Error('If using multisig mode, multisig pubkey is required');
        }
        const ms = multisig ? (0, kit_1.address)(multisig) : undefined;
        const env = await (0, ManagerEnv_1.initEnv)(staging, ms);
        const reserveAddress = (0, kit_1.address)(reserve);
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, reserveAddress, env.klendProgramId);
        if (reserveState === null) {
            throw new Error(`Reserve ${reserveAddress} not found`);
        }
        const marketAddress = reserveState.lendingMarket;
        const marketState = await lib_1.KaminoMarket.load(env.c.rpc, marketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (marketState === null) {
            throw new Error(`Market ${marketAddress} not found`);
        }
        const signer = await env.getSigner({ market: marketState });
        const marketWithAddress = {
            address: marketAddress,
            state: marketState.state,
        };
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const reserveConfigFromFile = JSON.parse(fs.readFileSync(reserveConfigPath, 'utf8'));
        const reserveConfig = parseReserveConfigFromFile(reserveConfigFromFile);
        const updateIxs = await kaminoManager.updateReserveIxs(signer, marketWithAddress, reserveAddress, reserveConfig, reserveState, globalAdmin);
        if (updateIxs.length === 0) {
            console.log('No changes to reserve config');
            return;
        }
        // Split config update instructions into chunks to avoid transaction size limits
        const CHUNK_SIZE = 8;
        for (let i = 0; i < updateIxs.length; i += CHUNK_SIZE) {
            const chunk = updateIxs.slice(i, i + CHUNK_SIZE);
            await (0, processor_1.processTx)(env.c, signer, [
                ...chunk.map((ix) => ix.ix),
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                    computeUnits: 400_000,
                }),
            ], mode, []);
        }
        mode === 'execute' && console.log('Reserve Updated with config -> ', JSON.parse(JSON.stringify(reserveConfig)));
    });
    commands
        .command('download-reserve-config')
        .requiredOption('--reserve <string>', 'Reserve address')
        .option(`--staging`, 'If true, will use the staging programs')
        .action(async ({ reserve, staging }) => {
        const env = await (0, ManagerEnv_1.initEnv)(undefined, staging);
        const reserveAddress = (0, kit_1.address)(reserve);
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, reserveAddress, env.klendProgramId);
        if (!reserveState) {
            throw new Error('Reserve not found');
        }
        fs.mkdirSync('./configs/' + reserveState.lendingMarket, { recursive: true });
        const decoder = new TextDecoder('utf-8');
        const reserveName = decoder.decode(Uint8Array.from(reserveState.config.tokenInfo.name)).replace(/\0/g, '');
        const reserveConfigDisplay = parseReserveConfigToFile(reserveState.config);
        fs.writeFileSync('./configs/' + reserveState.lendingMarket + '/' + reserveName + '-' + reserveAddress.toString() + '.json', JSON.stringify(reserveConfigDisplay, null, 2));
    });
    commands
        .command('download-lending-market-config')
        .requiredOption('--lending-market <string>', 'Lending Market Address')
        .option(`--staging`, 'If true, will use the staging programs')
        .action(async ({ lendingMarket, staging }) => {
        const env = await (0, ManagerEnv_1.initEnv)(false, staging);
        const lendingMarketAddress = (0, kit_1.address)(lendingMarket);
        const lendingMarketState = await lib_1.LendingMarket.fetch(env.c.rpc, lendingMarketAddress, env.klendProgramId);
        if (!lendingMarketState) {
            throw new Error('Lending Market not found');
        }
        fs.mkdirSync('./configs/' + lendingMarketAddress.toString(), { recursive: true });
        const lendingMarketConfigForFile = lendingMarketToConfigFileJSON(lendingMarketState);
        const marketName = (0, lib_1.parseZeroPaddedUtf8)(lendingMarketState.name);
        fs.writeFileSync('./configs/' + lendingMarketAddress.toString() + '/market-' + marketName + '-' + lendingMarketAddress.toString() + '.json', JSON.stringify(lendingMarketConfigForFile, null, 2));
    });
    commands
        .command('download-lending-market-config-and-all-reserves-configs')
        .requiredOption('--lending-market <string>', 'Lending Market Address')
        .option(`--staging`, 'If true, will use the staging programs')
        .action(async ({ lendingMarket, staging }) => {
        const env = await (0, ManagerEnv_1.initEnv)(false, staging);
        const decoder = new TextDecoder('utf-8');
        const lendingMarketAddress = (0, kit_1.address)(lendingMarket);
        const kaminoMarket = await lib_1.KaminoMarket.load(env.c.rpc, lendingMarketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId);
        if (!kaminoMarket) {
            throw new Error('Lending Market not found');
        }
        const lendingMarketState = await lib_1.LendingMarket.fetch(env.c.rpc, lendingMarketAddress, env.klendProgramId);
        if (!lendingMarketState) {
            throw new Error('Lending Market not found');
        }
        fs.mkdirSync('./configs/' + lendingMarketAddress.toString(), { recursive: true });
        const lendingMarketConfigForFile = lendingMarketToConfigFileJSON(lendingMarketState);
        const marketName = (0, lib_1.parseZeroPaddedUtf8)(lendingMarketState.name);
        fs.writeFileSync('./configs/' + lendingMarketAddress.toString() + '/market-' + marketName + '-' + lendingMarketAddress.toString() + '.json', JSON.stringify(lendingMarketConfigForFile, null, 2));
        kaminoMarket.reserves.forEach(async (reserve) => {
            const reserveState = reserve.state;
            const reserveName = decoder.decode(Uint8Array.from(reserveState.config.tokenInfo.name)).replace(/\0/g, '');
            const reserveConfigDisplay = parseReserveConfigToFile(reserveState.config);
            fs.writeFileSync('./configs/' +
                lendingMarketAddress.toString() +
                '/' +
                reserveName +
                '-' +
                reserve.address.toString() +
                '.json', JSON.stringify(reserveConfigDisplay, null, 2));
        });
    });
    commands
        .command('update-lending-market-from-config')
        .requiredOption('--lending-market <string>', 'Lending Market address')
        .requiredOption('--lending-market-config-path <string>', 'Path for the market config')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ lendingMarket, lendingMarketConfigPath, mode, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const lendingMarketAddress = (0, kit_1.address)(lendingMarket);
        const lendingMarketAccount = await lib_1.KaminoMarket.load(env.c.rpc, lendingMarketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (lendingMarketAccount === null) {
            throw new Error(`Lending market ${lendingMarketAddress} not found`);
        }
        const marketWithAddress = {
            address: lendingMarketAddress,
            state: lendingMarketAccount.state,
        };
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const newLendingMarket = parseLendingMarketConfigFromFile(JSON.parse(fs.readFileSync(lendingMarketConfigPath, 'utf8')), lendingMarketAccount.state);
        const signer = await env.getSigner({ market: lendingMarketAccount });
        const ixs = kaminoManager.updateLendingMarketIxs(signer, marketWithAddress, newLendingMarket);
        // executing 6 ixs in a txn to make sure they fit
        for (let ixIndex = 0; ixIndex < ixs.length; ixIndex += 6) {
            const ixsToExecute = ixs.slice(ixIndex, ixIndex + 6);
            await (0, processor_1.processTx)(env.c, signer, [
                ...ixsToExecute,
                ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                    priorityFeeMultiplier: 2500,
                    computeUnits: 400_000,
                }),
            ], mode, []);
        }
        mode === 'execute' &&
            console.log('Reserve Updated with new config -> ', JSON.parse(JSON.stringify(newLendingMarket)));
    });
    commands
        .command('update-lending-market-owner')
        .requiredOption('--lending-market <string>', 'Lending Market address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ lendingMarket, mode, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const lendingMarketAddress = (0, kit_1.address)(lendingMarket);
        const lendingMarketState = await lib_1.KaminoMarket.load(env.c.rpc, lendingMarketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (lendingMarketState === null) {
            throw new Error('Lending Market not found');
        }
        const marketWithAddress = {
            address: lendingMarketAddress,
            state: lendingMarketState.state,
        };
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const lendingMarketOwnerCached = await env.getSigner({
            market: lendingMarketState,
            useLendingMarketOwnerCached: true,
        });
        const ix = kaminoManager.updateLendingMarketOwnerIxs(marketWithAddress, lendingMarketOwnerCached);
        await (0, processor_1.processTx)(env.c, lendingMarketOwnerCached, [
            ix,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits: 400_000,
            }),
        ], mode, []);
        mode === 'execute' &&
            console.log('Lending market admin updated to the new admin -> ', lendingMarketOwnerCached.address);
    });
    commands
        .command('update-lending-market-name')
        .requiredOption('--lending-market <string>', 'Lending Market address')
        .requiredOption('--new-name <string>', 'Lending Market address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ lendingMarket, newName, mode, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const lendingMarketAddress = (0, kit_1.address)(lendingMarket);
        const lendingMarketState = await lib_1.KaminoMarket.load(env.c.rpc, lendingMarketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (lendingMarketState === null) {
            throw new Error('Lending Market not found');
        }
        const marketWithAddress = {
            address: lendingMarketAddress,
            state: lendingMarketState.state,
        };
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const currentName = (0, lib_1.parseZeroPaddedUtf8)(lendingMarketState.state.name);
        const newNameEncoded = (0, lib_1.encodeTokenName)(newName);
        console.log('Current name: ', currentName, ' encoded: ', lendingMarketState.state.name);
        console.log('New name: ', newName, ' encoded: ', newNameEncoded);
        const newLendingMarket = new lib_1.LendingMarket({
            ...lendingMarketState.state,
            name: newNameEncoded,
        });
        const signer = await env.getSigner({ market: lendingMarketState });
        const ixs = kaminoManager.updateLendingMarketIxs(signer, marketWithAddress, newLendingMarket);
        await (0, processor_1.processTx)(env.c, signer, [
            ...ixs,
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits: 400_00,
            }),
        ], mode, []);
        mode === 'execute' &&
            console.log('Lending market name updated to -> ', JSON.parse(JSON.stringify(lendingMarketState.state.lendingMarketOwnerCached)));
    });
    commands
        .command('update-reserve-config-debt-cap')
        .requiredOption('--reserve <string>', 'Reserve address')
        .requiredOption(`--mode <string>`, 'simulate|multisig|execute - simulate - to print txn simulation and to get tx simulation link in explorer, execute - execute tx, multisig - to get bs58 tx for multisig usage')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ reserve, mode, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const reserveAddress = (0, kit_1.address)(reserve);
        const reserveState = await lib_1.Reserve.fetch(env.c.rpc, reserveAddress, env.klendProgramId);
        if (!reserveState) {
            throw new Error('Reserve not found');
        }
        const lendingMarketAddress = reserveState.lendingMarket;
        const lendingMarketState = await lib_1.KaminoMarket.load(env.c.rpc, lendingMarketAddress, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, false);
        if (lendingMarketState === null) {
            throw new Error('Lending Market not found');
        }
        const marketWithAddress = {
            address: lendingMarketAddress,
            state: lendingMarketState.state,
        };
        const kaminoManager = new lib_1.KaminoManager(env.c.rpc, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, env.klendProgramId, env.kvaultProgramId, undefined, env.farmsProgramId);
        const newReserveConfigFields = {
            ...reserveState.config,
            borrowLimit: new bn_js_1.default(1000),
        };
        const newReserveConfig = new types_1.ReserveConfig(newReserveConfigFields);
        const admin = await env.getSigner({ market: lendingMarketState });
        const updateIxs = await kaminoManager.updateReserveIxs(admin, marketWithAddress, reserveAddress, newReserveConfig);
        await (0, processor_1.processTx)(env.c, admin, [
            ...updateIxs.map((ix) => ix.ix),
            ...(0, priorityFee_1.getPriorityFeeAndCuIxs)({
                priorityFeeMultiplier: 2500,
                computeUnits: 400_000,
            }),
        ], mode, []);
        mode === 'execute' && console.log(`Reserve ${reserveAddress} debt cap updated`);
    });
    commands
        .command('get-market-or-vault-admin-info')
        .requiredOption('--address <string>', 'Address of the market or vault')
        .option(`--staging`, 'If true, will use the staging programs')
        .option(`--devnet`, 'If true, will use devnet programs and RPC')
        .action(async ({ address: addr, staging, devnet }) => {
        const env = await (0, ManagerEnv_1.initEnv)(staging, undefined, undefined, undefined, devnet);
        const adminInfo = await lib_1.KaminoManager.getMarketOrVaultAdminInfo(env.c.rpc, (0, kit_1.address)(addr));
        console.log(adminInfo);
    });
    await commands.parseAsync();
}
main()
    .then(() => {
    process.exit();
})
    .catch((e) => {
    console.error('\n\nKamino manager CLI exited with error:\n\n', e);
    process.exit(1);
});
/** JSON for human-edited market configs: no deprecated/reserved/padding blobs (filled from chain in parse). */
function lendingMarketToConfigFileJSON(market) {
    const j = market.toJSON();
    const { reserved0: _r0, reserved1: _r1, elevationGroupPadding: _egp, padding1: _p1, elevationGroups, name, ...top } = j;
    return {
        ...top,
        name: (0, lib_1.parseZeroPaddedUtf8)(name),
        elevationGroups: elevationGroups.map(({ padding0: _p0, padding1: _gp1, ...g }) => g),
    };
}
const LENDING_MARKET_FILE_IGNORE_TOP = new Set([
    'reserved0',
    'reserved1',
    'elevationGroupPadding',
    'padding1',
    'elevationGroups',
]);
function parseLendingMarketConfigFromFile(fileObj, fallback) {
    const base = fallback.toJSON();
    const merged = { ...base };
    const mergedMut = merged;
    for (const [k, v] of Object.entries(fileObj)) {
        if (LENDING_MARKET_FILE_IGNORE_TOP.has(k))
            continue;
        if (k === 'name' && typeof v === 'string') {
            mergedMut[k] = (0, lib_1.renderZeroPaddedUtf8)(v, 32);
        }
        else {
            mergedMut[k] = v;
        }
    }
    if (fileObj.elevationGroups !== undefined && Array.isArray(fileObj.elevationGroups)) {
        const fileEgs = fileObj.elevationGroups;
        merged.elevationGroups = base.elevationGroups.map((baseEg, i) => {
            const feg = fileEgs[i];
            if (!feg || typeof feg !== 'object')
                return baseEg;
            const { padding0: _p0, padding1: _fp1, ...semantic } = feg;
            return { ...baseEg, ...semantic, padding0: baseEg.padding0, padding1: baseEg.padding1 };
        });
    }
    return lib_1.LendingMarket.fromJSON(merged);
}
function parseReserveConfigFromFile(reserveConfigFromFile) {
    const reserveConfigFields = {
        status: reserveConfigFromFile.status,
        loanToValuePct: reserveConfigFromFile.loanToValuePct,
        liquidationThresholdPct: reserveConfigFromFile.liquidationThresholdPct,
        minLiquidationBonusBps: reserveConfigFromFile.minLiquidationBonusBps,
        protocolLiquidationFeePct: reserveConfigFromFile.protocolLiquidationFeePct,
        protocolOrderExecutionFeePct: reserveConfigFromFile.protocolOrderExecutionFeePct,
        protocolTakeRatePct: reserveConfigFromFile.protocolTakeRatePct,
        paddingDeprecatedAssetTier: 0,
        maxLiquidationBonusBps: reserveConfigFromFile.maxLiquidationBonusBps,
        badDebtLiquidationBonusBps: reserveConfigFromFile.badDebtLiquidationBonusBps,
        fees: {
            originationFeeSf: fraction_1.Fraction.fromDecimal(new decimal_js_1.default(reserveConfigFromFile.fees.borrowFee)).valueSf,
            flashLoanFeeSf: fraction_1.Fraction.fromDecimal(new decimal_js_1.default(reserveConfigFromFile.fees.flashLoanFee)).valueSf,
            padding: Array(8).fill(0),
        },
        depositLimit: new bn_js_1.default(reserveConfigFromFile.depositLimit),
        borrowLimit: new bn_js_1.default(reserveConfigFromFile.borrowLimit),
        tokenInfo: {
            name: (0, lib_1.encodeTokenName)(reserveConfigFromFile.tokenInfo.name),
            heuristic: new types_1.PriceHeuristic({
                lower: new bn_js_1.default(reserveConfigFromFile.tokenInfo.heuristic.lower),
                upper: new bn_js_1.default(reserveConfigFromFile.tokenInfo.heuristic.upper),
                exp: new bn_js_1.default(reserveConfigFromFile.tokenInfo.heuristic.exp),
            }),
            maxTwapDivergenceBps: new bn_js_1.default(reserveConfigFromFile.tokenInfo.maxTwapDivergenceBps),
            maxAgePriceSeconds: new bn_js_1.default(reserveConfigFromFile.tokenInfo.maxAgePriceSeconds),
            maxAgeTwapSeconds: new bn_js_1.default(reserveConfigFromFile.tokenInfo.maxAgeTwapSeconds),
            ...parseOracleConfiguration(reserveConfigFromFile),
            blockPriceUsage: reserveConfigFromFile.tokenInfo.blockPriceUsage,
            reserved: Array(7).fill(0),
            padding: Array(19).fill(new bn_js_1.default(0)),
        },
        borrowRateCurve: parseBorrowRateCurve(reserveConfigFromFile),
        depositWithdrawalCap: new types_1.WithdrawalCaps({
            configCapacity: new bn_js_1.default(reserveConfigFromFile.depositWithdrawalCap.configCapacity),
            currentTotal: new bn_js_1.default(0),
            lastIntervalStartTimestamp: new bn_js_1.default(0),
            configIntervalLengthSeconds: new bn_js_1.default(reserveConfigFromFile.depositWithdrawalCap.configIntervalLengthSeconds),
        }),
        debtWithdrawalCap: new types_1.WithdrawalCaps({
            configCapacity: new bn_js_1.default(reserveConfigFromFile.debtWithdrawalCap.configCapacity),
            currentTotal: new bn_js_1.default(0),
            lastIntervalStartTimestamp: new bn_js_1.default(0),
            configIntervalLengthSeconds: new bn_js_1.default(reserveConfigFromFile.debtWithdrawalCap.configIntervalLengthSeconds),
        }),
        deleveragingMarginCallPeriodSecs: new bn_js_1.default(reserveConfigFromFile.deleveragingMarginCallPeriodSecs),
        borrowFactorPct: new bn_js_1.default(reserveConfigFromFile.borrowFactorPct),
        elevationGroups: reserveConfigFromFile.elevationGroups,
        deleveragingThresholdDecreaseBpsPerDay: new bn_js_1.default(reserveConfigFromFile.deleveragingThresholdDecreaseBpsPerDay),
        disableUsageAsCollOutsideEmode: reserveConfigFromFile.disableUsageAsCollOutsideEmode,
        utilizationLimitBlockBorrowingAbovePct: reserveConfigFromFile.utilizationLimitBlockBorrowingAbovePct,
        hostFixedInterestRateBps: reserveConfigFromFile.hostFixedInterestRateBps,
        autodeleverageEnabled: reserveConfigFromFile.autodeleverageEnabled,
        borrowLimitOutsideElevationGroup: new bn_js_1.default(reserveConfigFromFile.borrowLimitOutsideElevationGroup),
        borrowLimitAgainstThisCollateralInElevationGroup: parseReserveBorrowLimitAgainstCollInEmode(reserveConfigFromFile),
        deleveragingBonusIncreaseBpsPerDay: new bn_js_1.default(reserveConfigFromFile.deleveragingBonusIncreaseBpsPerDay),
        reserved1: Array(6).fill(0),
        minDeleveragingBonusBps: reserveConfigFromFile.minDeleveragingBonusBps,
        proposerAuthorityLocked: 0,
        blockCtokenUsage: 0,
        debtMaturityTimestamp: new bn_js_1.default(reserveConfigFromFile.debtMaturityTimestamp),
        debtTermSeconds: new bn_js_1.default(reserveConfigFromFile.debtTermSeconds),
    };
    return new types_1.ReserveConfig(reserveConfigFields);
}
function parseOracleConfiguration(reserveConfigFromFile) {
    const pythConfiguration = new types_2.PythConfiguration({
        price: (0, kit_1.address)(reserveConfigFromFile.tokenInfo.pythConfiguration.price),
    });
    const switchboardConfiguration = new types_2.SwitchboardConfiguration({
        priceAggregator: (0, kit_1.address)(reserveConfigFromFile.tokenInfo.switchboardConfiguration.priceAggregator),
        twapAggregator: (0, kit_1.address)(reserveConfigFromFile.tokenInfo.switchboardConfiguration.twapAggregator),
    });
    const priceChain = [65535, 65535, 65535, 65535];
    const twapChain = [65535, 65535, 65535, 65535];
    const priceChainFromFile = reserveConfigFromFile.tokenInfo.scopeConfiguration.priceChain;
    const twapChainFromFile = reserveConfigFromFile.tokenInfo.scopeConfiguration.twapChain;
    priceChainFromFile.forEach((value, index) => (priceChain[index] = value));
    twapChainFromFile.forEach((value, index) => (twapChain[index] = value));
    const scopeConfiguration = new types_1.ScopeConfiguration({
        priceFeed: (0, kit_1.address)(reserveConfigFromFile.tokenInfo.scopeConfiguration.priceFeed),
        priceChain: priceChain,
        twapChain: twapChain,
    });
    return {
        pythConfiguration,
        switchboardConfiguration,
        scopeConfiguration,
    };
}
function parseBorrowRateCurve(reserveConfigFromFile) {
    const curvePoints = [];
    reserveConfigFromFile.borrowRateCurve.points.forEach((curvePoint) => curvePoints.push({
        utilizationRateBps: curvePoint.utilizationRateBps,
        borrowRateBps: curvePoint.borrowRateBps,
    }));
    const finalCurvePoints = Array(11).fill(curvePoints[curvePoints.length - 1]);
    curvePoints.forEach((curvePoint, index) => (finalCurvePoints[index] = curvePoint));
    const borrowRateCurve = new types_1.BorrowRateCurve({ points: finalCurvePoints });
    return borrowRateCurve;
}
function parseReserveBorrowLimitAgainstCollInEmode(reserveConfigFromFile) {
    const reserveBorrowLimitAgainstCollInEmode = Array(32).fill(new bn_js_1.default(0));
    reserveConfigFromFile.borrowLimitAgainstThisCollateralInElevationGroup.forEach((limit, index) => (reserveBorrowLimitAgainstCollInEmode[index] = new bn_js_1.default(limit)));
    return reserveBorrowLimitAgainstCollInEmode;
}
function parseReserveConfigToFile(reserveConfig) {
    const decoder = new TextDecoder('utf-8');
    return {
        status: reserveConfig.status,
        hostFixedInterestRateBps: reserveConfig.hostFixedInterestRateBps,
        minDeleveragingBonusBps: reserveConfig.minDeleveragingBonusBps,
        blockCtokenUsage: reserveConfig.blockCtokenUsage,
        loanToValuePct: reserveConfig.loanToValuePct,
        liquidationThresholdPct: reserveConfig.liquidationThresholdPct,
        minLiquidationBonusBps: reserveConfig.minLiquidationBonusBps,
        protocolLiquidationFeePct: reserveConfig.protocolLiquidationFeePct,
        protocolOrderExecutionFeePct: reserveConfig.protocolOrderExecutionFeePct,
        protocolTakeRatePct: reserveConfig.protocolTakeRatePct,
        maxLiquidationBonusBps: reserveConfig.maxLiquidationBonusBps,
        badDebtLiquidationBonusBps: reserveConfig.badDebtLiquidationBonusBps,
        fees: {
            borrowFee: new fraction_1.Fraction(reserveConfig.fees.originationFeeSf).toDecimal().toString(),
            flashLoanFee: new fraction_1.Fraction(reserveConfig.fees.flashLoanFeeSf).toDecimal().toString(),
        },
        depositLimit: reserveConfig.depositLimit.toString(),
        borrowLimit: reserveConfig.borrowLimit.toString(),
        tokenInfo: {
            name: decoder.decode(Uint8Array.from(reserveConfig.tokenInfo.name)).replace(/\0/g, ''),
            heuristic: {
                exp: reserveConfig.tokenInfo.heuristic.exp.toString(),
                lower: reserveConfig.tokenInfo.heuristic.lower.toString(),
                upper: reserveConfig.tokenInfo.heuristic.upper.toString(),
            },
            maxTwapDivergenceBps: reserveConfig.tokenInfo.maxTwapDivergenceBps.toString(),
            maxAgePriceSeconds: reserveConfig.tokenInfo.maxAgePriceSeconds.toString(),
            maxAgeTwapSeconds: reserveConfig.tokenInfo.maxAgeTwapSeconds.toString(),
            scopeConfiguration: reserveConfig.tokenInfo.scopeConfiguration,
            switchboardConfiguration: reserveConfig.tokenInfo.switchboardConfiguration,
            pythConfiguration: reserveConfig.tokenInfo.pythConfiguration,
            blockPriceUsage: reserveConfig.tokenInfo.blockPriceUsage,
        },
        borrowRateCurve: {
            points: (0, curve_1.trimPoints)(reserveConfig.borrowRateCurve.points),
        },
        depositWithdrawalCap: reserveConfig.depositWithdrawalCap,
        debtWithdrawalCap: reserveConfig.debtWithdrawalCap,
        deleveragingMarginCallPeriodSecs: reserveConfig.deleveragingMarginCallPeriodSecs.toString(),
        borrowFactorPct: reserveConfig.borrowFactorPct.toString(),
        elevationGroups: reserveConfig.elevationGroups,
        deleveragingThresholdDecreaseBpsPerDay: reserveConfig.deleveragingThresholdDecreaseBpsPerDay.toString(),
        disableUsageAsCollOutsideEmode: reserveConfig.disableUsageAsCollOutsideEmode,
        utilizationLimitBlockBorrowingAbovePct: reserveConfig.utilizationLimitBlockBorrowingAbovePct,
        autodeleverageEnabled: reserveConfig.autodeleverageEnabled,
        proposerAuthorityLocked: reserveConfig.proposerAuthorityLocked,
        borrowLimitOutsideElevationGroup: reserveConfig.borrowLimitOutsideElevationGroup.toString(),
        borrowLimitAgainstThisCollateralInElevationGroup: reserveConfig.borrowLimitAgainstThisCollateralInElevationGroup.map((entry) => entry.toString()),
        deleveragingBonusIncreaseBpsPerDay: reserveConfig.deleveragingBonusIncreaseBpsPerDay.toString(),
        debtMaturityTimestamp: reserveConfig.debtMaturityTimestamp.toString(),
        debtTermSeconds: reserveConfig.debtTermSeconds.toString(),
    };
}
async function createUpdateReserveConfigLutIxs(env, lendingMarketAddress, reserveAddress) {
    const globalConfigAddress = await (0, lib_1.globalConfigPda)(env.klendProgramId);
    const contents = [globalConfigAddress, lendingMarketAddress, reserveAddress];
    const signer = await env.getSigner();
    const [createIx, lut] = await (0, lib_1.createLookupTableIx)(env.c.rpc, signer);
    const extendIxs = (0, lib_1.extendLookupTableIxs)(signer, lut, contents);
    return [lut, [createIx, ...extendIxs]];
}
//# sourceMappingURL=client_kamino_manager.js.map
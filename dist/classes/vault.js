"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultHoldings = exports.ReserveAllocationConfig = exports.KaminoVaultConfig = exports.KaminoVault = exports.KaminoVaultClient = exports.DEFAULT_CU_PER_TX = exports.INITIAL_DEPOSIT_LAMPORTS = exports.METADATA_PROGRAM_ID = exports.METADATA_SEED = exports.kaminoVaultStagingId = exports.kaminoVaultId = void 0;
exports.getCTokenVaultPda = getCTokenVaultPda;
exports.getEventAuthorityPda = getEventAuthorityPda;
exports.getKvaultGlobalConfigPda = getKvaultGlobalConfigPda;
exports.getReserveWhitelistEntryPda = getReserveWhitelistEntryPda;
const bn_js_1 = __importDefault(require("bn.js"));
const memo_1 = require("@solana-program/memo");
const kit_1 = require("@solana/kit");
const lib_1 = require("../lib");
const instructions_1 = require("../@codegen/kvault/instructions");
const types_1 = require("../@codegen/kvault/types");
const accounts_1 = require("../@codegen/kvault/accounts");
const decimal_js_1 = __importDefault(require("decimal.js"));
const utils_1 = require("./utils");
const programId_1 = require("../@codegen/klend/programId");
const fraction_1 = require("./fraction");
const utils_2 = require("../utils");
const utils_3 = require("../utils");
const batch_1 = require("@kamino-finance/kliquidity-sdk/dist/utils/batch");
const math_1 = require("@kamino-finance/kliquidity-sdk/dist/utils/math");
const utils_4 = require("@kamino-finance/kliquidity-sdk/dist/utils/utils");
const CreationParameters_1 = require("@kamino-finance/kliquidity-sdk/dist/utils/CreationParameters");
const dist_1 = require("@kamino-finance/farms-sdk/dist");
const utils_5 = require("../utils");
const farm_utils_1 = require("./farm_utils");
const system_1 = require("@solana-program/system");
const metadata_1 = require("../utils/metadata");
const vault_1 = require("../utils/vault");
const token_2022_1 = require("@solana-program/token-2022");
const token_1 = require("@solana-program/token");
const sysvars_1 = require("@solana/sysvars");
const signer_1 = require("../utils/signer");
const farms_sdk_1 = require("@kamino-finance/farms-sdk");
const vaultAllocation_1 = require("../utils/vaultAllocation");
const farmUtils_1 = require("../utils/farmUtils");
const readCdnData_1 = require("../utils/readCdnData");
const multisig_1 = require("../utils/multisig");
const updateGlobalConfigAdmin_1 = require("../@codegen/kvault/instructions/updateGlobalConfigAdmin");
exports.kaminoVaultId = (0, kit_1.address)('KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd');
exports.kaminoVaultStagingId = (0, kit_1.address)('stKvQfwRsQiKnLtMNVLHKS3exFJmZFsgfzBPWHECUYK');
const TOKEN_VAULT_SEED = 'token_vault';
const CTOKEN_VAULT_SEED = 'ctoken_vault';
const BASE_VAULT_AUTHORITY_SEED = 'authority';
const SHARES_SEED = 'shares';
const EVENT_AUTHORITY_SEED = '__event_authority';
exports.METADATA_SEED = 'metadata';
const GLOBAL_CONFIG_STATE_SEED = 'global_config';
const WHITELISTED_RESERVES_SEED = 'whitelisted_reserves';
exports.METADATA_PROGRAM_ID = (0, kit_1.address)('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
exports.INITIAL_DEPOSIT_LAMPORTS = 1000;
exports.DEFAULT_CU_PER_TX = 1_400_000;
const addressEncoder = (0, kit_1.getAddressEncoder)();
const base58Decoder = (0, kit_1.getBase58Decoder)();
/**
 * KaminoVaultClient is a class that provides a high-level interface to interact with the Kamino Vault program.
 */
class KaminoVaultClient {
    _rpc;
    _kaminoVaultProgramId;
    _kaminoLendProgramId;
    _farmsProgramId;
    recentSlotDurationMs;
    // CDN cache
    _cdnResources;
    _cdnResourcesPromise;
    constructor(rpc, recentSlotDurationMs, kaminoVaultprogramId, kaminoLendProgramId, cdnResources, farmsProgramId) {
        this._rpc = rpc;
        this.recentSlotDurationMs = recentSlotDurationMs;
        this._kaminoVaultProgramId = kaminoVaultprogramId ? kaminoVaultprogramId : exports.kaminoVaultId;
        this._kaminoLendProgramId = kaminoLendProgramId ? kaminoLendProgramId : programId_1.PROGRAM_ID;
        this._farmsProgramId = farmsProgramId;
        this._cdnResources = cdnResources;
    }
    getConnection() {
        return this._rpc;
    }
    getProgramID() {
        return this._kaminoVaultProgramId;
    }
    getRpc() {
        return this._rpc;
    }
    hasFarm() {
        return;
    }
    async loadCdnResourcesOnce() {
        if (this._cdnResources) {
            return this._cdnResources;
        }
        if (this._cdnResourcesPromise) {
            return this._cdnResourcesPromise;
        }
        this._cdnResourcesPromise = (async () => {
            const response = await fetch(`${utils_2.CDN_ENDPOINT}/resources.json`);
            if (!response.ok) {
                console.error(`Failed to fetch CDN resources: ${response.status} ${response.statusText}`);
                return undefined;
            }
            const raw = (await response.json());
            const delegatedVaultFarms = raw['mainnet-beta']?.delegatedVaultFarms;
            if (!delegatedVaultFarms) {
                return undefined;
            }
            const riskManagers = raw['mainnet-beta']?.riskManagers ?? {};
            const parsed = { delegatedVaultFarms, riskManagers };
            this._cdnResources = parsed;
            return parsed;
        })();
        return this._cdnResourcesPromise;
    }
    /**
     * Check if a vault has all the needed criteria to be released
     * - owner is multisig
     * - vaultFarm is set and it is a farm that is valid
     * - FLC farm is set and it is a farm that is valid (warning if not)
     * - check shares token metadata is set
     * - Check min deposit is not 0
     * - Check the vault has at least one allocation
     * - Check there are allocations with weight > 0 and cap > 0 (and give warning for each allocation which doesn't have cap == u64::MAX)
     * - Check CDN (using loadCdnResourcesOnce) that the vaultAdmin exists in the list of admins and has a description
     * @param vault - the vault to check
     * @returns - a promise that resolves to the release status of the vault
     */
    async checkVaultReleaseStatus(vault) {
        const result = {
            errors: [],
            warnings: [],
            success: true,
        };
        const vaultState = await vault.getState();
        // 1. Check owner is multisig
        try {
            const isMultisig = await (0, multisig_1.walletIsSquadsMultisig)(vaultState.vaultAdminAuthority);
            if (!isMultisig) {
                result.errors.push(`Vault admin ${vaultState.vaultAdminAuthority} is not a Squads multisig`);
            }
        }
        catch (e) {
            result.errors.push(`Failed to check if vault admin ${vaultState.vaultAdminAuthority} is a multisig: ${e}`);
        }
        // 2. Check vaultFarm is set and valid
        if (vaultState.vaultFarm === lib_1.DEFAULT_PUBLIC_KEY) {
            result.errors.push('Vault farm is not set');
        }
        else {
            const farmState = await dist_1.FarmState.fetch(this._rpc, vaultState.vaultFarm);
            if (!farmState) {
                result.errors.push(`Vault farm ${vaultState.vaultFarm} could not be fetched (invalid or does not exist)`);
            }
        }
        // 3. Check FLC farm is set and valid (warning if not)
        if (vaultState.firstLossCapitalFarm === lib_1.DEFAULT_PUBLIC_KEY) {
            result.warnings.push('First loss capital farm is not set');
        }
        else {
            const flcFarmState = await dist_1.FarmState.fetch(this._rpc, vaultState.firstLossCapitalFarm);
            if (!flcFarmState) {
                result.warnings.push(`First loss capital farm ${vaultState.firstLossCapitalFarm} could not be fetched (invalid or does not exist)`);
            }
            else {
                if (!(await this.isFlcFarmValid(flcFarmState, vaultState))) {
                    result.warnings.push(`First loss capital farm ${vaultState.firstLossCapitalFarm} is not valid`);
                }
            }
        }
        // 4. Check shares token metadata is set
        const [sharesMintMetadata] = await (0, utils_2.getKVaultSharesMetadataPda)(vaultState.sharesMint);
        const metadataAccount = await (0, kit_1.fetchEncodedAccount)(this._rpc, sharesMintMetadata, { commitment: 'processed' });
        if (!metadataAccount.exists) {
            result.errors.push(`Shares token metadata not set for shares mint ${vaultState.sharesMint}`);
        }
        // 5. Check min deposit is not 0
        if (vaultState.minDepositAmount.isZero()) {
            result.errors.push('Min deposit amount is 0');
        }
        // 6. Check the vault has at least one allocation
        const activeAllocations = vaultState.vaultAllocationStrategy.filter((allocation) => allocation.reserve !== lib_1.DEFAULT_PUBLIC_KEY);
        if (activeAllocations.length === 0) {
            result.errors.push('Vault has no allocations');
        }
        // 7. Check allocations have weight > 0 and cap > 0, warn if cap != u64::MAX
        for (const allocation of activeAllocations) {
            if (allocation.targetAllocationWeight.isZero()) {
                result.errors.push(`Allocation for reserve ${allocation.reserve} has weight 0`);
            }
            if (allocation.tokenAllocationCap.isZero()) {
                result.errors.push(`Allocation for reserve ${allocation.reserve} has cap 0`);
            }
            else if (allocation.tokenAllocationCap.toString() !== utils_2.U64_MAX) {
                result.warnings.push(`Allocation for reserve ${allocation.reserve} has cap ${allocation.tokenAllocationCap.toString()} (not u64::MAX)`);
            }
        }
        // 9. Check CDN that the vault admin exists in riskManagers and has a description
        const cdnResources = await this.loadCdnResourcesOnce();
        if (!cdnResources) {
            result.errors.push('Could not fetch CDN resources to verify vault admin');
        }
        else {
            const adminEntries = cdnResources.riskManagers[vaultState.vaultAdminAuthority];
            if (!adminEntries || adminEntries.length === 0) {
                result.errors.push(`Vault admin ${vaultState.vaultAdminAuthority} not found in CDN riskManagers`);
            }
            else {
                const hasDescription = adminEntries.some((entry) => entry.description && entry.description.trim().length > 0);
                if (!hasDescription) {
                    result.errors.push(`Vault admin ${vaultState.vaultAdminAuthority} found in CDN riskManagers but has no description`);
                }
            }
        }
        result.success = result.errors.length === 0;
        return result;
    }
    /**
     * Prints a vault in a human readable form
     * @param vaultPubkey - the address of the vault
     * @param [vaultState] - optional parameter to pass the vault state directly; this will save a network call
     * @param [slot] - optional slot to use for calculations; if not provided, the latest confirmed slot will be fetched
     * @returns - void; prints the vault to the console
     */
    async printVault(vaultPubkey, vaultState, slot) {
        const vault = vaultState ? vaultState : await accounts_1.VaultState.fetch(this.getConnection(), vaultPubkey);
        if (!vault) {
            console.log(`Vault ${vaultPubkey.toString()} not found`);
            return;
        }
        const kaminoVault = KaminoVault.loadWithClientAndState(this, vaultPubkey, vault);
        const vaultName = this.decodeVaultName(vault.name);
        const currentSlot = slot ?? (await this.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const tokensPerShare = await this.getTokensPerShareSingleVault(kaminoVault, currentSlot);
        const holdings = await this.getVaultHoldings(vault, currentSlot);
        const sharesIssued = new decimal_js_1.default(vault.sharesIssued.toString()).div(new decimal_js_1.default(vault.sharesMintDecimals.toString()));
        console.log('Name: ', vaultName);
        console.log('Shares issued: ', sharesIssued);
        holdings.print();
        console.log('Tokens per share: ', tokensPerShare);
    }
    /**
     * This method initializes the kvault global config (one off, needs to be signed by program owner)
     * @param admin - the admin of the kvault program
     * @returns - an instruction to initialize the kvault global config
     */
    async initKvaultGlobalConfigIx(admin) {
        const globalConfigAddress = await getKvaultGlobalConfigPda(this.getProgramID());
        const programData = await (0, utils_2.programDataPda)(this.getProgramID());
        const ix = (0, instructions_1.initKVaultGlobalConfig)({
            payer: admin,
            globalConfig: globalConfigAddress,
            programData: programData,
            systemProgram: system_1.SYSTEM_PROGRAM_ADDRESS,
            rent: sysvars_1.SYSVAR_RENT_ADDRESS,
        }, undefined, this.getProgramID());
        return ix;
    }
    /**
     * This method updates the kvault global config
     * @param mode - the mode to update the global config with
     * @returns - an instruction to update the global config
     */
    async updateGlobalConfigIx(mode, value) {
        console.log('in updateGlobalConfigIx');
        let modeEnum;
        switch (mode) {
            case 'PendingAdmin': {
                // Ensure value is a valid address string before converting
                if (!value || value.length < 32) {
                    throw new Error(`Invalid address value: ${value}`);
                }
                const addr = (0, kit_1.address)(value);
                modeEnum = new types_1.UpdateGlobalConfigMode.PendingAdmin([addr]);
                break;
            }
            case 'MinWithdrawalPenaltyLamports': {
                modeEnum = new types_1.UpdateGlobalConfigMode.MinWithdrawalPenaltyLamports([new bn_js_1.default(value)]);
                break;
            }
            case 'MinWithdrawalPenaltyBPS': {
                modeEnum = new types_1.UpdateGlobalConfigMode.MinWithdrawalPenaltyBPS([new bn_js_1.default(value)]);
                break;
            }
            default:
                throw new Error(`Unknown update mode: ${mode}`);
        }
        const args = {
            update: modeEnum,
        };
        const globalConfigAddress = await getKvaultGlobalConfigPda(this.getProgramID());
        const globalConfigState = await lib_1.KVaultGlobalConfig.fetch(this.getConnection(), globalConfigAddress);
        if (!globalConfigState) {
            throw new Error('Global config not found');
        }
        const admin = globalConfigState.globalAdmin;
        const accounts = {
            globalAdmin: (0, signer_1.noopSigner)(admin),
            globalConfig: globalConfigAddress,
        };
        return (0, instructions_1.updateKVaultGlobalConfig)(args, accounts, undefined, this.getProgramID());
    }
    /**
     * This method accepts the ownership of the global config
     * @param admin - the admin of the transaction
     * @returns - an instruction to accept the ownership of the global config
     */
    async acceptGlobalConfigOwnershipIx(admin) {
        const globalConfigAddress = await getKvaultGlobalConfigPda(this.getProgramID());
        const accounts = {
            pendingAdmin: admin,
            globalConfig: globalConfigAddress,
        };
        return (0, updateGlobalConfigAdmin_1.updateGlobalConfigAdmin)(accounts, undefined, this.getProgramID());
    }
    /**
     * This method will create a vault with a given config. The config can be changed later on, but it is recommended to set it up correctly from the start
     * @param vaultConfig - the config object used to create a vault
     * @param [useDevnetFarms] - whether to use devnet farms
     * @param [slot] - optional slot to use for lookup table creation; if not provided, the latest finalized slot will be fetched
     * @returns vault: the keypair of the vault, used to sign the initialization transaction; initVaultIxs: a struct with ixs to initialize the vault and its lookup table + populateLUTIxs, a list to populate the lookup table which has to be executed in a separate transaction
     */
    async createVaultIxs(vaultConfig, useDevnetFarms = false, slot) {
        const vaultState = await (0, kit_1.generateKeyPairSigner)();
        const size = BigInt(accounts_1.VaultState.layout.span + 8);
        const createVaultIx = (0, system_1.getCreateAccountInstruction)({
            payer: vaultConfig.admin,
            space: size,
            lamports: await this.getConnection().getMinimumBalanceForRentExemption(size).send(),
            programAddress: this._kaminoVaultProgramId,
            newAccount: vaultState,
        });
        const [resolvedSlot, [tokenVault], [baseVaultAuthority], [sharesMint]] = await Promise.all([
            slot ? Promise.resolve(slot) : this.getConnection().getSlot({ commitment: 'finalized' }).send(),
            (0, kit_1.getProgramDerivedAddress)({
                seeds: [Buffer.from(TOKEN_VAULT_SEED), addressEncoder.encode(vaultState.address)],
                programAddress: this._kaminoVaultProgramId,
            }),
            (0, kit_1.getProgramDerivedAddress)({
                seeds: [Buffer.from(BASE_VAULT_AUTHORITY_SEED), addressEncoder.encode(vaultState.address)],
                programAddress: this._kaminoVaultProgramId,
            }),
            (0, kit_1.getProgramDerivedAddress)({
                seeds: [Buffer.from(SHARES_SEED), addressEncoder.encode(vaultState.address)],
                programAddress: this._kaminoVaultProgramId,
            }),
        ]);
        let adminTokenAccount;
        const prerequisiteIxs = [];
        const cleanupIxs = [];
        if (vaultConfig.tokenMint === lib_1.WRAPPED_SOL_MINT) {
            const { wsolAta, createAtaIxs, closeAtaIxs } = await (0, utils_2.createWsolAtaIfMissing)(this.getConnection(), new decimal_js_1.default(utils_2.VAULT_INITIAL_DEPOSIT), vaultConfig.admin, vaultConfig.tokenMintProgramId);
            adminTokenAccount = wsolAta;
            prerequisiteIxs.push(...createAtaIxs);
            cleanupIxs.push(...closeAtaIxs);
        }
        else {
            adminTokenAccount = (await (0, token_2022_1.findAssociatedTokenPda)({
                mint: vaultConfig.tokenMint,
                tokenProgram: vaultConfig.tokenMintProgramId,
                owner: vaultConfig.admin.address,
            }))[0];
        }
        const initVaultAccounts = {
            adminAuthority: vaultConfig.admin,
            vaultState: vaultState.address,
            baseTokenMint: vaultConfig.tokenMint,
            tokenVault,
            baseVaultAuthority,
            sharesMint,
            systemProgram: system_1.SYSTEM_PROGRAM_ADDRESS,
            rent: sysvars_1.SYSVAR_RENT_ADDRESS,
            tokenProgram: vaultConfig.tokenMintProgramId,
            sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
            adminTokenAccount,
        };
        const initVaultIx = (0, instructions_1.initVault)(initVaultAccounts, undefined, this._kaminoVaultProgramId);
        const createVaultFarm = await this.createVaultFarm(vaultConfig.admin, vaultState.address, sharesMint, useDevnetFarms);
        // create and set up the vault lookup table
        const [createLUTIx, lut] = await (0, utils_5.initLookupTableIx)(vaultConfig.admin, resolvedSlot);
        const farmsGlobalConfig = useDevnetFarms ? farm_utils_1.FARMS_GLOBAL_CONFIG_DEVNET : farm_utils_1.FARMS_GLOBAL_CONFIG_MAINNET;
        const accountsToBeInserted = [
            vaultConfig.admin.address,
            vaultState.address,
            vaultConfig.tokenMint,
            vaultConfig.tokenMintProgramId,
            baseVaultAuthority,
            sharesMint,
            system_1.SYSTEM_PROGRAM_ADDRESS,
            sysvars_1.SYSVAR_RENT_ADDRESS,
            token_1.TOKEN_PROGRAM_ADDRESS,
            this._kaminoLendProgramId,
            sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
            createVaultFarm.farm.address,
            farmsGlobalConfig,
        ];
        const insertIntoLUTIxs = await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), vaultConfig.admin, lut, accountsToBeInserted, []);
        const setLUTIx = await this.updateUninitialisedVaultConfigIx(vaultConfig.admin, vaultState.address, new types_1.VaultConfigField.LookupTable(), lut.toString());
        const ixs = [createVaultIx, initVaultIx, setLUTIx];
        if (vaultConfig.getPerformanceFeeBps() > 0) {
            const setPerformanceFeeIx = await this.updateUninitialisedVaultConfigIx(vaultConfig.admin, vaultState.address, new types_1.VaultConfigField.PerformanceFeeBps(), vaultConfig.getPerformanceFeeBps().toString());
            ixs.push(setPerformanceFeeIx);
        }
        if (vaultConfig.getManagementFeeBps() > 0) {
            const setManagementFeeIx = await this.updateUninitialisedVaultConfigIx(vaultConfig.admin, vaultState.address, new types_1.VaultConfigField.ManagementFeeBps(), vaultConfig.getManagementFeeBps().toString());
            ixs.push(setManagementFeeIx);
        }
        if (vaultConfig.name && vaultConfig.name.length > 0) {
            const setNameIx = await this.updateUninitialisedVaultConfigIx(vaultConfig.admin, vaultState.address, new types_1.VaultConfigField.Name(), vaultConfig.name);
            ixs.push(setNameIx);
        }
        const setFarmIx = await this.updateUninitialisedVaultConfigIx(vaultConfig.admin, vaultState.address, new types_1.VaultConfigField.Farm(), createVaultFarm.farm.address);
        const metadataIx = await this.getSetSharesMetadataIx(this.getConnection(), vaultConfig.admin, vaultState.address, sharesMint, baseVaultAuthority, vaultConfig.vaultTokenSymbol, vaultConfig.vaultTokenName, undefined, this._kaminoVaultProgramId);
        return {
            vault: vaultState,
            lut,
            initVaultIxs: {
                createAtaIfNeededIxs: prerequisiteIxs,
                initVaultIxs: ixs,
                createLUTIx,
                populateLUTIxs: insertIntoLUTIxs,
                cleanupIxs,
                initSharesMetadataIx: metadataIx,
                createVaultFarm,
                setFarmToVaultIx: setFarmIx,
            },
        };
    }
    /**
     * This method creates a farm for a vault
     * @param signer - the signer of the transaction
     * @param vaultSharesMint - the mint of the vault shares
     * @param vaultAddress - the address of the vault (it doesn't need to be already initialized)
     * @returns a struct with the farm, the setup farm ixs and the update farm ixs
     */
    async createVaultFarm(signer, vaultAddress, vaultSharesMint, useDevnetFarms = false) {
        const farmsSDK = new farms_sdk_1.Farms(this._rpc, this._farmsProgramId);
        const globalConfig = useDevnetFarms ? farm_utils_1.FARMS_GLOBAL_CONFIG_DEVNET : farm_utils_1.FARMS_GLOBAL_CONFIG_MAINNET;
        const farm = await (0, kit_1.generateKeyPairSigner)();
        const ixs = await farmsSDK.createFarmIxs(signer, farm, globalConfig, vaultSharesMint);
        const updatePendingFarmAdminIx = await farmsSDK.updateFarmConfigIx(signer, farm.address, lib_1.DEFAULT_PUBLIC_KEY, new dist_1.FarmConfigOption.UpdatePendingFarmAdmin(), farm_utils_1.FARMS_ADMIN_MAINNET, undefined, undefined, true);
        const updateFarmVaultIdIx = await farmsSDK.updateFarmConfigIx(signer, farm.address, lib_1.DEFAULT_PUBLIC_KEY, new dist_1.FarmConfigOption.UpdateVaultId(), vaultAddress, undefined, undefined, true);
        return {
            farm,
            setupFarmIxs: ixs,
            updateFarmIxs: [updatePendingFarmAdminIx, updateFarmVaultIdIx],
        };
    }
    /**
     * This method creates an instruction to set the shares metadata for a vault
     * @param rpc
     * @param vaultAdmin
     * @param vault - the vault to set the shares metadata for
     * @param sharesMint
     * @param baseVaultAuthority
     * @param tokenName - the name of the token in the vault (symbol; e.g. "USDC" which becomes "kVUSDC")
     * @param extraName - the extra string appended to the prefix("Kamino Vault USDC <extraName>")
     * @returns - an instruction to set the shares metadata for the vault
     */
    async getSetSharesMetadataIx(rpc, vaultAdmin, vault, sharesMint, baseVaultAuthority, tokenName, extraName, metadataProgramId = exports.METADATA_PROGRAM_ID, kvaultProgramId) {
        const kvaultProgramIdToUse = kvaultProgramId ?? this._kaminoVaultProgramId;
        const [sharesMintMetadata] = await (0, utils_2.getKVaultSharesMetadataPda)(sharesMint, metadataProgramId);
        const { name, symbol, uri } = (0, metadata_1.resolveMetadata)(sharesMint, extraName, tokenName);
        const ix = !(await (0, kit_1.fetchEncodedAccount)(rpc, sharesMintMetadata, { commitment: 'processed' })).exists
            ? await (0, metadata_1.getInitializeKVaultSharesMetadataIx)(vaultAdmin, vault, sharesMint, baseVaultAuthority, name, symbol, uri, metadataProgramId, kvaultProgramIdToUse)
            : await (0, metadata_1.getUpdateSharesMetadataIx)(vaultAdmin, vault, sharesMint, baseVaultAuthority, name, symbol, uri, metadataProgramId, kvaultProgramIdToUse);
        return ix;
    }
    /**
     * This method updates the vault reserve allocation config for an exiting vault reserve, or adds a new reserve to the vault if it does not exist.
     * @param vault - vault to be updated
     * @param reserveAllocationConfig - new reserve allocation config
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct with an instruction to update the reserve allocation and an optional list of instructions to update the lookup table for the allocation changes
     */
    async updateReserveAllocationIxs(vault, reserveAllocationConfig, vaultAdminAuthority) {
        const vaultState = await vault.getState();
        const reserveState = reserveAllocationConfig.getReserveState();
        const cTokenVault = await getCTokenVaultPda(vault.address, reserveAllocationConfig.getReserveAddress(), this._kaminoVaultProgramId);
        const reserveWhitelistEntryOption = await getReserveWhitelistEntryIfExists(reserveAllocationConfig.getReserveAddress(), this.getConnection(), this._kaminoVaultProgramId);
        const vaultAdmin = parseVaultAdmin(vaultState, vaultAdminAuthority);
        const updateReserveAllocationAccounts = {
            signer: vaultAdmin,
            vaultState: vault.address,
            baseVaultAuthority: vaultState.baseVaultAuthority,
            reserveCollateralMint: reserveState.collateral.mintPubkey,
            reserve: reserveAllocationConfig.getReserveAddress(),
            ctokenVault: cTokenVault,
            reserveWhitelistEntry: reserveWhitelistEntryOption,
            systemProgram: system_1.SYSTEM_PROGRAM_ADDRESS,
            rent: sysvars_1.SYSVAR_RENT_ADDRESS,
            reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
        };
        const updateReserveAllocationArgs = {
            weight: new bn_js_1.default(reserveAllocationConfig.targetAllocationWeight),
            cap: new bn_js_1.default(reserveAllocationConfig.getAllocationCapLamports().floor().toString()),
        };
        const updateReserveAllocationIx = (0, instructions_1.updateReserveAllocation)(updateReserveAllocationArgs, updateReserveAllocationAccounts, undefined, this._kaminoVaultProgramId);
        const accountsToAddToLut = [
            reserveAllocationConfig.getReserveAddress(),
            cTokenVault,
            ...this.getReserveAccountsToInsertInLut(reserveState),
        ];
        const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(reserveState.lendingMarket, this._kaminoLendProgramId);
        accountsToAddToLut.push(lendingMarketAuth);
        const insertIntoLutIxs = await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), vaultAdmin, vaultState.vaultLookupTable, accountsToAddToLut);
        const updateReserveAllocationIxs = {
            updateReserveAllocationIx,
            updateLUTIxs: insertIntoLutIxs,
        };
        return updateReserveAllocationIxs;
    }
    /**
     * This method updates the unallocated weight and cap of a vault (both are optional, if not provided the current values will be used)
     * @param vault - the vault to update the unallocated weight and cap for
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @param [unallocatedWeight] - the new unallocated weight to set. If not provided, the current unallocated weight will be used
     * @param [unallocatedCap] - the new unallocated cap to set. If not provided, the current unallocated cap will be used
     * @returns - a list of instructions to update the unallocated weight and cap
     */
    async updateVaultUnallocatedWeightAndCapIxs(vault, vaultAdminAuthority, unallocatedWeight, unallocatedCap) {
        const vaultState = await vault.getState();
        const unallocatedWeightToUse = unallocatedWeight ? unallocatedWeight : vaultState.unallocatedWeight;
        const unallocatedCapToUse = unallocatedCap ? unallocatedCap : vaultState.unallocatedTokensCap;
        const ixs = [];
        if (!unallocatedWeightToUse.eq(vaultState.unallocatedWeight)) {
            const updateVaultUnallocatedWeightIx = await this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.UnallocatedWeight(), unallocatedWeightToUse.toString(), vaultAdminAuthority);
            ixs.push(updateVaultUnallocatedWeightIx.updateVaultConfigIx);
        }
        if (!unallocatedCapToUse.eq(vaultState.unallocatedTokensCap)) {
            const updateVaultUnallocatedCapIx = await this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.UnallocatedTokensCap(), unallocatedCapToUse.toString(), vaultAdminAuthority);
            ixs.push(updateVaultUnallocatedCapIx.updateVaultConfigIx);
        }
        return ixs;
    }
    /**
     * This method withdraws all the funds from a reserve and blocks it from being invested by setting its weight and ctoken allocation to 0
     * @param vault - the vault to withdraw the funds from
     * @param reserve - the reserve to withdraw the funds from
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct with an instruction to update the reserve allocation and an optional list of instructions to update the lookup table for the allocation changes
     */
    async withdrawEverythingAndBlockInvestReserve(vault, reserve, vaultAdminAuthority) {
        const vaultState = await vault.getState();
        const reserveIsPartOfAllocation = vaultState.vaultAllocationStrategy.some((allocation) => allocation.reserve === reserve);
        const withdrawAndBlockReserveIxs = {
            updateReserveAllocationIxs: [],
            investIxs: [],
        };
        if (!reserveIsPartOfAllocation) {
            return withdrawAndBlockReserveIxs;
        }
        const reserveState = await lib_1.Reserve.fetch(this.getConnection(), reserve);
        if (reserveState === null) {
            return withdrawAndBlockReserveIxs;
        }
        const reserveWithAddress = {
            address: reserve,
            state: reserveState,
        };
        const reserveAllocationConfig = new ReserveAllocationConfig(reserveWithAddress, 0, new decimal_js_1.default(0));
        const admin = vaultAdminAuthority ? vaultAdminAuthority : (0, signer_1.noopSigner)(vaultState.vaultAdminAuthority);
        // update allocation to have 0 weight and 0 cap
        const updateAllocIxs = await this.updateReserveAllocationIxs(vault, reserveAllocationConfig, admin);
        const investIx = await this.investSingleReserveIxs(admin, vault, reserveWithAddress);
        withdrawAndBlockReserveIxs.updateReserveAllocationIxs = [updateAllocIxs.updateReserveAllocationIx];
        withdrawAndBlockReserveIxs.investIxs = investIx;
        return withdrawAndBlockReserveIxs;
    }
    /**
     * This method withdraws all the funds from all the reserves and blocks them from being invested by setting their weight and ctoken allocation to 0
     * @param vault - the vault to withdraw the invested funds from
     * @param [vaultReservesMap] - optional parameter to pass a map of the vault reserves. If not provided, the reserves will be loaded from the vault
     * @param [payer] - optional parameter to pass a different payer for the transaction. If not provided, the admin of the vault will be used; this is the payer for the invest ixs and it should have an ATA and some lamports (2x no_of_reserves) of the token vault
     * @returns - a struct with an instruction to update the reserve allocations (set weight and ctoken allocation to 0) and an a list of instructions to disinvest the funds in the reserves
     */
    async withdrawEverythingFromAllReservesAndBlockInvest(vault, vaultReservesMap, payer) {
        const vaultState = await vault.getState();
        const reserves = this.getVaultReserves(vaultState);
        const withdrawAndBlockReserveIxs = {
            updateReserveAllocationIxs: [],
            investIxs: [],
        };
        if (!vaultReservesMap) {
            vaultReservesMap = await this.loadVaultReserves(vaultState);
        }
        for (const reserve of reserves) {
            const reserveWithAddress = {
                address: reserve,
                state: vaultReservesMap.get(reserve).state,
            };
            const reserveAllocationConfig = new ReserveAllocationConfig(reserveWithAddress, 0, new decimal_js_1.default(0));
            // update allocation to have 0 weight and 0 cap
            const updateAllocIxs = await this.updateReserveAllocationIxs(vault, reserveAllocationConfig, payer);
            withdrawAndBlockReserveIxs.updateReserveAllocationIxs.push(updateAllocIxs.updateReserveAllocationIx);
        }
        const investPayer = payer ? payer : (0, signer_1.noopSigner)(vaultState.vaultAdminAuthority);
        const investIxs = await this.investAllReservesIxs(investPayer, vault, true);
        withdrawAndBlockReserveIxs.investIxs = investIxs;
        return withdrawAndBlockReserveIxs;
    }
    /**
     * This method disinvests all the funds from all the reserves and set their weight to 0; for vaults that are managed by external bot/crank, the bot can change the weight and invest in the reserves again
     * @param vault - the vault to disinvest the invested funds from
     * @param [vaultReservesMap] - optional parameter to pass a map of the vault reserves. If not provided, the reserves will be loaded from the vault
     * @param [payer] - optional parameter to pass a different payer for the transaction. If not provided, the admin of the vault will be used; this is the payer for the invest ixs and it should have an ATA and some lamports (2x no_of_reserves) of the token vault
     * @returns - a struct with an instruction to update the reserve allocations to 0 weight and a list of instructions to disinvest the funds in the reserves
     */
    async disinvestAllReservesIxs(vault, vaultReservesMap, payer) {
        const vaultState = await vault.getState();
        const reserves = this.getVaultReserves(vaultState);
        const disinvestAllReservesIxs = {
            updateReserveAllocationIxs: [],
            investIxs: [],
        };
        if (!vaultReservesMap) {
            vaultReservesMap = await this.loadVaultReserves(vaultState);
        }
        for (const reserve of reserves) {
            const reserveWithAddress = {
                address: reserve,
                state: vaultReservesMap.get(reserve).state,
            };
            const existingReserveAllocation = vaultState.vaultAllocationStrategy.find((allocation) => allocation.reserve === reserve);
            if (!existingReserveAllocation) {
                continue;
            }
            const reserveAllocationConfig = new ReserveAllocationConfig(reserveWithAddress, 0, (0, lib_1.lamportsToDecimal)(new decimal_js_1.default(existingReserveAllocation.tokenAllocationCap.toString()), reserveWithAddress.state.liquidity.mintDecimals.toNumber()));
            // update allocation to have 0 weight and 0 cap
            const updateAllocIxs = await this.updateReserveAllocationIxs(vault, reserveAllocationConfig, payer);
            disinvestAllReservesIxs.updateReserveAllocationIxs.push(updateAllocIxs.updateReserveAllocationIx);
        }
        const investPayer = payer ? payer : (0, signer_1.noopSigner)(vaultState.vaultAdminAuthority);
        const investIxs = await this.investAllReservesIxs(investPayer, vault, true);
        disinvestAllReservesIxs.investIxs = investIxs;
        return disinvestAllReservesIxs;
    }
    /**
     * This method removes a reserve from the vault allocation strategy if already part of the allocation strategy
     * @param vault - vault to remove the reserve from
     * @param reserve - reserve to remove from the vault allocation strategy
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - an instruction to remove the reserve from the vault allocation strategy or undefined if the reserve is not part of the allocation strategy
     */
    async removeReserveFromAllocationIx(vault, reserve, vaultAdminAuthority) {
        const vaultState = await vault.getState();
        const vaultAdmin = parseVaultAdmin(vaultState, vaultAdminAuthority);
        const reserveIsPartOfAllocation = vaultState.vaultAllocationStrategy.some((allocation) => allocation.reserve === reserve);
        if (!reserveIsPartOfAllocation) {
            return undefined;
        }
        const accounts = {
            vaultAdminAuthority: vaultAdmin,
            vaultState: vault.address,
            reserve,
        };
        return (0, instructions_1.removeAllocation)(accounts);
    }
    /**
     * Update a field of the vault. If the field is a pubkey it will return an extra instruction to add that account into the lookup table
     * @param vault the vault to update
     * @param mode the field to update (based on VaultConfigFieldKind enum)
     * @param value the value to update the field with
     * @param [adminAuthority] the signer of the transaction. Optional. If not provided the admin of the vault will be used. It should be used when changing the admin of the vault if we want to build or batch multiple ixs in the same tx.
     *        The global admin should be passed in when wanting to change the AllowAllocationsInWhitelistedReservesOnly or AllowInvestInWhitelistedReservesOnly fields to false
     * @param [lutIxsSigner] the signer of the transaction to be used for the lookup table instructions. Optional. If not provided the admin of the vault will be used. It should be used when changing the admin of the vault if we want to build or batch multiple ixs in the same tx
     * @param [skipLutUpdate] if true, the lookup table instructions will not be included in the returned instructions
     * @param errorOnOverride throw error if vault already has a farm
     * @returns a struct that contains the instruction to update the field and an optional list of instructions to update the lookup table
     */
    async updateVaultConfigIxs(vault, mode, value, adminAuthority, lutIxsSigner, skipLutUpdate = false, errorOnOverride = true) {
        const vaultState = await vault.getState();
        const admin = parseVaultAdmin(vaultState, adminAuthority);
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const updateVaultConfigAccs = {
            signer: admin,
            globalConfig: globalConfig,
            vaultState: vault.address,
            klendProgram: this._kaminoLendProgramId,
        };
        if (mode.kind === new types_1.VaultConfigField.Farm().kind) {
            if (value != lib_1.DEFAULT_PUBLIC_KEY && vaultState.vaultFarm != lib_1.DEFAULT_PUBLIC_KEY) {
                if (errorOnOverride) {
                    throw new Error('Vault already has a farm, if you want to override it set errorOnOverride to false');
                }
            }
        }
        const updateVaultConfigArgs = {
            entry: mode,
            data: this.getValueForModeAsBuffer(mode, value),
        };
        await this.updateVaultConfigValidations(mode, value, vaultState);
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = await this.loadVaultReserves(vaultState);
        let updateVaultConfigIx = (0, instructions_1.updateVaultConfig)(updateVaultConfigArgs, updateVaultConfigAccs, undefined, this._kaminoVaultProgramId);
        updateVaultConfigIx = this.appendRemainingAccountsForVaultReserves(updateVaultConfigIx, vaultReserves, vaultReservesState);
        const updateLUTIxs = [];
        if (!skipLutUpdate) {
            const lutIxsSignerAccount = lutIxsSigner ? lutIxsSigner : admin;
            if (mode.kind === new types_1.VaultConfigField.PendingVaultAdmin().kind) {
                const newPubkey = (0, kit_1.address)(value);
                const insertIntoLutIxs = await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), lutIxsSignerAccount, vaultState.vaultLookupTable, [newPubkey]);
                updateLUTIxs.push(...insertIntoLutIxs);
            }
            else if (mode.kind === new types_1.VaultConfigField.Farm().kind) {
                const keysToAddToLUT = [(0, kit_1.address)(value)];
                // if the farm already exist we want to read its state to add it to the LUT
                try {
                    const farmState = await dist_1.FarmState.fetch(this.getConnection(), keysToAddToLUT[0], this._farmsProgramId);
                    keysToAddToLUT.push(farmState.farmVault, farmState.farmVaultsAuthority, farmState.token.mint, farmState.scopePrices, farmState.globalConfig);
                    const insertIntoLutIxs = await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), lutIxsSignerAccount, vaultState.vaultLookupTable, keysToAddToLUT);
                    updateLUTIxs.push(...insertIntoLutIxs);
                }
                catch (error) {
                    console.log(`Error fetching farm ${keysToAddToLUT[0].toString()} state`, error);
                }
            }
        }
        const updateVaultConfigIxs = {
            updateVaultConfigIx,
            updateLUTIxs,
        };
        return updateVaultConfigIxs;
    }
    /**
     * Update the vault performance fee (in bps).
     * @param vault - vault to update
     * @param feeBps - performance fee in basis points
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultPerfFeeIxs(vault, feeBps, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.PerformanceFeeBps(), feeBps.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault management fee (in bps).
     * @param vault - vault to update
     * @param feeBps - management fee in basis points
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultMgmtFeeIxs(vault, feeBps, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.ManagementFeeBps(), feeBps.toString(), vaultAdminAuthority);
    }
    /**
     * Update the pending admin for the vault (step 1/2 of the ownership transfer).
     * @param vault - vault to update
     * @param newAdmin - new pending admin pubkey
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @param [lutIxsSigner] - signer for LUT updates when adding the new admin
     * @param [skipLutUpdate] - if true, the LUT update instructions are not returned
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultPendingAdminIxs(vault, newAdmin, vaultAdminAuthority, lutIxsSigner, skipLutUpdate = false) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.PendingVaultAdmin(), newAdmin, vaultAdminAuthority, lutIxsSigner, skipLutUpdate);
    }
    /**
     * Update the vault name.
     * @param vault - vault to update
     * @param name - new vault name
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultNameIxs(vault, name, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.Name(), name, vaultAdminAuthority);
    }
    /**
     * Update the vault lookup table address.
     * @param vault - vault to update
     * @param lookupTable - new LUT address
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultLookupTableIxs(vault, lookupTable, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.LookupTable(), lookupTable, vaultAdminAuthority);
    }
    /**
     * Update the vault allocation admin.
     * @param vault - vault to update
     * @param allocationAdmin - new allocation admin pubkey
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultAllocationAdminIxs(vault, allocationAdmin, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.AllocationAdmin(), allocationAdmin, vaultAdminAuthority);
    }
    /**
     * Update the vault unallocated weight.
     * @param vault - vault to update
     * @param unallocatedWeight - new unallocated weight
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultUnallocatedWeightIxs(vault, unallocatedWeight, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.UnallocatedWeight(), unallocatedWeight.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault unallocated tokens cap.
     * @param vault - vault to update
     * @param unallocatedTokensCap - new unallocated tokens cap
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultUnallocatedTokensCapIxs(vault, unallocatedTokensCap, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.UnallocatedTokensCap(), unallocatedTokensCap.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault farm address.
     * @param vault - vault to update
     * @param farm - farm address
     * @param [errorOnOverride] - if true, it will throw if the vault already has a farm
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @param [lutIxsSigner] - signer for LUT updates when adding the farm
     * @param [skipLutUpdate] - if true, the LUT update instructions are not returned
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultFarmIxs(vault, farm, errorOnOverride = true, vaultAdminAuthority, lutIxsSigner, skipLutUpdate = false) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.Farm(), farm, vaultAdminAuthority, lutIxsSigner, skipLutUpdate, errorOnOverride);
    }
    /**
     * Update the first loss capital farm address.
     * @param vault - vault to update
     * @param farm - farm address
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultFirstLossCapitalFarmIxs(vault, farm, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.FirstLossCapitalFarm(), farm, vaultAdminAuthority);
    }
    /**
     * Update the vault min deposit amount (in lamports).
     * @param vault - vault to update
     * @param minDepositAmount - new minimum deposit amount
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultMinDepositAmountIxs(vault, minDepositAmount, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.MinDepositAmount(), minDepositAmount.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault min withdraw amount (in lamports).
     * @param vault - vault to update
     * @param minWithdrawAmount - new minimum withdraw amount
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultMinWithdrawAmountIxs(vault, minWithdrawAmount, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.MinWithdrawAmount(), minWithdrawAmount.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault min invest amount (in lamports).
     * @param vault - vault to update
     * @param minInvestAmount - new minimum invest amount
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultMinInvestAmountIxs(vault, minInvestAmount, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.MinInvestAmount(), minInvestAmount.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault min invest delay (in slots).
     * @param vault - vault to update
     * @param minInvestDelaySlots - new minimum invest delay in slots
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultMinInvestDelaySlotsIxs(vault, minInvestDelaySlots, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.MinInvestDelaySlots(), minInvestDelaySlots.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault crank fund fee per reserve (in lamports).
     * @param vault - vault to update
     * @param crankFundFeePerReserve - new fee per reserve
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultCrankFundFeePerReserveIxs(vault, crankFundFeePerReserve, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.CrankFundFeePerReserve(), crankFundFeePerReserve.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault withdrawal penalty (in lamports).
     * @param vault - vault to update
     * @param withdrawalPenaltyLamports - new withdrawal penalty amount
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultWithdrawalPenaltyLamportsIxs(vault, withdrawalPenaltyLamports, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.WithdrawalPenaltyLamports(), withdrawalPenaltyLamports.toString(), vaultAdminAuthority);
    }
    /**
     * Update the vault withdrawal penalty (in bps).
     * @param vault - vault to update
     * @param withdrawalPenaltyBps - new withdrawal penalty bps
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultWithdrawalPenaltyBpsIxs(vault, withdrawalPenaltyBps, vaultAdminAuthority) {
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.WithdrawalPenaltyBps(), withdrawalPenaltyBps.toString(), vaultAdminAuthority);
    }
    /**
     * Update whether allocations are restricted to whitelisted reserves only.
     * @param vault - vault to update
     * @param allowWhitelistedOnly - true to restrict, false to allow any reserve
     * @param [adminAuthority] - signer; pass global admin when setting to false
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultAllowAllocationsInWhitelistedReservesOnlyIxs(vault, allowWhitelistedOnly, adminAuthority) {
        const value = typeof allowWhitelistedOnly === 'boolean' ? allowWhitelistedOnly.toString() : allowWhitelistedOnly;
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.AllowAllocationsInWhitelistedReservesOnly(), value, adminAuthority);
    }
    /**
     * Update whether invest is restricted to whitelisted reserves only.
     * @param vault - vault to update
     * @param allowWhitelistedOnly - true to restrict, false to allow any reserve
     * @param [adminAuthority] - signer; pass global admin when setting to false
     * @returns - a struct containing the update instruction and optional LUT updates
     */
    async updateVaultAllowInvestInWhitelistedReservesOnlyIxs(vault, allowWhitelistedOnly, adminAuthority) {
        const value = typeof allowWhitelistedOnly === 'boolean' ? allowWhitelistedOnly.toString() : allowWhitelistedOnly;
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.AllowInvestInWhitelistedReservesOnly(), value, adminAuthority);
    }
    async updateVaultConfigValidations(mode, value, vaultState) {
        if (mode.kind === new types_1.VaultConfigField.FirstLossCapitalFarm().kind ||
            mode.kind === new types_1.VaultConfigField.Farm().kind) {
            const farmAddress = (0, kit_1.address)(value);
            if (farmAddress === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const farmState = await dist_1.FarmState.fetch(this.getConnection(), farmAddress, this._farmsProgramId);
            if (!farmState) {
                throw new Error(`Farm ${farmAddress.toString()} not found for FirstLossCapitalFarm`);
            }
            if (mode.kind === new types_1.VaultConfigField.FirstLossCapitalFarm().kind &&
                !(await this.isFlcFarmValid(farmState, vaultState))) {
                throw new Error(`Farm ${farmAddress.toString()} is not valid for FirstLossCapitalFarm`);
            }
        }
    }
    /**
     * Add or update a reserve whitelist entry. This controls whether the reserve is whitelisted for adding/updating
     * allocations or for invest, depending on the mode parameter.
     *
     * @param reserve - Address of the reserve to whitelist
     * @param mode - The whitelist mode: either 'Invest' or 'AddAllocation' with a value (1 = allow, 0 = deny)
     * @param globalAdmin - The global admin that signs the transaction
     * @returns - An instruction to add/update the whitelisted reserve
     */
    async addUpdateWhitelistedReserveIx(reserve, mode, globalAdmin) {
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const reserveWhitelistEntry = await getReserveWhitelistEntryPda(reserve, this._kaminoVaultProgramId);
        const accounts = {
            globalAdmin,
            globalConfig,
            reserve,
            reserveWhitelistEntry,
            systemProgram: system_1.SYSTEM_PROGRAM_ADDRESS,
        };
        const args = {
            update: mode,
        };
        return (0, instructions_1.addUpdateWhitelistedReserve)(args, accounts, undefined, this._kaminoVaultProgramId);
    }
    /** Sets the farm where the shares can be staked. This is store in vault state and a vault can only have one farm, so the new farm will ovveride the old farm
     * @param vault - vault to set the farm for
     * @param farm - the farm where the vault shares can be staked
     * @param [errorOnOverride] - if true, the function will throw an error if the vault already has a farm. If false, it will override the farm
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @param [lutIxsSigner] - the signer of the transaction to be used for the lookup table instructions. Optional. If not provided the admin of the vault will be used. It should be used when changing the admin of the vault if we want to build or batch multiple ixs in the same tx
     * @param [skipLutUpdate] - if true, the lookup table instructions will not be included in the returned instructions
     * @returns - a struct that contains the instruction to update the farm and an optional list of instructions to update the lookup table
     */
    async setVaultFarmIxs(vault, farm, errorOnOverride = true, vaultAdminAuthority, lutIxsSigner, skipLutUpdate = false) {
        const vaultHasFarm = await vault.hasFarm();
        if (vaultHasFarm && errorOnOverride) {
            throw new Error('Vault already has a farm, if you want to override it set errorOnOverride to false');
        }
        return this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.Farm(), farm, vaultAdminAuthority, lutIxsSigner, skipLutUpdate);
    }
    /**
     * This method updates the vault config during vault initialization, within the same transaction
     * where the vault is created. Use this when the vault state is not yet committed to the chain
     * and cannot be fetched via RPC. For updates to existing vaults, use updateVaultConfigIxs instead.
     *
     * @param admin - the admin that signs the transaction
     * @param vault - address of vault to be updated
     * @param mode - the field to be updated
     * @param value - the new value for the field to be updated (number or pubkey)
     * @returns - an instruction to update the vault config
     */
    async updateUninitialisedVaultConfigIx(admin, vault, mode, value) {
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const updateVaultConfigAccs = {
            signer: admin,
            globalConfig: globalConfig,
            vaultState: vault,
            klendProgram: this._kaminoLendProgramId,
        };
        const updateVaultConfigArgs = {
            entry: mode,
            data: this.getValueForModeAsBuffer(mode, value),
        };
        const updateVaultConfigIx = (0, instructions_1.updateVaultConfig)(updateVaultConfigArgs, updateVaultConfigAccs, undefined, this._kaminoVaultProgramId);
        return updateVaultConfigIx;
    }
    /**
     * This function creates the instruction for the `pendingAdmin` of the vault to accept to become the owner of the vault (step 2/2 of the ownership transfer)
     * @param vault - vault to change the ownership for
     * @param [pendingAdmin] - pending vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @param [slot] - optional slot to use for lookup table creation; if not provided, the latest finalized slot will be fetched
     * @returns - an instruction to accept the ownership of the vault and a list of instructions to update the lookup table
     */
    async acceptVaultOwnershipIxs(vault, pendingAdmin, slot) {
        const vaultState = await vault.getState();
        const signer = parseVaultPendingAdmin(vaultState, pendingAdmin);
        const acceptOwneshipAccounts = {
            pendingAdmin: signer,
            vaultState: vault.address,
        };
        const acceptVaultOwnershipIx = (0, instructions_1.updateAdmin)(acceptOwneshipAccounts, undefined, this._kaminoVaultProgramId);
        // read the current LUT and create a new one for the new admin and backfill it
        const accountsInExistentLUT = (await (0, utils_5.getAccountsInLut)(this.getConnection(), vaultState.vaultLookupTable)).filter((account) => account !== vaultState.vaultAdminAuthority);
        const lutIxs = [];
        const [initNewLutIx, newLut] = await (0, utils_5.initLookupTableIx)(signer, slot ?? (await this.getConnection().getSlot({ commitment: 'finalized' }).send()));
        const insertIntoLUTIxs = await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), signer, newLut, accountsInExistentLUT, []);
        lutIxs.push(...insertIntoLUTIxs);
        const updateVaultConfigIxs = await this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.LookupTable(), newLut.toString(), signer);
        lutIxs.push(updateVaultConfigIxs.updateVaultConfigIx);
        lutIxs.push(...updateVaultConfigIxs.updateLUTIxs);
        const acceptVaultOwnershipIxs = {
            acceptVaultOwnershipIx,
            initNewLUTIx: initNewLutIx,
            updateLUTIxs: lutIxs,
        };
        return acceptVaultOwnershipIxs;
    }
    /**
     * This function creates the instruction for the admin to give up a part of the pending fees (which will be accounted as part of the vault)
     * @param vault - vault to give up pending fees for
     * @param maxAmountToGiveUp - the maximum amount of fees to give up, in tokens
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - an instruction to give up the specified pending fees
     */
    async giveUpPendingFeesIx(vault, maxAmountToGiveUp, vaultAdminAuthority) {
        const vaultState = await vault.getState();
        const vaultAdmin = parseVaultAdmin(vaultState, vaultAdminAuthority);
        const giveUpPendingFeesAccounts = {
            vaultAdminAuthority: vaultAdmin,
            vaultState: vault.address,
            klendProgram: this._kaminoLendProgramId,
        };
        const maxAmountToGiveUpLamports = (0, utils_1.numberToLamportsDecimal)(maxAmountToGiveUp, vaultState.tokenMintDecimals.toNumber());
        const giveUpPendingFeesArgs = {
            maxAmountToGiveUp: new bn_js_1.default(maxAmountToGiveUpLamports.toString()),
        };
        return (0, instructions_1.giveUpPendingFees)(giveUpPendingFeesArgs, giveUpPendingFeesAccounts, undefined, this._kaminoVaultProgramId);
    }
    /**
     * This method withdraws all the pending fees from the vault to the owner's token ATA
     * @param vault - vault for which the admin withdraws the pending fees
     * @param slot - current slot, used to estimate the interest earned in the different reserves with allocation from the vault
     * @param [vaultReservesMap] - a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [vaultAdminAuthority] - vault admin - a noop vaultAdminAuthority is provided when absent for multisigs
     * @returns - list of instructions to withdraw all pending fees, including the ATA creation instructions if needed
     */
    async withdrawPendingFeesIxs(vault, currentSlot, vaultReservesMap, vaultAdminAuthority) {
        const slot = currentSlot ?? (await this.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const vaultState = await vault.getState();
        const vaultAdmin = parseVaultAdmin(vaultState, vaultAdminAuthority);
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const [{ ata: adminTokenAta, createAtaIx }] = await (0, utils_2.createAtasIdempotent)(vaultAdmin, [
            {
                mint: vaultState.tokenMint,
                tokenProgram: vaultState.tokenProgram,
            },
        ]);
        const tokensToWithdraw = new fraction_1.Fraction(vaultState.pendingFeesSf).toDecimal();
        let tokenLeftToWithdraw = tokensToWithdraw;
        tokenLeftToWithdraw = tokenLeftToWithdraw.sub(new decimal_js_1.default(vaultState.tokenAvailable.toString()));
        const reservesToWithdraw = [];
        if (tokenLeftToWithdraw.lte(0)) {
            // Availabe enough to withdraw all - using first reserve as it does not matter
            reservesToWithdraw.push(vaultState.vaultAllocationStrategy[0].reserve);
        }
        else {
            // Get decreasing order sorted available liquidity to withdraw from each reserve allocated to
            const reserveAllocationAvailableLiquidityToWithdraw = await this.getReserveAllocationAvailableLiquidityToWithdraw(vault, slot, vaultReservesState);
            // sort
            const reserveAllocationAvailableLiquidityToWithdrawSorted = new Map([...reserveAllocationAvailableLiquidityToWithdraw.entries()].sort((a, b) => b[1].sub(a[1]).toNumber()));
            reserveAllocationAvailableLiquidityToWithdrawSorted.forEach((availableLiquidityToWithdraw, key) => {
                if (tokenLeftToWithdraw.gt(0)) {
                    reservesToWithdraw.push(key);
                    tokenLeftToWithdraw = tokenLeftToWithdraw.sub(availableLiquidityToWithdraw);
                }
            });
        }
        const reserveStates = await lib_1.Reserve.fetchMultiple(this.getConnection(), reservesToWithdraw, this._kaminoLendProgramId);
        const withdrawIxs = await Promise.all(reservesToWithdraw.map(async (reserve, index) => {
            if (reserveStates[index] === null) {
                throw new Error(`Reserve ${reserve} not found`);
            }
            const reserveState = reserveStates[index];
            const marketAddress = reserveState.lendingMarket;
            return this.withdrawPendingFeesIx(vaultAdmin, vault, vaultState, marketAddress, { address: reserve, state: reserveState }, adminTokenAta);
        }));
        return [createAtaIx, ...withdrawIxs];
    }
    // async closeVaultIx(vault: KaminoVault): Promise<Instruction> {
    //   const vaultState: VaultState = await vault.getState(this.getConnection());
    //   const closeVaultAccounts: CloseVaultAccounts = {
    //     adminAuthority: vaultState.adminAuthority,
    //     vaultState: vault.address,
    //   };
    //   return closeVault(closeVaultAccounts, this._kaminoVaultProgramId);
    // }
    /**
     * This function creates instructions to deposit into a vault. It will also create ATA creation instructions for the vault shares that the user receives in return
     * @param user - user to deposit
     * @param vault - vault to deposit into (if the state is not provided, it will be fetched)
     * @param tokenAmount - token amount to be deposited, in decimals (will be converted in lamports)
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @param [memo] - optional memo string to append as a memo SPL instruction
     * @returns - an instance of DepositIxs which contains the instructions to deposit in vault and the instructions to stake the shares in the farm if the vault has a farm as well as ixs to stake in the first loss capital farm if the vault has one - only one set on ixs so stake in a farm can be used -> staking can be either done in the farm or in the first loss capital farm
     */
    async depositIxs(user, vault, tokenAmount, vaultReservesMap, farmState, payer, memo) {
        let vaultFarmState = farmState;
        const vaultState = await vault.getState();
        if (!farmState && (await vault.hasFarm(vaultState))) {
            const vaultFarmStateResult = await dist_1.FarmState.fetch(this.getConnection(), vaultState.vaultFarm, this._farmsProgramId);
            if (vaultFarmStateResult) {
                vaultFarmState = vaultFarmStateResult;
            }
        }
        return this.buildShareEntryIxs('deposit', user, vault, tokenAmount, vaultReservesMap, vaultFarmState, payer, memo);
    }
    async buySharesIxs(user, vault, tokenAmount, vaultReservesMap, farmState, payer) {
        return this.buildShareEntryIxs('buy', user, vault, tokenAmount, vaultReservesMap, farmState, payer);
    }
    async buildShareEntryIxs(mode, user, vault, tokenAmount, vaultReservesMap, farmState, payer, memo) {
        const vaultState = await vault.getState();
        const tokenProgramID = vaultState.tokenProgram;
        const userTokenAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.tokenMint, user.address, tokenProgramID);
        const createAtasIxs = [];
        const closeAtasIxs = [];
        if (vaultState.tokenMint === lib_1.WRAPPED_SOL_MINT) {
            const [{ ata: wsolAta, createAtaIx: createWsolAtaIxn }] = await (0, utils_2.createAtasIdempotent)(user, [
                {
                    mint: lib_1.WRAPPED_SOL_MINT,
                    tokenProgram: tokenProgramID,
                },
            ], payer);
            createAtasIxs.push(createWsolAtaIxn);
            const transferWsolIxs = (0, lib_1.getTransferWsolIxs)(user, wsolAta, (0, kit_1.lamports)(BigInt((0, utils_1.numberToLamportsDecimal)(tokenAmount, vaultState.tokenMintDecimals.toNumber()).ceil().toString())), tokenProgramID);
            createAtasIxs.push(...transferWsolIxs);
        }
        const [{ ata: userSharesAta, createAtaIx: createSharesAtaIxs }] = await (0, utils_2.createAtasIdempotent)(user, [
            {
                mint: vaultState.sharesMint,
                tokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
            },
        ], payer);
        createAtasIxs.push(createSharesAtaIxs);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        const tokenAmountLamports = (0, utils_1.numberToLamportsDecimal)(tokenAmount, vaultState.tokenMintDecimals.toNumber()).floor();
        let entryIx;
        if (mode === 'deposit') {
            const depositAccounts = {
                user,
                vaultState: vault.address,
                tokenVault: vaultState.tokenVault,
                tokenMint: vaultState.tokenMint,
                baseVaultAuthority: vaultState.baseVaultAuthority,
                sharesMint: vaultState.sharesMint,
                userTokenAta,
                userSharesAta,
                tokenProgram: tokenProgramID,
                klendProgram: this._kaminoLendProgramId,
                sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                eventAuthority,
                program: this._kaminoVaultProgramId,
            };
            const depositArgs = {
                maxAmount: new bn_js_1.default(tokenAmountLamports.toString()),
            };
            entryIx = (0, instructions_1.deposit)(depositArgs, depositAccounts, undefined, this._kaminoVaultProgramId);
        }
        else {
            const buyAccounts = {
                user,
                vaultState: vault.address,
                tokenVault: vaultState.tokenVault,
                tokenMint: vaultState.tokenMint,
                baseVaultAuthority: vaultState.baseVaultAuthority,
                sharesMint: vaultState.sharesMint,
                userTokenAta,
                userSharesAta,
                tokenProgram: tokenProgramID,
                klendProgram: this._kaminoLendProgramId,
                sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                eventAuthority,
                program: this._kaminoVaultProgramId,
            };
            const buyArgs = {
                maxAmount: new bn_js_1.default(tokenAmountLamports.toString()),
            };
            entryIx = (0, instructions_1.buy)(buyArgs, buyAccounts, undefined, this._kaminoVaultProgramId);
        }
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        entryIx = this.appendRemainingAccountsForVaultReserves(entryIx, vaultReserves, vaultReservesState);
        const result = {
            depositIxs: [...createAtasIxs, entryIx, ...closeAtasIxs],
            stakeInFarmIfNeededIxs: [],
            stakeInFlcFarmIfNeededIxs: [],
        };
        if (memo) {
            result.depositIxs.unshift((0, memo_1.getAddMemoInstruction)({ memo, signers: [user] }));
        }
        if (await vault.hasFarm()) {
            const stakeSharesIxs = await this.stakeSharesIxs(user, vault, undefined, farmState);
            result.stakeInFarmIfNeededIxs = stakeSharesIxs;
        }
        if (await vault.hasFlcFarm()) {
            const stakeSharesInFlcFarmIxs = await this.stakeSharesInFlcFarmIxs(user, vault, undefined, undefined);
            result.stakeInFlcFarmIfNeededIxs = stakeSharesInFlcFarmIxs;
        }
        return result;
    }
    /**
     * Returns the accounts needed for a vault deposit instruction, without building the instruction itself.
     * Includes the deposit accounts, the remaining accounts for vault reserves, and optionally the stake shares instructions if the vault has a farm.
     * @param user - the user depositing into the vault
     * @param vault - the vault to deposit into
     * @param [vaultReservesMap] - optional preloaded reserve states; if not provided they will be fetched
     * @param [farmState] - optional preloaded farm state; if not provided and the vault has a farm, it will be fetched
     * @returns the deposit accounts, remaining accounts, and optional stake shares instructions
     */
    async getDepositAccounts(user, vault, vaultReservesMap, farmState) {
        const vaultState = await vault.getState();
        const tokenProgramID = vaultState.tokenProgram;
        const userTokenAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.tokenMint, user.address, tokenProgramID);
        const userSharesAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.sharesMint, user.address);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        const depositAccounts = {
            user,
            vaultState: vault.address,
            tokenVault: vaultState.tokenVault,
            tokenMint: vaultState.tokenMint,
            baseVaultAuthority: vaultState.baseVaultAuthority,
            sharesMint: vaultState.sharesMint,
            userTokenAta,
            userSharesAta,
            tokenProgram: tokenProgramID,
            klendProgram: this._kaminoLendProgramId,
            sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
            eventAuthority,
            program: this._kaminoVaultProgramId,
        };
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const remainingAccounts = this.buildRemainingAccountsForVaultReserves(vaultReserves, vaultReservesState);
        const result = {
            depositAccounts,
            remainingAccounts,
        };
        if (await vault.hasFarm()) {
            const stakeSharesIxs = await this.stakeSharesIxs(user, vault, undefined, farmState);
            result.stakeSharesIxs = stakeSharesIxs;
        }
        return result;
    }
    /**
     * Returns the accounts needed for a vault withdraw instruction, without building the instruction itself.
     * If a reserve is provided, builds the full WithdrawAccounts (withdraw from reserve). Otherwise builds WithdrawFromAvailableAccounts (withdraw from available liquidity only).
     * Also includes remaining accounts for vault reserves and optionally the unstake instructions if the vault has a farm.
     * @param user - the user withdrawing from the vault
     * @param vault - the vault to withdraw from
     * @param [reserve] - optional reserve to withdraw from; if omitted, builds accounts for withdrawing from available liquidity only
     * @param [vaultReservesMap] - optional preloaded reserve states; if not provided they will be fetched
     * @param [farmState] - optional preloaded farm state; if not provided and the vault has a farm, it will be fetched
     * @returns the withdraw accounts, remaining accounts, and optional unstake shares instructions
     */
    async getWithdrawAccounts(user, vault, reserve, vaultReservesMap, farmState) {
        const vaultState = await vault.getState();
        const userTokenAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.tokenMint, user.address, vaultState.tokenProgram);
        const userSharesAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.sharesMint, user.address);
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        let withdrawAccounts;
        if (reserve) {
            const marketAddress = reserve.state.lendingMarket;
            const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(marketAddress, this._kaminoLendProgramId);
            withdrawAccounts = {
                withdrawFromAvailable: {
                    user,
                    vaultState: vault.address,
                    globalConfig,
                    tokenVault: vaultState.tokenVault,
                    baseVaultAuthority: vaultState.baseVaultAuthority,
                    userTokenAta,
                    tokenMint: vaultState.tokenMint,
                    userSharesAta,
                    sharesMint: vaultState.sharesMint,
                    tokenProgram: vaultState.tokenProgram,
                    sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                    klendProgram: this._kaminoLendProgramId,
                    eventAuthority,
                    program: this._kaminoVaultProgramId,
                },
                withdrawFromReserveAccounts: {
                    vaultState: vault.address,
                    reserve: reserve.address,
                    ctokenVault: await getCTokenVaultPda(vault.address, reserve.address, this._kaminoVaultProgramId),
                    lendingMarket: marketAddress,
                    lendingMarketAuthority: lendingMarketAuth,
                    reserveLiquiditySupply: reserve.state.liquidity.supplyVault,
                    reserveCollateralMint: reserve.state.collateral.mintPubkey,
                    reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                    instructionSysvarAccount: sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
                },
                eventAuthority,
                program: this._kaminoVaultProgramId,
            };
        }
        else {
            withdrawAccounts = {
                user,
                vaultState: vault.address,
                globalConfig,
                tokenVault: vaultState.tokenVault,
                baseVaultAuthority: vaultState.baseVaultAuthority,
                userTokenAta,
                tokenMint: vaultState.tokenMint,
                userSharesAta,
                sharesMint: vaultState.sharesMint,
                tokenProgram: vaultState.tokenProgram,
                sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                klendProgram: this._kaminoLendProgramId,
                eventAuthority,
                program: this._kaminoVaultProgramId,
            };
        }
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const remainingAccounts = this.buildRemainingAccountsForVaultReserves(vaultReserves, vaultReservesState);
        const result = {
            withdrawAccounts,
            remainingAccounts,
        };
        const hasFarm = await vault.hasFarm();
        if (hasFarm) {
            let vaultFarmState = farmState;
            if (!vaultFarmState) {
                const vaultFarmStateResult = await dist_1.FarmState.fetch(this.getConnection(), vaultState.vaultFarm, this._farmsProgramId);
                if (vaultFarmStateResult) {
                    vaultFarmState = vaultFarmStateResult;
                }
            }
            const unstakeIxs = await (0, farm_utils_1.getFarmUnstakeAndWithdrawIxs)(this.getConnection(), user, new decimal_js_1.default(utils_2.U64_MAX.toString()), vaultState.vaultFarm, vaultFarmState);
            result.unstakeSharesIxs = [unstakeIxs.unstakeIx, unstakeIxs.withdrawIx];
        }
        return result;
    }
    /**
     * This function creates instructions to stake the shares in the vault farm if the vault has a farm
     * @param user - user to stake
     * @param vault - vault to deposit into its farm (if the state is not provided, it will be fetched)
     * @param [sharesAmount] - token amount to be deposited, in decimals (will be converted in lamports). Optional. If not provided, the user's share balance will be used
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @returns - a list of instructions for the user to stake shares into the vault's farm, including the creation of prerequisite accounts if needed
     */
    async stakeSharesIxs(user, vault, sharesAmount, farmState) {
        const vaultState = await vault.getState();
        let sharesToStakeLamports = new decimal_js_1.default(utils_2.U64_MAX);
        if (sharesAmount) {
            sharesToStakeLamports = (0, utils_1.numberToLamportsDecimal)(sharesAmount, vaultState.sharesMintDecimals.toNumber());
        }
        // if tokens to be staked are 0 or vault has no farm there is no stake needed
        if (sharesToStakeLamports.lte(0) || !(await vault.hasFarm())) {
            return [];
        }
        // returns the ix to create the farm state account if needed and the ix to stake the shares
        return (0, farm_utils_1.getFarmStakeIxs)(this.getConnection(), user, sharesToStakeLamports, vaultState.vaultFarm, farmState);
    }
    /**
     * This function creates instructions to stake the shares in the vault firstLossCapital farm if the vault has a farm
     * @param user - user to stake
     * @param vault - vault to deposit into its flc farm (if the state is not provided, it will be fetched)
     * @param [sharesAmount] - token amount to be deposited, in decimals (will be converted in lamports). Optional. If not provided, the user's share balance will be used
     * @param [farmState] - the state of the vault flc farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @returns - a list of instructions for the user to stake shares into the vault's firstLossCapital farm, including the creation of prerequisite accounts if needed
     */
    async stakeSharesInFlcFarmIxs(user, vault, sharesAmount, farmState) {
        const vaultState = await vault.getState();
        let sharesToStakeLamports = new decimal_js_1.default(utils_2.U64_MAX);
        if (sharesAmount) {
            sharesToStakeLamports = (0, utils_1.numberToLamportsDecimal)(sharesAmount, vaultState.sharesMintDecimals.toNumber());
        }
        // if tokens to be staked are 0 or vault has no farm there is no stake needed
        if (sharesToStakeLamports.lte(0) || !(await vault.hasFlcFarm())) {
            return [];
        }
        // returns the ix to create the farm state account if needed and the ix to stake the shares
        return (0, farm_utils_1.getFarmStakeIxs)(this.getConnection(), user, sharesToStakeLamports, vaultState.firstLossCapitalFarm, farmState);
    }
    /**
     * This function will return a struct with the instructions to unstake from the farm if necessary and the instructions for the missing ATA creation instructions, as well as one or multiple withdraw instructions, based on how many reserves it's needed to withdraw from. This might have to be split in multiple transactions
     * @param user - user to withdraw
     * @param vault - vault to withdraw from
     * @param shareAmountToWithdraw - share amount to withdraw (in tokens, not lamports), in order to withdraw everything, any value > user share amount
     * @param slot - current slot, used to estimate the interest earned in the different reserves with allocation from the vault
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @returns an array of instructions to create missing ATAs if needed and the withdraw instructions
     */
    async withdrawIxs(user, vault, shareAmountToWithdraw, slot, vaultReservesMap, farmState, payer) {
        let vaultFarmState = farmState;
        const vaultState = await vault.getState();
        if (!farmState && (await vault.hasFarm(vaultState))) {
            const vaultFarmStateResult = await dist_1.FarmState.fetch(this.getConnection(), vaultState.vaultFarm, this._farmsProgramId);
            if (vaultFarmStateResult) {
                vaultFarmState = vaultFarmStateResult;
            }
        }
        return this.buildShareExitIxs('withdraw', user, vault, shareAmountToWithdraw, slot, vaultReservesMap, vaultFarmState, payer);
    }
    /**
     * This function will return the missing ATA creation instructions, as well as one or multiple withdraw instructions, based on how many reserves it's needed to withdraw from. This might have to be split in multiple transactions
     * @param user - user to sell shares for vault tokens
     * @param vault - vault to sell shares from
     * @param shareAmountToWithdraw - share amount to sell (in tokens, not lamports), in order to withdraw everything, any value > user share amount
     * @param slot - current slot, used to estimate the interest earned in the different reserves with allocation from the vault
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @returns an array of instructions to create missing ATAs if needed and the withdraw instructions
     */
    async sellSharesIxs(user, vault, shareAmountToWithdraw, slot, vaultReservesMap, farmState, payer) {
        return this.buildShareExitIxs('sell', user, vault, shareAmountToWithdraw, slot, vaultReservesMap, farmState, payer);
    }
    async buildShareExitIxs(mode, user, vault, shareAmountToWithdraw, slot, vaultReservesMap, farmState, payer) {
        const vaultState = await vault.getState();
        const hasFarm = await vault.hasFarm();
        const withdrawIxs = {
            unstakeFromFarmIfNeededIxs: [],
            withdrawIxs: [],
            postWithdrawIxs: [],
        };
        // compute the total shares the user has (in ATA + in farm) and check if they want to withdraw everything or just a part
        let userSharesAtaBalance = new decimal_js_1.default(0);
        const userSharesAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.sharesMint, user.address);
        const userSharesAtaState = await (0, token_2022_1.fetchMaybeToken)(this.getConnection(), userSharesAta);
        if (userSharesAtaState.exists) {
            const userSharesAtaBalanceInLamports = (0, lib_1.getTokenBalanceFromAccountInfoLamports)(userSharesAtaState);
            userSharesAtaBalance = userSharesAtaBalanceInLamports.div(new decimal_js_1.default(10).pow(vaultState.sharesMintDecimals.toString()));
        }
        let userSharesInFarm = new decimal_js_1.default(0);
        if (hasFarm) {
            userSharesInFarm = await (0, farm_utils_1.getUserSharesInTokensStakedInFarm)(this.getConnection(), user.address, vaultState.vaultFarm, vaultState.sharesMintDecimals.toNumber());
        }
        let sharesToWithdraw = shareAmountToWithdraw;
        const totalUserShares = userSharesAtaBalance.add(userSharesInFarm);
        let withdrawAllShares = false;
        if (sharesToWithdraw.gt(totalUserShares)) {
            sharesToWithdraw = new decimal_js_1.default(utils_2.U64_MAX.toString()).div(new decimal_js_1.default(10).pow(vaultState.sharesMintDecimals.toString()));
            withdrawAllShares = true;
        }
        // if not enough shares in ATA unstake from farm
        const sharesInAtaAreEnoughForWithdraw = sharesToWithdraw.lte(userSharesAtaBalance);
        if (hasFarm && !sharesInAtaAreEnoughForWithdraw && userSharesInFarm.gt(0)) {
            // if we need to unstake we need to make sure share ata is created
            const [{ createAtaIx }] = await (0, utils_2.createAtasIdempotent)(user, [
                {
                    mint: vaultState.sharesMint,
                    tokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                },
            ], payer);
            withdrawIxs.unstakeFromFarmIfNeededIxs.push(createAtaIx);
            let shareLamportsToWithdraw = new decimal_js_1.default(utils_2.U64_MAX.toString());
            if (!withdrawAllShares) {
                const sharesToWithdrawFromFarm = sharesToWithdraw.sub(userSharesAtaBalance);
                shareLamportsToWithdraw = (0, utils_4.collToLamportsDecimal)(sharesToWithdrawFromFarm, vaultState.sharesMintDecimals.toNumber());
            }
            const unstakeAndWithdrawFromFarmIxs = await (0, farm_utils_1.getFarmUnstakeAndWithdrawIxs)(this.getConnection(), user, shareLamportsToWithdraw, vaultState.vaultFarm, farmState);
            withdrawIxs.unstakeFromFarmIfNeededIxs.push(unstakeAndWithdrawFromFarmIxs.unstakeIx);
            withdrawIxs.unstakeFromFarmIfNeededIxs.push(unstakeAndWithdrawFromFarmIxs.withdrawIx);
        }
        const hasAllocatedReserves = vaultState.vaultAllocationStrategy.some((allocation) => allocation.reserve !== lib_1.DEFAULT_PUBLIC_KEY);
        if (hasAllocatedReserves) {
            const reserveExitBuilder = mode === 'withdraw'
                ? (params) => this.withdrawIx(params.user, params.vault, params.vaultState, params.marketAddress, params.reserve, params.userSharesAta, params.userTokenAta, params.shareAmountLamports, params.vaultReservesState)
                : (params) => this.sellIx(params.user, params.vault, params.vaultState, params.marketAddress, params.reserve, params.userSharesAta, params.userTokenAta, params.shareAmountLamports, params.vaultReservesState);
            const withdrawFromVaultIxs = await this.buildReserveExitIxs({
                user,
                vault,
                vaultState,
                shareAmount: sharesToWithdraw,
                allUserShares: totalUserShares,
                slot,
                vaultReservesMap,
                builder: reserveExitBuilder,
                payer,
            });
            withdrawIxs.withdrawIxs = withdrawFromVaultIxs;
        }
        else {
            const withdrawFromVaultIxs = await this.withdrawFromAvailableIxs(user, vault, sharesToWithdraw, payer);
            withdrawIxs.withdrawIxs = withdrawFromVaultIxs;
        }
        // if the vault is for SOL return the ix to unwrap the SOL
        if (vaultState.tokenMint === lib_1.WRAPPED_SOL_MINT) {
            const userWsolAta = await (0, lib_1.getAssociatedTokenAddress)(lib_1.WRAPPED_SOL_MINT, user.address);
            const unwrapIx = (0, token_2022_1.getCloseAccountInstruction)({
                account: userWsolAta,
                owner: user,
                destination: user.address,
            }, { programAddress: token_1.TOKEN_PROGRAM_ADDRESS });
            withdrawIxs.postWithdrawIxs.push(unwrapIx);
        }
        // if we burn all of user's shares close its shares ATA
        const burnAllUserShares = sharesToWithdraw.gt(totalUserShares);
        if (burnAllUserShares) {
            const closeAtaIx = (0, token_2022_1.getCloseAccountInstruction)({
                account: userSharesAta,
                owner: user,
                destination: user.address,
            }, { programAddress: token_1.TOKEN_PROGRAM_ADDRESS });
            withdrawIxs.postWithdrawIxs.push(closeAtaIx);
        }
        return withdrawIxs;
    }
    async withdrawFromAvailableIxs(user, vault, shareAmount, payer) {
        const vaultState = await vault.getState();
        const userSharesAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.sharesMint, user.address);
        const [{ ata: userTokenAta, createAtaIx }] = await (0, utils_2.createAtasIdempotent)(user, [
            {
                mint: vaultState.tokenMint,
                tokenProgram: vaultState.tokenProgram,
            },
        ], payer);
        const shareLamportsToWithdraw = (0, utils_4.collToLamportsDecimal)(shareAmount, vaultState.sharesMintDecimals.toNumber());
        const withdrawFromAvailableIxn = await this.withdrawFromAvailableIx(user, vault, vaultState, userSharesAta, userTokenAta, shareLamportsToWithdraw);
        return [createAtaIx, withdrawFromAvailableIxn];
    }
    async buildReserveExitIxs({ user, vault, vaultState, shareAmount, allUserShares, slot, vaultReservesMap, builder, payer, }) {
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const userSharesAta = await (0, lib_1.getAssociatedTokenAddress)(vaultState.sharesMint, user.address);
        const [{ ata: userTokenAta, createAtaIx }] = await (0, utils_2.createAtasIdempotent)(user, [
            {
                mint: vaultState.tokenMint,
                tokenProgram: vaultState.tokenProgram,
            },
        ], payer);
        const withdrawAllShares = shareAmount.gte(allUserShares);
        const actualSharesToWithdraw = shareAmount.lte(allUserShares) ? shareAmount : allUserShares;
        const shareLamportsToWithdraw = (0, utils_4.collToLamportsDecimal)(actualSharesToWithdraw, vaultState.sharesMintDecimals.toNumber());
        const tokensPerShare = await this.getTokensPerShareSingleVault(vault, slot);
        const sharesPerToken = new decimal_js_1.default(1).div(tokensPerShare);
        const tokensToWithdraw = shareLamportsToWithdraw.mul(tokensPerShare);
        let tokenLeftToWithdraw = tokensToWithdraw;
        const availableTokens = new decimal_js_1.default(vaultState.tokenAvailable.toString());
        tokenLeftToWithdraw = tokenLeftToWithdraw.sub(availableTokens);
        const reserveWithSharesAmountToWithdraw = [];
        let isFirstWithdraw = true;
        if (tokenLeftToWithdraw.lte(0)) {
            const firstReserve = vaultState.vaultAllocationStrategy.find((reserve) => reserve.reserve !== lib_1.DEFAULT_PUBLIC_KEY);
            if (!firstReserve) {
                throw new Error('No reserve available to satisfy withdraw request');
            }
            if (withdrawAllShares) {
                reserveWithSharesAmountToWithdraw.push({
                    reserve: firstReserve.reserve,
                    shares: new decimal_js_1.default(utils_2.U64_MAX.toString()),
                });
            }
            else {
                reserveWithSharesAmountToWithdraw.push({
                    reserve: firstReserve.reserve,
                    shares: shareLamportsToWithdraw,
                });
            }
        }
        else {
            const reserveAllocationAvailableLiquidityToWithdraw = await this.getReserveAllocationAvailableLiquidityToWithdraw(vault, slot, vaultReservesState);
            const reserveAllocationAvailableLiquidityToWithdrawSorted = [
                ...reserveAllocationAvailableLiquidityToWithdraw.entries(),
            ].sort((a, b) => b[1].sub(a[1]).toNumber());
            reserveAllocationAvailableLiquidityToWithdrawSorted.forEach(([key, availableLiquidityToWithdraw]) => {
                if (tokenLeftToWithdraw.gt(0)) {
                    let tokensToWithdrawFromReserve = decimal_js_1.default.min(tokenLeftToWithdraw, availableLiquidityToWithdraw);
                    if (isFirstWithdraw) {
                        tokensToWithdrawFromReserve = tokensToWithdrawFromReserve.add(availableTokens);
                        isFirstWithdraw = false;
                    }
                    if (withdrawAllShares) {
                        reserveWithSharesAmountToWithdraw.push({ reserve: key, shares: new decimal_js_1.default(utils_2.U64_MAX.toString()) });
                    }
                    else {
                        const sharesToWithdrawFromReserve = tokensToWithdrawFromReserve.mul(sharesPerToken).floor();
                        reserveWithSharesAmountToWithdraw.push({ reserve: key, shares: sharesToWithdrawFromReserve });
                    }
                    tokenLeftToWithdraw = tokenLeftToWithdraw.sub(tokensToWithdrawFromReserve);
                }
            });
        }
        const withdrawIxs = [];
        withdrawIxs.push(createAtaIx);
        for (const reserveWithTokens of reserveWithSharesAmountToWithdraw) {
            const reserveState = vaultReservesState.get(reserveWithTokens.reserve);
            if (reserveState === undefined) {
                throw new Error(`Reserve ${reserveWithTokens.reserve} not found in vault reserves map`);
            }
            const marketAddress = reserveState.state.lendingMarket;
            const exitIx = await builder({
                user,
                vault,
                vaultState,
                marketAddress,
                reserve: { address: reserveWithTokens.reserve, state: reserveState.state },
                userSharesAta,
                userTokenAta,
                shareAmountLamports: reserveWithTokens.shares,
                vaultReservesState,
            });
            withdrawIxs.push(exitIx);
        }
        return withdrawIxs;
    }
    /**
     * This will trigger invest by balancing, based on weights, the reserve allocations of the vault. It can either withdraw or deposit into reserves to balance them. This is a function that should be cranked
     * @param payer wallet that pays the tx
     * @param vault - vault to invest from
     * @param skipComputationChecks - if true, the function will skip the computation checks and will invest all the reserves; it is useful for txs where we update reserve allocations and invest atomically
     * @returns - an array of invest instructions for each invest action required for the vault reserves
     */
    async investAllReservesIxs(payer, vault, skipComputationChecks = false) {
        const vaultState = await vault.reloadState();
        const minInvestAmount = vaultState.minInvestAmount;
        const allReserves = this.getVaultReserves(vaultState);
        if (allReserves.length === 0) {
            throw new Error('No reserves found for the vault, please select at least one reserve for the vault');
        }
        const [allReservesStateMap, computedReservesAllocationTokens] = await Promise.all([
            this.loadVaultReserves(vaultState),
            this.getVaultComputedReservesAllocation(vaultState),
        ]);
        const tokenProgram = await (0, utils_3.getAccountOwner)(this.getConnection(), vaultState.tokenMint);
        const [{ createAtaIx }] = await (0, utils_2.createAtasIdempotent)(payer, [{ mint: vaultState.tokenMint, tokenProgram }]);
        // compute total vault holdings and expected distribution based on weights
        const curentVaultAllocations = this.getVaultAllocations(vaultState);
        const reservesToDisinvestFrom = [];
        const reservesToInvestInto = [];
        for (let index = 0; index < allReserves.length; index++) {
            const reservePubkey = allReserves[index];
            const reserveState = allReservesStateMap.get(reservePubkey);
            const computedAllocationTokens = computedReservesAllocationTokens.targetReservesAllocation.get(reservePubkey);
            const computedAllocationLamports = (0, utils_1.numberToLamportsDecimal)(computedAllocationTokens, vaultState.tokenMintDecimals.toNumber());
            const currentCTokenAllocation = curentVaultAllocations.get(reservePubkey).ctokenAllocation;
            const currentAllocationCap = curentVaultAllocations.get(reservePubkey).tokenAllocationCap;
            const reserveCollExchangeRate = reserveState.getCollateralExchangeRate();
            const reserveAllocationLamports = currentCTokenAllocation.div(reserveCollExchangeRate);
            const reserveAllocationLiquidityAmount = (0, lib_1.lamportsToDecimal)(currentCTokenAllocation.div(reserveCollExchangeRate), vaultState.tokenMintDecimals.toNumber());
            const diffInReserveTokens = computedAllocationTokens.sub(reserveAllocationLiquidityAmount);
            const diffInReserveLamports = (0, utils_4.collToLamportsDecimal)(diffInReserveTokens, vaultState.tokenMintDecimals.toNumber());
            // it is possible that the tokens to invest are > minInvestAmountLamports but the ctokens it represent are 0, which will make an invest move 0 tokens
            const diffInCtokenLamports = reserveCollExchangeRate.mul(diffInReserveLamports.abs());
            const actualDiffInLamports = diffInCtokenLamports.floor().div(reserveCollExchangeRate).floor();
            // if the diff for the reserve is smaller than the min invest amount, we do not need to invest or disinvest
            const minInvestAmountLamports = new decimal_js_1.default(minInvestAmount.toString());
            if (actualDiffInLamports.gt(minInvestAmountLamports) || skipComputationChecks) {
                if (computedAllocationTokens.lt(reserveAllocationLiquidityAmount)) {
                    reservesToDisinvestFrom.push(reservePubkey);
                }
                else {
                    const actualTargetLamports = currentAllocationCap.gt(computedAllocationLamports)
                        ? computedAllocationLamports
                        : currentAllocationCap;
                    const lamportsToAddToReserve = actualTargetLamports.sub(reserveAllocationLamports);
                    if (lamportsToAddToReserve.gt(minInvestAmountLamports)) {
                        reservesToInvestInto.push(reservePubkey);
                    }
                }
            }
        }
        const investIxsPromises = [];
        // invest first the reserves from which we disinvest, then the other ones
        for (const reserve of reservesToDisinvestFrom) {
            const reserveState = allReservesStateMap.get(reserve);
            if (reserveState === null) {
                throw new Error(`Reserve ${reserve} not found`);
            }
            const investIxsPromise = this.investSingleReserveIxs(payer, vault, {
                address: reserve,
                state: reserveState.state,
            }, allReservesStateMap, false);
            investIxsPromises.push(investIxsPromise);
        }
        for (const reserve of reservesToInvestInto) {
            const reserveState = allReservesStateMap.get(reserve);
            if (reserveState === null) {
                throw new Error(`Reserve ${reserve} not found`);
            }
            const investIxsPromise = this.investSingleReserveIxs(payer, vault, {
                address: reserve,
                state: reserveState.state,
            }, allReservesStateMap, false);
            investIxsPromises.push(investIxsPromise);
        }
        let investIxs = [];
        investIxs.push(createAtaIx);
        investIxs = await Promise.all(investIxsPromises).then((ixs) => ixs.flat());
        return investIxs;
    }
    // todo: make sure we also check the ata of the investor for the vault token exists
    /**
     * This will trigger invest by balancing, based on weights, the reserve allocation of the vault. It can either withdraw or deposit into the given reserve to balance it
     * @param payer wallet pubkey - the instruction is permissionless and does not require the vault admin, due to rounding between cTokens and the underlying, the payer may have to contribute 1 or more lamports of the underlying from their token account
     * @param vault - vault to invest from
     * @param reserve - reserve to invest into or disinvest from
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [createAtaIfNeeded]
     * @returns - an array of invest instructions for each invest action required for the vault reserves
     */
    async investSingleReserveIxs(payer, vault, reserve, vaultReservesMap, createAtaIfNeeded = true) {
        const vaultState = await vault.getState();
        const cTokenVault = await getCTokenVaultPda(vault.address, reserve.address, this._kaminoVaultProgramId);
        const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(reserve.state.lendingMarket, this._kaminoLendProgramId);
        const ixs = [];
        const tokenProgram = await (0, utils_3.getAccountOwner)(this.getConnection(), vaultState.tokenMint);
        const [{ ata: payerTokenAta, createAtaIx }] = await (0, utils_2.createAtasIdempotent)(payer, [
            { mint: vaultState.tokenMint, tokenProgram },
        ]);
        if (createAtaIfNeeded) {
            ixs.push(createAtaIx);
        }
        const reserveWhitelistEntryOption = await getReserveWhitelistEntryIfExists(reserve.address, this.getConnection(), this._kaminoVaultProgramId);
        const investAccounts = {
            payer,
            vaultState: vault.address,
            tokenVault: vaultState.tokenVault,
            baseVaultAuthority: vaultState.baseVaultAuthority,
            ctokenVault: cTokenVault,
            reserve: reserve.address,
            /** CPI accounts */
            lendingMarket: reserve.state.lendingMarket,
            lendingMarketAuthority: lendingMarketAuth,
            reserveLiquiditySupply: reserve.state.liquidity.supplyVault,
            reserveCollateralMint: reserve.state.collateral.mintPubkey,
            reserveWhitelistEntry: reserveWhitelistEntryOption,
            klendProgram: this._kaminoLendProgramId,
            instructionSysvarAccount: sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
            tokenProgram: tokenProgram,
            payerTokenAccount: payerTokenAta,
            tokenMint: vaultState.tokenMint,
            reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
        };
        let investIx = (0, instructions_1.invest)(investAccounts, undefined, this._kaminoVaultProgramId);
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        investIx = this.appendRemainingAccountsForVaultReserves(investIx, vaultReserves, vaultReservesState);
        return [createAtaIx, investIx];
    }
    /** Convert a string to a u8 representation to be stored on chain */
    encodeVaultName(token) {
        const maxArray = new Uint8Array(40);
        const s = new TextEncoder().encode(token);
        maxArray.set(s);
        return maxArray;
    }
    /**Convert an u8 array to a string */
    decodeVaultName(token) {
        return (0, utils_1.decodeVaultName)(token);
    }
    /** Helper to serialize value as Buffer for updateVaultConfig instruction */
    getValueForModeAsBuffer(mode, value) {
        const isWhitelistOnlyFlag = mode.kind === new types_1.VaultConfigField.AllowInvestInWhitelistedReservesOnly().kind ||
            mode.kind === new types_1.VaultConfigField.AllowAllocationsInWhitelistedReservesOnly().kind;
        if (isWhitelistOnlyFlag) {
            const flag = (0, utils_2.parseBooleanFlag)(value);
            return Buffer.from([flag]);
        }
        else if (isNaN(+value) || value == lib_1.DEFAULT_PUBLIC_KEY) {
            if (mode.kind === new types_1.VaultConfigField.Name().kind) {
                const data = Array.from(this.encodeVaultName(value));
                return Buffer.from(data);
            }
            else {
                const data = (0, kit_1.address)(value);
                return Buffer.from(addressEncoder.encode(data));
            }
        }
        else {
            const buffer = Buffer.alloc(8);
            buffer.writeBigUInt64LE(BigInt(value.toString()));
            return buffer;
        }
    }
    async sellIx(user, vault, vaultState, marketAddress, reserve, userSharesAta, userTokenAta, shareAmountLamports, vaultReservesState) {
        const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(marketAddress, this._kaminoLendProgramId);
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        const sellAccounts = {
            withdrawFromAvailable: {
                user,
                vaultState: vault.address,
                globalConfig: globalConfig,
                tokenVault: vaultState.tokenVault,
                baseVaultAuthority: vaultState.baseVaultAuthority,
                userTokenAta: userTokenAta,
                tokenMint: vaultState.tokenMint,
                userSharesAta: userSharesAta,
                sharesMint: vaultState.sharesMint,
                tokenProgram: vaultState.tokenProgram,
                sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                klendProgram: this._kaminoLendProgramId,
                eventAuthority: eventAuthority,
                program: this._kaminoVaultProgramId,
            },
            withdrawFromReserveAccounts: {
                vaultState: vault.address,
                reserve: reserve.address,
                ctokenVault: await getCTokenVaultPda(vault.address, reserve.address, this._kaminoVaultProgramId),
                lendingMarket: marketAddress,
                lendingMarketAuthority: lendingMarketAuth,
                reserveLiquiditySupply: reserve.state.liquidity.supplyVault,
                reserveCollateralMint: reserve.state.collateral.mintPubkey,
                reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                instructionSysvarAccount: sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
            },
            eventAuthority: eventAuthority,
            program: this._kaminoVaultProgramId,
        };
        const sellArgs = {
            sharesAmount: new bn_js_1.default(shareAmountLamports.floor().toString()),
        };
        let sellIxn = (0, instructions_1.sell)(sellArgs, sellAccounts, undefined, this._kaminoVaultProgramId);
        const vaultReserves = this.getVaultReserves(vaultState);
        sellIxn = this.appendRemainingAccountsForVaultReserves(sellIxn, vaultReserves, vaultReservesState);
        return sellIxn;
    }
    async withdrawIx(user, vault, vaultState, marketAddress, reserve, userSharesAta, userTokenAta, shareAmountLamports, vaultReservesState) {
        const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(marketAddress, this._kaminoLendProgramId);
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        const withdrawAccounts = {
            withdrawFromAvailable: {
                user,
                vaultState: vault.address,
                globalConfig: globalConfig,
                tokenVault: vaultState.tokenVault,
                baseVaultAuthority: vaultState.baseVaultAuthority,
                userTokenAta: userTokenAta,
                tokenMint: vaultState.tokenMint,
                userSharesAta: userSharesAta,
                sharesMint: vaultState.sharesMint,
                tokenProgram: vaultState.tokenProgram,
                sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                klendProgram: this._kaminoLendProgramId,
                eventAuthority: eventAuthority,
                program: this._kaminoVaultProgramId,
            },
            withdrawFromReserveAccounts: {
                vaultState: vault.address,
                reserve: reserve.address,
                ctokenVault: await getCTokenVaultPda(vault.address, reserve.address, this._kaminoVaultProgramId),
                lendingMarket: marketAddress,
                lendingMarketAuthority: lendingMarketAuth,
                reserveLiquiditySupply: reserve.state.liquidity.supplyVault,
                reserveCollateralMint: reserve.state.collateral.mintPubkey,
                reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
                instructionSysvarAccount: sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
            },
            eventAuthority: eventAuthority,
            program: this._kaminoVaultProgramId,
        };
        const withdrawArgs = {
            sharesAmount: new bn_js_1.default(shareAmountLamports.floor().toString()),
        };
        let withdrawIxn = (0, instructions_1.withdraw)(withdrawArgs, withdrawAccounts, undefined, this._kaminoVaultProgramId);
        const vaultReserves = this.getVaultReserves(vaultState);
        withdrawIxn = this.appendRemainingAccountsForVaultReserves(withdrawIxn, vaultReserves, vaultReservesState);
        return withdrawIxn;
    }
    async withdrawFromAvailableIx(user, vault, vaultState, userSharesAta, userTokenAta, shareAmountLamports) {
        const globalConfig = await getKvaultGlobalConfigPda(this._kaminoVaultProgramId);
        const eventAuthority = await getEventAuthorityPda(this._kaminoVaultProgramId);
        const withdrawFromAvailableAccounts = {
            user,
            vaultState: vault.address,
            globalConfig: globalConfig,
            tokenVault: vaultState.tokenVault,
            baseVaultAuthority: vaultState.baseVaultAuthority,
            userTokenAta,
            tokenMint: vaultState.tokenMint,
            userSharesAta,
            sharesMint: vaultState.sharesMint,
            tokenProgram: vaultState.tokenProgram,
            sharesTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
            klendProgram: this._kaminoLendProgramId,
            eventAuthority,
            program: this._kaminoVaultProgramId,
        };
        const withdrawFromAvailableArgs = {
            sharesAmount: new bn_js_1.default(shareAmountLamports.floor().toString()),
        };
        return (0, instructions_1.withdrawFromAvailable)(withdrawFromAvailableArgs, withdrawFromAvailableAccounts, undefined, this._kaminoVaultProgramId);
    }
    async withdrawPendingFeesIx(authority, vault, vaultState, marketAddress, reserve, adminTokenAta) {
        const [lendingMarketAuth] = await (0, utils_2.lendingMarketAuthPda)(marketAddress, this._kaminoLendProgramId);
        const withdrawPendingFeesAccounts = {
            vaultAdminAuthority: authority,
            vaultState: vault.address,
            reserve: reserve.address,
            tokenVault: vaultState.tokenVault,
            ctokenVault: await getCTokenVaultPda(vault.address, reserve.address, this._kaminoVaultProgramId),
            baseVaultAuthority: vaultState.baseVaultAuthority,
            tokenAta: adminTokenAta,
            tokenMint: vaultState.tokenMint,
            tokenProgram: vaultState.tokenProgram,
            /** CPI accounts */
            lendingMarket: marketAddress,
            lendingMarketAuthority: lendingMarketAuth,
            reserveLiquiditySupply: reserve.state.liquidity.supplyVault,
            reserveCollateralMint: reserve.state.collateral.mintPubkey,
            klendProgram: this._kaminoLendProgramId,
            instructionSysvarAccount: sysvars_1.SYSVAR_INSTRUCTIONS_ADDRESS,
            reserveCollateralTokenProgram: token_1.TOKEN_PROGRAM_ADDRESS,
        };
        let withdrawPendingFeesIxn = (0, instructions_1.withdrawPendingFees)(withdrawPendingFeesAccounts, undefined, this._kaminoVaultProgramId);
        const vaultReserves = this.getVaultReserves(vaultState);
        const vaultReservesState = await this.loadVaultReserves(vaultState);
        withdrawPendingFeesIxn = this.appendRemainingAccountsForVaultReserves(withdrawPendingFeesIxn, vaultReserves, vaultReservesState);
        return withdrawPendingFeesIxn;
    }
    /**
     * Sync a vault for lookup table; create and set the LUT for the vault if needed and fill it with all the needed accounts
     * @param authority - vault admin
     * @param vault the vault to sync and set the LUT for if needed
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [slot] - optional slot to use for lookup table creation; if not provided, the latest confirmed slot will be fetched
     * @returns a struct that contains a list of ix to create the LUT and assign it to the vault if needed + a list of ixs to insert all the accounts in the LUT
     */
    async syncVaultLookupTableIxs(authority, vault, vaultReservesMap, slot) {
        const vaultState = await vault.getState();
        const allAccountsToBeInserted = [
            vault.address,
            vaultState.vaultAdminAuthority,
            vaultState.baseVaultAuthority,
            vaultState.tokenMint,
            vaultState.tokenVault,
            vaultState.sharesMint,
            vaultState.tokenProgram,
            this._kaminoLendProgramId,
        ];
        vaultState.vaultAllocationStrategy.forEach((allocation) => {
            allAccountsToBeInserted.push(allocation.reserve);
            allAccountsToBeInserted.push(allocation.ctokenVault);
        });
        if (vaultReservesMap) {
            vaultReservesMap.forEach((reserve) => {
                allAccountsToBeInserted.push(reserve.state.lendingMarket);
                allAccountsToBeInserted.push(reserve.state.farmCollateral);
                allAccountsToBeInserted.push(reserve.state.farmDebt);
                allAccountsToBeInserted.push(reserve.state.liquidity.supplyVault);
                allAccountsToBeInserted.push(reserve.state.liquidity.feeVault);
                allAccountsToBeInserted.push(reserve.state.collateral.mintPubkey);
                allAccountsToBeInserted.push(reserve.state.collateral.supplyVault);
            });
        }
        else {
            const vaultReservesState = await this.loadVaultReserves(vaultState);
            vaultReservesState.forEach((reserve) => {
                allAccountsToBeInserted.push(reserve.state.lendingMarket);
                allAccountsToBeInserted.push(reserve.state.farmCollateral);
                allAccountsToBeInserted.push(reserve.state.farmDebt);
                allAccountsToBeInserted.push(reserve.state.liquidity.supplyVault);
                allAccountsToBeInserted.push(reserve.state.liquidity.feeVault);
                allAccountsToBeInserted.push(reserve.state.collateral.mintPubkey);
                allAccountsToBeInserted.push(reserve.state.collateral.supplyVault);
            });
        }
        if (vaultState.vaultFarm !== lib_1.DEFAULT_PUBLIC_KEY) {
            allAccountsToBeInserted.push(vaultState.vaultFarm);
        }
        const setupLUTIfNeededIxs = [];
        let lut = vaultState.vaultLookupTable;
        if (lut === lib_1.DEFAULT_PUBLIC_KEY) {
            const recentSlot = slot ?? (await this.getConnection().getSlot({ commitment: 'confirmed' }).send());
            const [ix, address] = await (0, utils_5.initLookupTableIx)(authority, recentSlot);
            setupLUTIfNeededIxs.push(ix);
            lut = address;
            // set the new LUT for the vault
            const updateVaultConfigIxs = await this.updateVaultConfigIxs(vault, new types_1.VaultConfigField.LookupTable(), lut.toString());
            setupLUTIfNeededIxs.push(updateVaultConfigIxs.updateVaultConfigIx);
        }
        const ixs = [];
        let overriddenExistentAccounts = undefined;
        if (vaultState.vaultLookupTable === lib_1.DEFAULT_PUBLIC_KEY) {
            overriddenExistentAccounts = [];
        }
        ixs.push(...(await (0, utils_5.insertIntoLookupTableIxs)(this.getConnection(), authority, lut, allAccountsToBeInserted, overriddenExistentAccounts)));
        return {
            setupLUTIfNeededIxs,
            syncLUTIxs: ixs,
        };
    }
    getReserveAccountsToInsertInLut(reserveState) {
        return [
            reserveState.lendingMarket,
            reserveState.farmCollateral,
            reserveState.farmDebt,
            reserveState.liquidity.mintPubkey,
            reserveState.liquidity.supplyVault,
            reserveState.liquidity.feeVault,
            reserveState.collateral.mintPubkey,
            reserveState.collateral.supplyVault,
        ];
    }
    /** Read the total holdings of a vault and the reserve weights and returns a map from each reserve to how many tokens should be deposited.
     * @param vaultState - the vault state to calculate the allocation for
     * @param [slot] - the slot for which to calculate the allocation. Optional. If not provided the function will fetch the current slot
     * @param [vaultReserves] - a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns - a map from each reserve to how many tokens should be invested into
     */
    async getVaultComputedReservesAllocation(vaultState, slot, vaultReserves, currentSlot) {
        // 1. Read the states
        const holdings = await this.getVaultHoldings(vaultState, slot, vaultReserves, currentSlot);
        const tokenMintDecimals = vaultState.tokenMintDecimals.toNumber();
        // if there are no vault reserves or all have weight 0 everything has to be in Available
        const allReservesPubkeys = this.getVaultReserves(vaultState);
        const reservesAllocations = this.getVaultAllocations(vaultState);
        const allReservesHaveWeight0 = allReservesPubkeys.every((reserve) => {
            const allocation = reservesAllocations.get(reserve);
            return allocation?.targetWeight.isZero();
        });
        if (allReservesPubkeys.length === 0 || allReservesHaveWeight0) {
            const computedHoldings = new Map();
            allReservesPubkeys.forEach((reserve) => {
                computedHoldings.set(reserve, new decimal_js_1.default(0));
            });
            return {
                targetUnallocatedAmount: holdings.totalAUMIncludingFees.sub(holdings.pendingFees),
                targetReservesAllocation: computedHoldings,
            };
        }
        const initialVaultAllocations = new Map();
        reservesAllocations.forEach((allocation, reserve) => {
            initialVaultAllocations.set(reserve, {
                targetWeight: allocation.targetWeight,
                tokenAllocationCap: (0, lib_1.lamportsToDecimal)(allocation.tokenAllocationCap, tokenMintDecimals),
                ctokenAllocation: allocation.ctokenAllocation,
            });
        });
        // 2. Compute the allocation
        return this.computeReservesAllocation(holdings.totalAUMIncludingFees.sub(holdings.pendingFees), new decimal_js_1.default(vaultState.unallocatedWeight.toString()), (0, lib_1.lamportsToDecimal)(new decimal_js_1.default(vaultState.unallocatedTokensCap.toString()), tokenMintDecimals), initialVaultAllocations, tokenMintDecimals);
    }
    computeReservesAllocation(vaultAUM, vaultUnallocatedWeight, vaultUnallocatedCap, initialVaultAllocations, vaultTokenDecimals) {
        return (0, vaultAllocation_1.computeReservesAllocation)(vaultAUM, vaultUnallocatedWeight, vaultUnallocatedCap, initialVaultAllocations, vaultTokenDecimals);
    }
    /**
     * This method returns the user shares balance for a given vault
     * @param user - user to calculate the shares balance for
     * @param vault - vault to calculate shares balance for
     * @returns - user share balance in tokens (not lamports)
     */
    async getUserSharesBalanceSingleVault(user, vault) {
        const vaultState = await vault.getState();
        const userShares = {
            unstakedShares: new decimal_js_1.default(0),
            stakedShares: new decimal_js_1.default(0),
            totalShares: new decimal_js_1.default(0),
        };
        const userSharesTokenAccounts = await (0, utils_2.getAllStandardTokenProgramTokenAccounts)(this.getConnection(), user);
        const userSharesTokenAccount = userSharesTokenAccounts.filter((tokenAccount) => {
            const accountData = tokenAccount.account.data;
            const mint = (0, utils_2.getTokenAccountMint)(accountData);
            return mint === vaultState.sharesMint;
        });
        userShares.unstakedShares = userSharesTokenAccount.reduce((acc, tokenAccount) => {
            const accountData = tokenAccount.account.data;
            const amount = (0, utils_2.getTokenAccountAmount)(accountData);
            if (amount !== null) {
                return acc.add(new decimal_js_1.default(amount));
            }
            return acc;
        }, new decimal_js_1.default(0));
        if (await vault.hasFarm()) {
            const userSharesInFarm = await (0, farm_utils_1.getUserSharesInTokensStakedInFarm)(this.getConnection(), user, vaultState.vaultFarm, vaultState.sharesMintDecimals.toNumber());
            userShares.stakedShares = userSharesInFarm;
        }
        userShares.totalShares = userShares.unstakedShares.add(userShares.stakedShares);
        return userShares;
    }
    /**
     * This method returns the user shares balance for all existing vaults
     * @param user - user to calculate the shares balance for
     * @param [vaultsOverride] - the kamino vaults if already fetched, in order to reduce rpc calls.Optional
     * @returns - hash map with keys as vault address and value as user share balance in decimal (not lamports)
     */
    async getUserSharesBalanceAllVaults(user, vaultsOverride) {
        const vaults = vaultsOverride ? vaultsOverride : await this.getAllVaults();
        // read all user shares stake in vault farms
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const allUserFarmStates = await farmClient.getAllUserStatesForUser(user);
        const allUserFarmStatesMap = new Map();
        allUserFarmStates.forEach((userFarmState) => {
            allUserFarmStatesMap.set(userFarmState.userState.farmState, userFarmState.userState);
        });
        // stores vault address for each userSharesAta
        const vaultUserShareBalance = new Map();
        const allUserTokenAccounts = await (0, utils_2.getAllStandardTokenProgramTokenAccounts)(this.getConnection(), user);
        const userSharesTokenAccountsPerVault = new Map();
        vaults.forEach(async (vault) => {
            const state = vault.state;
            if (!state) {
                throw new Error(`Vault ${vault.address} not fetched`);
            }
            const userSharesTokenAccounts = allUserTokenAccounts.filter((tokenAccount) => {
                const accountData = tokenAccount.account.data;
                const mint = (0, utils_2.getTokenAccountMint)(accountData);
                return mint === state.sharesMint;
            });
            userSharesTokenAccountsPerVault.set(vault.address, userSharesTokenAccounts);
            if (await vault.hasFarm()) {
                const userFarmState = allUserFarmStatesMap.get(state.vaultFarm);
                if (userFarmState) {
                    const stakedShares = (0, farm_utils_1.getSharesInFarmUserPosition)(userFarmState, state.sharesMintDecimals.toNumber());
                    const userSharesBalance = vaultUserShareBalance.get(vault.address);
                    if (userSharesBalance) {
                        userSharesBalance.stakedShares = stakedShares;
                        userSharesBalance.totalShares = userSharesBalance.unstakedShares.add(userSharesBalance.stakedShares);
                        vaultUserShareBalance.set(vault.address, userSharesBalance);
                    }
                    else {
                        vaultUserShareBalance.set(vault.address, {
                            unstakedShares: new decimal_js_1.default(0),
                            stakedShares,
                            totalShares: stakedShares,
                        });
                    }
                }
            }
        });
        userSharesTokenAccountsPerVault.forEach((userSharesTokenAccounts, vaultAddress) => {
            userSharesTokenAccounts.forEach((userSharesTokenAccount) => {
                let userSharesForVault = vaultUserShareBalance.get(vaultAddress);
                if (!userSharesForVault) {
                    userSharesForVault = {
                        unstakedShares: new decimal_js_1.default(0),
                        stakedShares: new decimal_js_1.default(0),
                        totalShares: new decimal_js_1.default(0),
                    };
                }
                if (!userSharesTokenAccount) {
                    vaultUserShareBalance.set(vaultAddress, userSharesForVault);
                }
                else {
                    const accountData = userSharesTokenAccount.account.data;
                    const amount = (0, utils_2.getTokenAccountAmount)(accountData);
                    if (amount !== null) {
                        userSharesForVault.unstakedShares = new decimal_js_1.default(amount);
                        userSharesForVault.totalShares = userSharesForVault.unstakedShares.add(userSharesForVault.stakedShares);
                        vaultUserShareBalance.set(vaultAddress, userSharesForVault);
                    }
                }
            });
        });
        return vaultUserShareBalance;
    }
    /**
     * This method returns the management and performance fee percentages
     * @param vaultState - vault to retrieve the fees percentages from
     * @returns - VaultFeesPct containing management and performance fee percentages
     */
    getVaultFeesPct(vaultState) {
        return {
            managementFeePct: (0, utils_1.bpsToPct)(new decimal_js_1.default(vaultState.managementFeeBps.toString())),
            performanceFeePct: (0, utils_1.bpsToPct)(new decimal_js_1.default(vaultState.performanceFeeBps.toString())),
        };
    }
    /**
     * This method calculates the token per share value. This will always change based on interest earned from the vault, but calculating it requires a bunch of rpc requests. Caching this for a short duration would be optimal
     * @param vaultState - vault state to calculate tokensPerShare for
     * @param [slot] - the slot at which we retrieve the tokens per share. Optional. If not provided, the function will fetch the current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns - token per share value
     */
    async getTokensPerShareSingleVault(vaultOrState, slot, vaultReservesMap, currentSlot) {
        // Determine if we have a KaminoVault or VaultState
        const vaultState = 'getState' in vaultOrState ? await vaultOrState.getState() : vaultOrState;
        if (vaultState.sharesIssued.isZero()) {
            return new decimal_js_1.default(0);
        }
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const sharesDecimal = (0, lib_1.lamportsToDecimal)(vaultState.sharesIssued.toString(), vaultState.sharesMintDecimals.toString());
        const holdings = await this.getVaultHoldings(vaultState, slot, vaultReservesState, currentSlot);
        const netAUM = holdings.totalAUMIncludingFees.sub(holdings.pendingFees);
        return netAUM.div(sharesDecimal);
    }
    /**
     * This method calculates the token per share value. This will always change based on interest earned from the vault, but calculating it requires a bunch of rpc requests. Caching this for a short duration would be optimal
     * @param [vaultsOverride] - a list of vaults to get the tokens per share for; if provided with state it will not fetch the state again. Optional
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param slot - current slot, used to estimate the interest earned in the different reserves with allocation from the vault
     * @returns - token per share value
     */
    async getTokensPerShareAllVaults(slot, vaultsOverride, vaultReservesMap) {
        const vaults = vaultsOverride ? vaultsOverride : await this.getAllVaults();
        const vaultTokensPerShare = new Map();
        for (const vault of vaults) {
            const tokensPerShare = await this.getTokensPerShareSingleVault(vault, slot, vaultReservesMap);
            vaultTokensPerShare.set(vault.address, tokensPerShare);
        }
        return vaultTokensPerShare;
    }
    /**
     * Get all vaults
     * @returns an array of all vaults
     */
    async getAllVaults() {
        const filters = [
            {
                dataSize: BigInt(accounts_1.VaultState.layout.span + 8),
            },
            {
                memcmp: {
                    offset: 0n,
                    bytes: base58Decoder.decode(accounts_1.VaultState.discriminator),
                    encoding: 'base58',
                },
            },
        ];
        return await this.getAllVaultsWithFilter(filters);
    }
    /**
     * Get all vaults for a given token
     * @param token - the token to get all vaults for
     * @returns an array of all vaults for the given token
     */
    async getAllVaultsForToken(token) {
        const filters = [
            {
                dataSize: BigInt(accounts_1.VaultState.layout.span + 8),
            },
            {
                memcmp: {
                    offset: 0n,
                    bytes: base58Decoder.decode(accounts_1.VaultState.discriminator),
                    encoding: 'base58',
                },
            },
            {
                memcmp: {
                    offset: 80n, // tokenMint offset: 8 + 32 + 32 + 8 (discriminator + vaultAdminAuthority + baseVaultAuthority + baseVaultAuthorityBump)
                    bytes: token.toString(),
                    encoding: 'base58',
                },
            },
        ];
        return await this.getAllVaultsWithFilter(filters);
    }
    async getAllVaultsWithFilter(filters) {
        const kaminoVaults = await (0, utils_3.getProgramAccounts)(this.getConnection(), this._kaminoVaultProgramId, accounts_1.VaultState.layout.span + 8, filters);
        return kaminoVaults.map((kaminoVault) => {
            const kaminoVaultAccount = (0, vault_1.decodeVaultState)(kaminoVault.data);
            if (!kaminoVaultAccount) {
                throw Error(`kaminoVault with pubkey ${kaminoVault.address} could not be decoded`);
            }
            return KaminoVault.loadWithClientAndState(this, kaminoVault.address, kaminoVaultAccount);
        });
    }
    /**
     * Get a list of kaminoVaults
     * @param vaults - a list of vaults to get the states for; if not provided, all vaults will be fetched
     * @returns a list of vaults
     */
    async getVaults(vaults) {
        if (!vaults) {
            vaults = (await this.getAllVaults()).map((x) => x.address);
        }
        const vaultStates = await (0, batch_1.batchFetch)(vaults, (chunk) => this.getVaultsStates(chunk));
        return vaults.map((vault, index) => {
            const state = vaultStates[index];
            return state ? KaminoVault.loadWithClientAndState(this, vault, state) : null;
        });
    }
    /**
     * This will return all the initialized whitelisted reserves accounts, including those that are not whitelisted but just have the PDA initialized
     * @returns a map from mint to the whitelisted reserves for that mint
     */
    async getAllWhitelistedReserves() {
        const whitelistedReserves = await (0, utils_3.getProgramAccounts)(this.getConnection(), this._kaminoVaultProgramId, accounts_1.ReserveWhitelistEntry.layout.span + 8, [
            {
                dataSize: BigInt(accounts_1.ReserveWhitelistEntry.layout.span + 8),
            },
            {
                memcmp: {
                    offset: 0n,
                    bytes: base58Decoder.decode(accounts_1.ReserveWhitelistEntry.discriminator),
                    encoding: 'base58',
                },
            },
        ]);
        // todo: after release when the account structure is updated optimize the implementation by reading directly the mint from whitelisted account
        const whitelistedReservesMap = new Map();
        const reservesSet = new Set();
        for (const whitelistedReserve of whitelistedReserves) {
            const decodedAcc = (0, vault_1.decodeReserveWhitelistEntry)(whitelistedReserve.data);
            whitelistedReservesMap.set(decodedAcc.reserve, decodedAcc);
            reservesSet.add(decodedAcc.reserve);
        }
        const reservesList = Array.from(reservesSet);
        const reservesState = await lib_1.Reserve.fetchMultiple(this.getConnection(), reservesList, this._kaminoLendProgramId);
        const mintToWhitelistedReservesMap = new Map();
        const reservesWithState = reservesList.map((reserve, index) => [reserve, reservesState[index]]);
        for (const [reserve, reserveState] of reservesWithState) {
            if (!reserveState) {
                continue;
            }
            const mintPubkey = reserveState.liquidity.mintPubkey;
            if (!mintToWhitelistedReservesMap.has(mintPubkey)) {
                mintToWhitelistedReservesMap.set(mintPubkey, []);
            }
            mintToWhitelistedReservesMap.get(mintPubkey).push(whitelistedReservesMap.get(reserve));
        }
        return mintToWhitelistedReservesMap;
    }
    /**
     * This will return all the whitelisted reserves for the given mint; if a ReserveWhitelistEntry exists it doesn't mean it is whitelisted, the fields of the struct has to be read;
     * If multiple mints are needed it is recommended to call getAllWhitelistedReserves instead;
     * @param mint - the mint to get the whitelisted reserves for
     * @returns a list of whitelisted reserves
     */
    async getAllWhitelistedReservesForMint(mint) {
        // todo: use the impl below once the account structure is updated
        // const whitelistedReserves = await getProgramAccounts(
        //   this.getConnection(),
        //   this._kaminoVaultProgramId,
        //   ReserveWhitelistEntry.layout.span + 8,
        //   [
        //     {
        //       dataSize: BigInt(ReserveWhitelistEntry.layout.span + 8),
        //     },
        //     {
        //       memcmp: {
        //         offset: 0n,
        //         bytes: base58Decoder.decode(ReserveWhitelistEntry.discriminator) as Base58EncodedBytes,
        //         encoding: 'base58',
        //       },
        //     },
        //     {
        //       memcmp: {
        //         offset: 8n, // tokenMint offset: 8 discriminator
        //         bytes: mint.toString() as Base58EncodedBytes,
        //         encoding: 'base58',
        //       },
        //     },
        //   ]
        // );
        // return whitelistedReserves.map((whitelistedReserve) => decodeReserveWhitelistEntry(whitelistedReserve.data));
        const whitelistedReserves = await this.getAllWhitelistedReserves();
        return whitelistedReserves.get(mint) || [];
    }
    /**
     * This will return all the whitelisted reserves for the given markets
     * @param markets - the markets to get the whitelisted reserves for; if not provided, no whitelisted reserves will be fetched; for getting all whitelisted reserves use getAllWhitelistedReserves
     * @returns a map from market address to a map from reserve address to the whitelisting status
     */
    async getAllWhitelistedReservesForMarkets(markets) {
        const whitelistedReservesMap = new Map();
        if (!markets || markets.length === 0) {
            return whitelistedReservesMap;
        }
        // Aggregate all active reserves from provided markets
        const allReserves = [];
        for (const market of markets) {
            if (market.reservesActive) {
                for (const reserve of market.reservesActive.values()) {
                    allReserves.push(reserve);
                }
            }
        }
        const whitelistMap = await this.fetchReservesWhitelistEntries(allReserves);
        // Group by market
        for (const reserve of allReserves) {
            const entry = whitelistMap.get(reserve.address);
            if (!whitelistedReservesMap.has(reserve.state.lendingMarket)) {
                whitelistedReservesMap.set(reserve.state.lendingMarket, new Map());
            }
            whitelistedReservesMap.get(reserve.state.lendingMarket).set(reserve.address, entry);
        }
        return whitelistedReservesMap;
    }
    /**
     * This will return the whitelisting status for the given reserves
     * @param reserves - the reserves to get the whitelisting status for
     * @returns a map from reserve address to the whitelisting status
     */
    async getReservesWhitelistingStatus(reserves) {
        return this.fetchReservesWhitelistEntries(reserves);
    }
    /**
     * Fetches the on-chain ReserveWhitelistEntry for each reserve. If the account does not exist,
     * a default entry with whitelistAddAllocation=0 and whitelistInvest=0 is used.
     * @param reserves - the reserves to fetch whitelist entries for
     * @returns a map from reserve address to ReserveWhitelistEntry
     */
    async fetchReservesWhitelistEntries(reserves) {
        const whitelistMap = new Map();
        if (!reserves || reserves.length === 0) {
            return whitelistMap;
        }
        const allReservesWhitelistPDAs = await getReservesWhitelistPDAs(reserves.map((reserve) => reserve.address), this._kaminoVaultProgramId);
        const accountsArrays = await (0, batch_1.batchFetch)(allReservesWhitelistPDAs, async (chunk) => {
            const response = await this.getConnection().getMultipleAccounts(chunk, { commitment: 'processed' }).send();
            return response.value;
        });
        const allWhitelistEntriesAccounts = accountsArrays.flat();
        for (let i = 0; i < reserves.length; i++) {
            const reserve = reserves[i];
            const accountInfo = allWhitelistEntriesAccounts[i];
            let entry = new accounts_1.ReserveWhitelistEntry({
                tokenMint: reserve.state.liquidity.mintPubkey,
                reserve: reserve.address,
                whitelistAddAllocation: 0,
                whitelistInvest: 0,
                padding: [],
            });
            if (accountInfo) {
                entry = (0, vault_1.decodeReserveWhitelistEntry)(Buffer.from(accountInfo.data[0], 'base64'));
            }
            whitelistMap.set(reserve.address, entry);
        }
        return whitelistMap;
    }
    /**
     * This will return a map from each vault to the reserves that are not fully whitelisted (allocation + invest) but are part of the vault allocation.
     * Duplicate vaults (by address) are deduplicated.
     * @param vaults - the vaults to get the not whitelisted reserves in allocation for
     * @returns a map from vault address to the list of reserve addresses that are not fully whitelisted
     */
    async getReservesNotWhitelistedInAllocations(vaults) {
        const result = new Map();
        if (!vaults || vaults.length === 0) {
            return result;
        }
        const dedupedVaults = deduplicateVaults(vaults);
        const { vaultAllocations, whitelistMap } = await this.fetchVaultsAllocationsAndWhitelistStatus(dedupedVaults);
        for (const vault of dedupedVaults) {
            const notWhitelisted = [];
            const reservesInAlloc = vaultAllocations.get(vault.address);
            for (const reserve of reservesInAlloc.keys()) {
                if (whitelistMap.get(reserve)?.whitelistAddAllocation === 0 ||
                    whitelistMap.get(reserve)?.whitelistInvest === 0) {
                    notWhitelisted.push(reserve);
                }
            }
            result.set(vault.address, notWhitelisted);
        }
        return result;
    }
    /**
     * This will return a map from each vault to the reserves that are not matching the vault whitelisting requirements (allocation and invest) but are part of the vault allocation.
     * Duplicate vaults (by address) are deduplicated.
     * @param vaults - the vaults to get the not whitelisted reserves in allocation for
     * @returns a map from each vault to the reserves that are not whitelisted as requested (allocation + invest) and their whitelisting status
     */
    async getReservesAllocationsNotMatchingVaultWhitelistingRequirements(vaults) {
        const result = new Map();
        if (!vaults || vaults.length === 0) {
            return result;
        }
        const dedupedVaults = deduplicateVaults(vaults);
        const { vaultAllocations, whitelistMap } = await this.fetchVaultsAllocationsAndWhitelistStatus(dedupedVaults);
        for (const vault of dedupedVaults) {
            result.set(vault.address, new Map());
            const vaultState = await vault.getState();
            const vaultRequiresAllocationWhitelisted = vaultState.allowAllocationsInWhitelistedReservesOnly === 1;
            const vaultRequiresInvestWhitelisted = vaultState.allowInvestInWhitelistedReservesOnly === 1;
            if (!vaultRequiresAllocationWhitelisted && !vaultRequiresInvestWhitelisted) {
                continue;
            }
            const reservesInAlloc = vaultAllocations.get(vault.address);
            for (const reserve of reservesInAlloc.keys()) {
                const whitelistEntry = whitelistMap.get(reserve);
                const allocationWhitelistedNotMet = vaultRequiresAllocationWhitelisted && whitelistEntry.whitelistAddAllocation === 0;
                const investWhitelistedNotMet = vaultRequiresInvestWhitelisted && whitelistEntry.whitelistInvest === 0;
                if (allocationWhitelistedNotMet || investWhitelistedNotMet) {
                    result.get(vault.address).set(reserve, whitelistEntry);
                }
            }
        }
        return result;
    }
    /**
     * Collects all reserve addresses across vault allocations, initializes their KaminoReserve state,
     * and fetches whitelist entries for all of them. Also caches the per-vault allocation maps to avoid
     * redundant calls.
     * @param vaults - the vaults to collect allocations from
     * @returns the per-vault allocation maps and a global reserve-to-whitelist-entry map
     */
    async fetchVaultsAllocationsAndWhitelistStatus(vaults) {
        const vaultAllocations = new Map();
        const allReserveAddresses = new Set();
        // load all vault states in parallel so vault.getVaultAllocations() below won't do any additional rpc calls
        Promise.all(vaults.map(async (vault) => {
            vault.getState();
        }));
        for (const vault of vaults) {
            const allocations = await vault.getVaultAllocations();
            vaultAllocations.set(vault.address, allocations);
            for (const reserve of allocations.keys()) {
                allReserveAddresses.add(reserve);
            }
        }
        const reservesAddressList = Array.from(allReserveAddresses);
        const reserves = await Promise.all(reservesAddressList.map((reserve) => lib_1.KaminoReserve.initializeFromAddress(reserve, this.getConnection(), this.recentSlotDurationMs)));
        const whitelistMap = await this.fetchReservesWhitelistEntries(reserves);
        return { vaultAllocations, whitelistMap };
    }
    async getVaultsStates(vaults) {
        return await accounts_1.VaultState.fetchMultiple(this.getConnection(), vaults, this._kaminoVaultProgramId);
    }
    /**
     * This will return the amount of token invested from the vault into the given reserve
     * @param vaultState - the kamino vault to get invested amount in reserve for
     * @param slot - current slot
     * @param reserve - the reserve state to get vault invested amount in
     * @returns vault amount supplied in reserve in decimal
     */
    getSuppliedInReserve(vaultState, slot, reserve) {
        let referralFeeBps = 0;
        const denominator = reserve.state.config.protocolTakeRatePct / 100;
        if (denominator > 0) {
            referralFeeBps = new fraction_1.Fraction(reserve.state.liquidity.absoluteReferralRateSf)
                .toDecimal()
                .div(denominator)
                .floor()
                .toNumber();
        }
        const reserveCollExchangeRate = reserve.getEstimatedCollateralExchangeRate(slot, referralFeeBps);
        const reserveAllocation = vaultState.vaultAllocationStrategy.find((allocation) => allocation.reserve === reserve.address);
        if (!reserveAllocation) {
            throw new Error(`Reserve ${reserve.address} not found in vault allocation strategy`);
        }
        const reserveAllocationLiquidityAmountLamports = new decimal_js_1.default(reserveAllocation.ctokenAllocation.toString()).div(reserveCollExchangeRate);
        const reserveAllocationLiquidityAmount = (0, lib_1.lamportsToDecimal)(reserveAllocationLiquidityAmountLamports, vaultState.tokenMintDecimals.toNumber());
        return reserveAllocationLiquidityAmount;
    }
    /**
     * This will return the a map between reserve pubkey and the pct of the vault invested amount in each reserve
     * @param vaultState - the kamino vault to get reserves distribution for
     * @returns a map between reserve pubkey and the allocation pct for the reserve
     */
    getAllocationsDistribuionPct(vaultState) {
        const allocationsDistributionPct = new Map();
        let totalAllocation = new decimal_js_1.default(0);
        const filteredAllocations = vaultState.vaultAllocationStrategy.filter((allocation) => allocation.reserve !== lib_1.DEFAULT_PUBLIC_KEY);
        filteredAllocations.forEach((allocation) => {
            totalAllocation = totalAllocation.add(new decimal_js_1.default(allocation.targetAllocationWeight.toString()));
        });
        filteredAllocations.forEach((allocation) => {
            allocationsDistributionPct.set(allocation.reserve, new decimal_js_1.default(allocation.targetAllocationWeight.toString()).mul(new decimal_js_1.default(100)).div(totalAllocation));
        });
        return allocationsDistributionPct;
    }
    /**
     * This will return the a map between reserve pubkey and the allocation overview for the reserve
     * @param vaultState - the kamino vault to get reserves allocation overview for
     * @returns a map between reserve pubkey and the allocation overview for the reserve
     */
    getVaultAllocations(vaultState) {
        const vaultAllocations = new Map();
        vaultState.vaultAllocationStrategy.map((allocation) => {
            if (allocation.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const allocationOverview = {
                targetWeight: new decimal_js_1.default(allocation.targetAllocationWeight.toString()),
                tokenAllocationCap: new decimal_js_1.default(allocation.tokenAllocationCap.toString()),
                ctokenAllocation: new decimal_js_1.default(allocation.ctokenAllocation.toString()),
            };
            vaultAllocations.set(allocation.reserve, allocationOverview);
        });
        return vaultAllocations;
    }
    /**
     * This will return an unsorted hash map of all reserves that the given vault has allocations for, toghether with the amount that can be withdrawn from each of the reserves
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param slot - current slot
     *@param [vaultReservesMap] - a hashmap from each reserve pubkey to the reserve state
     * @returns an HashMap of reserves (key) with the amount available to withdraw for each (value)
     */
    async getReserveAllocationAvailableLiquidityToWithdraw(vault, slot, vaultReservesMap) {
        const vaultState = await vault.getState();
        const reserveAllocationAvailableLiquidityToWithdraw = new Map();
        vaultState.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesMap.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            let referralFeeBps = 0;
            const denominator = reserve.state.config.protocolTakeRatePct / 100;
            if (denominator > 0) {
                referralFeeBps = new fraction_1.Fraction(reserve.state.liquidity.absoluteReferralRateSf)
                    .toDecimal()
                    .div(denominator)
                    .floor()
                    .toNumber();
            }
            const reserveCollExchangeRate = reserve.getEstimatedCollateralExchangeRate(slot, referralFeeBps);
            const reserveAllocationLiquidityAmount = new decimal_js_1.default(allocationStrategy.ctokenAllocation.toString()).div(reserveCollExchangeRate);
            const reserveAvailableLiquidityAmount = reserve.getLiquidityAvailableAmount();
            reserveAllocationAvailableLiquidityToWithdraw.set(allocationStrategy.reserve, decimal_js_1.default.min(reserveAllocationLiquidityAmount, reserveAvailableLiquidityAmount));
        });
        return reserveAllocationAvailableLiquidityToWithdraw;
    }
    /**
     * This will get the list of all reserve pubkeys that the vault has allocations for ex
     * @param vault - the vault state to load reserves for
     * @returns a hashmap from each reserve pubkey to the reserve state
     */
    getVaultReserves(vault) {
        return vault.vaultAllocationStrategy
            .filter((vaultAllocation) => vaultAllocation.reserve !== lib_1.DEFAULT_PUBLIC_KEY)
            .map((vaultAllocation) => vaultAllocation.reserve);
    }
    /**
     * This will load the onchain state for all the reserves that the vault has allocations for
     * @param vaultState - the vault state to load reserves for
     * @returns a hashmap from each reserve pubkey to the reserve state
     */
    async loadVaultReserves(vaultState) {
        return this.loadVaultsReserves([vaultState]);
    }
    async loadReserializedReserves(vaultReservesAddresses) {
        if (vaultReservesAddresses.length === 0) {
            return [];
        }
        const reserveAccounts = await this.getConnection()
            .getMultipleAccounts(vaultReservesAddresses, { commitment: 'processed' })
            .send();
        return reserveAccounts.value.map((reserve, i) => {
            if (reserve === null) {
                // maybe reuse old here
                throw new Error(`Reserve account ${vaultReservesAddresses[i]} was not found`);
            }
            const reserveAccount = lib_1.Reserve.decode(Buffer.from(reserve.data[0], 'base64'));
            if (!reserveAccount) {
                throw Error(`Could not parse reserve ${vaultReservesAddresses[i]}`);
            }
            return {
                address: vaultReservesAddresses[i],
                state: reserveAccount,
            };
        });
    }
    /**
     * This will load the onchain state for all the reserves that the vaults have allocations for, deduplicating the reserves
     * @param vaults - the vault states to load reserves for
     * @param oracleAccounts (optional) all reserve oracle accounts, if not supplied will make an additional rpc call to fetch these accounts
     * @returns a hashmap from each reserve pubkey to the reserve state
     */
    async loadVaultsReserves(vaults, oracleAccounts) {
        const vaultReservesAddressesSet = new Set(vaults.flatMap((vault) => this.getVaultReserves(vault)));
        const vaultReservesAddresses = [...vaultReservesAddressesSet];
        const deserializedReserves = await (0, batch_1.batchFetch)(vaultReservesAddresses, (chunk) => this.loadReserializedReserves(chunk));
        const [reservesAndOracles, cdnResourcesData] = await Promise.all([
            (0, lib_1.getTokenOracleData)(this.getConnection(), deserializedReserves, oracleAccounts),
            (0, readCdnData_1.fetchKaminoCdnData)(),
        ]);
        const kaminoReserves = new Map();
        reservesAndOracles.forEach(([{ address: reserveAddress, state: reserve }, oracle]) => {
            if (!oracle) {
                throw Error(`Could not find oracle for ${(0, utils_1.parseTokenSymbol)(reserve.config.tokenInfo.name)} (${reserveAddress}) reserve in market ${reserve.lendingMarket}`);
            }
            const kaminoReserve = lib_1.KaminoReserve.initialize(reserveAddress, reserve, oracle, this.getConnection(), this.recentSlotDurationMs, cdnResourcesData);
            kaminoReserves.set(kaminoReserve.address, kaminoReserve);
        });
        return kaminoReserves;
    }
    /**
     * This will retrieve all the tokens that can be used as collateral by the users who borrow the token in the vault alongside details about the min and max loan to value ratio
     * @param vaultState - the vault state to load reserves for
     * @param [slot] - the slot for which to retrieve the vault collaterals for. Optional. If not provided the function will fetch the current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [kaminoMarkets] - a list of all the kamino markets. Optional. If provided the function will be significantly faster as it will not have to fetch the markets
     * @param oracleAccounts (optional) all reserve oracle accounts, if not supplied will make an additional rpc call to fetch these accounts
     * @returns a hashmap from each reserve pubkey to the market overview of the collaterals that can be used and the min and max loan to value ratio in that market
     */
    async getVaultCollaterals(vaultState, slot, vaultReservesMap, kaminoMarkets, oracleAccounts) {
        const vaultReservesStateMap = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const vaultReservesState = [];
        const missingReserves = new Set([]);
        // filter the reserves that are not part of the vault allocation strategy
        vaultState.vaultAllocationStrategy.forEach(async (allocation) => {
            if (allocation.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesStateMap.get(allocation.reserve);
            if (!reserve) {
                missingReserves.add(allocation.reserve);
                return;
            }
            vaultReservesState.push(reserve);
        });
        // read missing reserves
        const missingReserveAddresses = [...missingReserves];
        const missingReservesStates = (await lib_1.Reserve.fetchMultiple(this.getConnection(), missingReserveAddresses))
            .map((reserve, index) => {
            if (!reserve) {
                return null;
            }
            return {
                address: missingReserveAddresses[index],
                state: reserve,
            };
        })
            .filter((state) => state !== null);
        const missingReservesAndOracles = await (0, lib_1.getTokenOracleData)(this.getConnection(), missingReservesStates, oracleAccounts);
        missingReservesAndOracles.forEach(([{ address: reserveAddress, state: reserve }, oracle]) => {
            const fetchedReserve = new lib_1.KaminoReserve(reserve, reserveAddress, oracle, this.getConnection(), this.recentSlotDurationMs);
            vaultReservesState.push(fetchedReserve);
        });
        const vaultCollateralsPerReserve = new Map();
        for (const reserve of vaultReservesState) {
            // try to read the market from the provided list, if it doesn't exist fetch it
            let lendingMarket = undefined;
            if (kaminoMarkets) {
                lendingMarket = kaminoMarkets?.find((market) => reserve.state.lendingMarket === market.address);
            }
            if (!lendingMarket) {
                const fetchedLendingMarket = await lib_1.KaminoMarket.load(this.getConnection(), reserve.state.lendingMarket, lib_1.DEFAULT_RECENT_SLOT_DURATION_MS, this._kaminoLendProgramId, true, this._farmsProgramId);
                if (!fetchedLendingMarket) {
                    throw Error(`Could not fetch lending market ${reserve.state.lendingMarket}`);
                }
                lendingMarket = fetchedLendingMarket;
            }
            const marketReserves = lendingMarket.getReserves();
            const marketOverview = {
                address: reserve.state.lendingMarket,
                reservesAsCollateral: [],
                minLTVPct: new decimal_js_1.default(0),
                maxLTVPct: new decimal_js_1.default(100),
            };
            marketReserves
                .filter((marketReserve) => {
                return (marketReserve.state.config.liquidationThresholdPct > 0 &&
                    marketReserve.address !== reserve.address &&
                    marketReserve.state.config.status === 0);
            })
                .map((filteredReserve) => {
                const reserveAsCollateral = {
                    mint: filteredReserve.getLiquidityMint(),
                    address: filteredReserve.address,
                    liquidationLTVPct: new decimal_js_1.default(filteredReserve.state.config.liquidationThresholdPct),
                };
                marketOverview.reservesAsCollateral.push(reserveAsCollateral);
                if (reserveAsCollateral.liquidationLTVPct.lt(marketOverview.minLTVPct) || marketOverview.minLTVPct.eq(0)) {
                    marketOverview.minLTVPct = reserveAsCollateral.liquidationLTVPct;
                }
                if (reserveAsCollateral.liquidationLTVPct.gt(marketOverview.maxLTVPct) || marketOverview.maxLTVPct.eq(0)) {
                    marketOverview.maxLTVPct = reserveAsCollateral.liquidationLTVPct;
                }
            });
            vaultCollateralsPerReserve.set(reserve.address, marketOverview);
        }
        return vaultCollateralsPerReserve;
    }
    /**
     * This will return an VaultHoldings object which contains the amount available (uninvested) in vault, total amount invested in reseves and a breakdown of the amount invested in each reserve
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param [slot] - the slot for which to calculate the holdings. Optional. If not provided the function will fetch the current slot
     * @param [vaultReserves] - a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns an VaultHoldings object representing the amount available (uninvested) in vault, total amount invested in reseves and a breakdown of the amount invested in each reserve
     */
    async getVaultHoldings(vault, slot, vaultReserves, currentSlot) {
        const vaultHoldings = new VaultHoldings({
            available: new decimal_js_1.default(vault.tokenAvailable.toString()),
            invested: new decimal_js_1.default(0),
            investedInReserves: new Map(),
            totalAUMIncludingFees: new decimal_js_1.default(0),
            pendingFees: new decimal_js_1.default(0),
        });
        const currentSlotToUse = currentSlot ?? (await this.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const vaultReservesState = vaultReserves ? vaultReserves : await this.loadVaultReserves(vault);
        const decimals = new decimal_js_1.default(vault.tokenMintDecimals.toString());
        vault.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesState.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            let reserveCollExchangeRate;
            if (slot) {
                reserveCollExchangeRate = reserve.getEstimatedCollateralExchangeRate(slot, 0);
            }
            else {
                reserveCollExchangeRate = reserve.getCollateralExchangeRate();
            }
            const reserveAllocationLiquidityAmount = new decimal_js_1.default(allocationStrategy.ctokenAllocation.toString()).div(reserveCollExchangeRate);
            vaultHoldings.invested = vaultHoldings.invested.add(reserveAllocationLiquidityAmount);
            vaultHoldings.investedInReserves.set(allocationStrategy.reserve, (0, lib_1.lamportsToDecimal)(reserveAllocationLiquidityAmount, decimals));
        });
        const currentPendingFees = new fraction_1.Fraction(vault.pendingFeesSf).toDecimal();
        let totalPendingFees = currentPendingFees;
        // if there is a slot passed and it is in the future we need to estimate the fees from current time until that moment
        if (slot && slot > currentSlotToUse) {
            const currentTimestampSec = new Date().getTime() / 1000;
            const timeAtPassedSlot = currentTimestampSec + Number.parseInt((slot - currentSlotToUse).toString()) * this.recentSlotDurationMs;
            const timeUntilPassedSlot = timeAtPassedSlot - currentTimestampSec;
            const managementFeeFactor = new decimal_js_1.default(timeUntilPassedSlot)
                .mul(new decimal_js_1.default(vault.managementFeeBps.toString()))
                .div(new decimal_js_1.default(utils_2.SECONDS_PER_YEAR))
                .div(CreationParameters_1.FullBPSDecimal);
            const prevAUM = (0, lib_1.lamportsToDecimal)(new fraction_1.Fraction(vault.prevAumSf).toDecimal(), vault.tokenMintDecimals.toNumber());
            const simulatedMgmtFee = prevAUM.mul(managementFeeFactor);
            totalPendingFees = totalPendingFees.add(simulatedMgmtFee);
            const simulatedEarnedInterest = vaultHoldings.invested
                .add(vaultHoldings.available)
                .sub(prevAUM)
                .sub(simulatedMgmtFee);
            const simulatedPerformanceFee = simulatedEarnedInterest
                .mul(new decimal_js_1.default(vault.performanceFeeBps.toString()))
                .div(CreationParameters_1.FullBPSDecimal);
            totalPendingFees = totalPendingFees.add(simulatedPerformanceFee);
        }
        const totalAvailableDecimal = (0, lib_1.lamportsToDecimal)(vaultHoldings.available, decimals);
        const totalInvestedDecimal = (0, lib_1.lamportsToDecimal)(vaultHoldings.invested, decimals);
        const pendingFees = (0, lib_1.lamportsToDecimal)(totalPendingFees, decimals);
        return new VaultHoldings({
            available: totalAvailableDecimal,
            invested: totalInvestedDecimal,
            investedInReserves: vaultHoldings.investedInReserves,
            totalAUMIncludingFees: totalAvailableDecimal.add(totalInvestedDecimal),
            pendingFees: pendingFees,
        });
    }
    /**
     * This will return an VaultOverview object that encapsulates all the information about the vault, including the holdings, reserves details, theoretical APY, utilization ratio and total borrowed amount
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param price - the price of the token in the vault (e.g. USDC)
     * @param [slot] - the slot for which to retrieve the vault overview for. Optional. If not provided the function will fetch the current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns an VaultOverview object with details about the tokens available and invested in the vault, denominated in tokens and USD
     */
    async getVaultHoldingsWithPrice(vault, price, slot, vaultReservesMap, currentSlot) {
        const holdings = await this.getVaultHoldings(vault, slot, vaultReservesMap, currentSlot);
        const investedInReservesUSD = new Map();
        holdings.investedInReserves.forEach((amount, reserve) => {
            investedInReservesUSD.set(reserve, amount.mul(price));
        });
        return {
            holdings: holdings,
            availableUSD: holdings.available.mul(price),
            investedUSD: holdings.invested.mul(price),
            investedInReservesUSD: investedInReservesUSD,
            totalUSDIncludingFees: holdings.totalAUMIncludingFees.mul(price),
            pendingFeesUSD: holdings.pendingFees.mul(price),
        };
    }
    /** Retrieves the maximum instant withdrawable amount for a vault based on the available liquidity in the vault allocations
     * @param vault - the kamino vault to get the maximum instant withdrawable amount for
     * @returns the maximum instant withdrawable amount for the vault
     */
    async getMaxInstantWithdrawableAmount(vault, vaultReservesMap, slot) {
        const latestSlot = slot ? slot : await this.getConnection().getSlot().send();
        const vaultState = await vault.getState();
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        let maxWithdrawableAmount = new decimal_js_1.default(vaultState.tokenAvailable.toString());
        const allocations = this.getVaultAllocations(vaultState);
        for (const [reserveAddress, allocation] of allocations) {
            if (reserveAddress === lib_1.DEFAULT_PUBLIC_KEY) {
                continue;
            }
            const reserve = vaultReservesState.get(reserveAddress);
            if (reserve === undefined) {
                throw new Error(`Reserve ${reserveAddress} not found`);
            }
            const reserveAvailableLiquidity = reserve.getLiquidityAvailableAmount();
            const investedInReserve = allocation.ctokenAllocation.div(reserve.getEstimatedCollateralExchangeRate(latestSlot, 0));
            const instantWithdrawableAmount = decimal_js_1.default.min(reserveAvailableLiquidity, investedInReserve);
            maxWithdrawableAmount = maxWithdrawableAmount.add(instantWithdrawableAmount);
        }
        return maxWithdrawableAmount;
    }
    /**
     * This will return an VaultOverview object that encapsulates all the information about the vault, including the holdings, reserves details, theoretical APY, utilization ratio and total borrowed amount
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param vaultTokenPrice - the price of the token in the vault (e.g. USDC)
     * @param [slot] - the slot for which to retrieve the vault overview for. Optional. If not provided the function will fetch the current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [kaminoMarkets] - a list of all kamino markets. Optional. If provided the function will be significantly faster as it will not have to fetch the markets
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @param [tokensPrices] - a hashmap from a token pubkey to the price of the token in USD. Optional. If some tokens are not in the map, the function will fetch the price
     * @returns an VaultOverview object with details about the tokens available and invested in the vault, denominated in tokens and USD, along sie APYs
     */
    async getVaultOverview(vault, vaultTokenPrice, slot, vaultReservesMap, kaminoMarkets, currentSlot, tokensPrices) {
        const vaultState = await vault.getState();
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const vaultHoldingsWithUSDValuePromise = this.getVaultHoldingsWithPrice(vaultState, vaultTokenPrice, slot, vaultReservesState, currentSlot);
        const slotForOverview = currentSlot ?? slot ?? (await this.getConnection().getSlot().send());
        const farmsClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const vaultTheoreticalAPYPromise = this.getVaultTheoreticalAPY(vaultState, slotForOverview, vaultReservesState);
        const vaultActualAPYPromise = this.getVaultActualAPY(vaultState, slotForOverview, vaultReservesState);
        const totalInvestedAndBorrowedPromise = this.getTotalBorrowedAndInvested(vaultState, slotForOverview, vaultReservesState);
        const vaultCollateralsPromise = this.getVaultCollaterals(vaultState, slotForOverview, vaultReservesState, kaminoMarkets);
        const reservesOverviewPromise = this.getVaultReservesDetails(vaultState, slotForOverview, vaultReservesState);
        const vaultFarmIncentivesPromise = this.getVaultRewardsAPY(vault, vaultTokenPrice, farmsClient, slotForOverview, tokensPrices);
        const vaultReservesFarmIncentivesPromise = this.getVaultReservesFarmsIncentives(vault, vaultTokenPrice, farmsClient, slotForOverview, vaultReservesState, tokensPrices);
        const vaultDelegatedFarmIncentivesPromise = this.getVaultDelegatedFarmRewardsAPY(vault, vaultTokenPrice, farmsClient, slotForOverview, tokensPrices);
        const vaultFlcFarmStatsPromise = this.getVaultFlcFarmStats(vault);
        const vaultWithdrawPenaltiesPromise = this.getVaultWithdrawPenalties(vault);
        // all the async part of the functions above just read the vaultReservesState which is read beforehand, so excepting vaultCollateralsPromise they should do no additional network calls
        const [vaultHoldingsWithUSDValue, vaultTheoreticalAPYs, vaultActualAPYs, totalInvestedAndBorrowed, vaultCollaterals, reservesOverview, vaultFarmIncentives, vaultReservesFarmIncentives, vaultDelegatedFarmIncentives, vaultFlcFarmStats, vaultWithdrawPenalties,] = await Promise.all([
            vaultHoldingsWithUSDValuePromise,
            vaultTheoreticalAPYPromise,
            vaultActualAPYPromise,
            totalInvestedAndBorrowedPromise,
            vaultCollateralsPromise,
            reservesOverviewPromise,
            vaultFarmIncentivesPromise,
            vaultReservesFarmIncentivesPromise,
            vaultDelegatedFarmIncentivesPromise,
            vaultFlcFarmStatsPromise,
            vaultWithdrawPenaltiesPromise,
        ]);
        return {
            holdingsUSD: vaultHoldingsWithUSDValue,
            reservesOverview: reservesOverview,
            vaultCollaterals: vaultCollaterals,
            actualSupplyAPY: vaultActualAPYs,
            theoreticalSupplyAPY: vaultTheoreticalAPYs,
            vaultFarmIncentives: vaultFarmIncentives,
            reservesFarmsIncentives: vaultReservesFarmIncentives,
            delegatedFarmIncentives: vaultDelegatedFarmIncentives,
            totalBorrowed: totalInvestedAndBorrowed.totalBorrowed,
            totalBorrowedUSD: totalInvestedAndBorrowed.totalBorrowed.mul(vaultTokenPrice),
            utilizationRatio: totalInvestedAndBorrowed.utilizationRatio,
            totalSupplied: totalInvestedAndBorrowed.totalInvested,
            totalSuppliedUSD: totalInvestedAndBorrowed.totalInvested.mul(vaultTokenPrice),
            flcFarmStats: vaultFlcFarmStats,
            withdrawalPenalties: vaultWithdrawPenalties,
        };
    }
    /**
     * This will return the withdrawal penalties for a vault
     * @param vault - the kamino vault to get the withdrawal penalties for
     * @param globalConfig - the global config to use for the withdrawal penalties. Optional. If not provided, the function will fetch the global config from the connection
     * @returns the withdrawal penalties for the vault, in lamports and bps; for each withdraw the penalty is computed and the bax between fixed amount and bps amount is taken
     */
    async getVaultWithdrawPenalties(vault, globalConfig) {
        const vaultState = await vault.getState();
        const globalConfigState = globalConfig
            ? globalConfig
            : await lib_1.KVaultGlobalConfig.fetch(this.getConnection(), await getKvaultGlobalConfigPda(this.getProgramID()));
        if (!globalConfigState) {
            throw new Error('KVault Global config not found');
        }
        const vaultWithdrawalPenaltyLamports = new decimal_js_1.default(vaultState.withdrawalPenaltyLamports.toString());
        const globalWithdrawalPenaltyLamports = new decimal_js_1.default(globalConfigState.withdrawalPenaltyLamports.toString());
        const withdrawalPenaltyLamports = vaultWithdrawalPenaltyLamports.gt(globalWithdrawalPenaltyLamports)
            ? vaultWithdrawalPenaltyLamports
            : globalWithdrawalPenaltyLamports;
        const vaultWithdrawalPenaltyBps = new decimal_js_1.default(vaultState.withdrawalPenaltyBps.toString());
        const globalWithdrawalPenaltyBps = new decimal_js_1.default(globalConfigState.withdrawalPenaltyBps.toString());
        const withdrawalPenaltyBps = vaultWithdrawalPenaltyBps.gt(globalWithdrawalPenaltyBps)
            ? vaultWithdrawalPenaltyBps
            : globalWithdrawalPenaltyBps;
        return {
            withdrawalPenaltyLamports: withdrawalPenaltyLamports,
            withdrawalPenaltyBps: withdrawalPenaltyBps,
        };
    }
    /**
     * This will return an aggregation of the current state of the vault with all the invested amounts and the utilization ratio of the vault
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param slot - current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @returns an VaultReserveTotalBorrowedAndInvested object with the total invested amount, total borrowed amount and the utilization ratio of the vault
     */
    async getTotalBorrowedAndInvested(vault, slot, vaultReservesMap) {
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vault);
        const totalAvailable = (0, lib_1.lamportsToDecimal)(new decimal_js_1.default(vault.tokenAvailable.toString()), new decimal_js_1.default(vault.tokenMintDecimals.toString()));
        let totalInvested = new decimal_js_1.default(0);
        let totalBorrowed = new decimal_js_1.default(0);
        vault.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesState.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            const reserveCollExchangeRate = reserve.getEstimatedCollateralExchangeRate(slot, 0);
            const reserveAllocationLiquidityAmountLamports = new decimal_js_1.default(allocationStrategy.ctokenAllocation.toString()).div(reserveCollExchangeRate);
            const reserveAllocationLiquidityAmount = (0, lib_1.lamportsToDecimal)(reserveAllocationLiquidityAmountLamports, vault.tokenMintDecimals.toString());
            const utilizationRatio = reserve.getEstimatedUtilizationRatio(slot, 0);
            totalInvested = totalInvested.add(reserveAllocationLiquidityAmount);
            totalBorrowed = totalBorrowed.add(reserveAllocationLiquidityAmount.mul(utilizationRatio));
        });
        let utilizationRatio = new decimal_js_1.default(0);
        if (!totalInvested.isZero()) {
            utilizationRatio = totalBorrowed.div(totalInvested.add(totalAvailable));
        }
        return {
            totalInvested: totalInvested,
            totalBorrowed: totalBorrowed,
            utilizationRatio: utilizationRatio,
        };
    }
    /**
     * This will return a map of the cumulative rewards issued for all the delegated farms
     * @param [vaults] - the vaults to get the cumulative rewards for; if not provided, the function will get the cumulative rewards for all the vaults
     * @returns a map of the cumulative rewards issued for all the delegated farms, per token, in lamports
     */
    async getCumulativeDelegatedFarmsRewardsIssuedForAllVaults(vaults) {
        const vaultsWithDelegatedFarms = await this.getVaultsWithDelegatedFarm();
        const delegatedFarmsAddresses = [];
        if (vaults) {
            vaults.forEach((vault) => {
                const delegatedFarm = vaultsWithDelegatedFarms.get(vault);
                if (delegatedFarm) {
                    delegatedFarmsAddresses.push(delegatedFarm);
                }
            });
        }
        else {
            delegatedFarmsAddresses.push(...Array.from(vaultsWithDelegatedFarms.values()));
        }
        const farmsSDK = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const delegatedFarmsStates = await farmsSDK.fetchMultipleFarmStatesWithCheckedSize(delegatedFarmsAddresses);
        const cumulativeRewardsPerToken = new Map();
        for (const delegatedFarmState of delegatedFarmsStates) {
            if (!delegatedFarmState) {
                continue;
            }
            delegatedFarmState.rewardInfos.forEach((rewardInfo) => {
                if (rewardInfo.token.mint === lib_1.DEFAULT_PUBLIC_KEY) {
                    return;
                }
                const rewardTokenMint = rewardInfo.token.mint;
                if (cumulativeRewardsPerToken.has(rewardTokenMint)) {
                    cumulativeRewardsPerToken.set(rewardTokenMint, cumulativeRewardsPerToken
                        .get(rewardTokenMint)
                        .add(new decimal_js_1.default(rewardInfo.rewardsIssuedCumulative.toString())));
                }
                else {
                    cumulativeRewardsPerToken.set(rewardTokenMint, new decimal_js_1.default(rewardInfo.rewardsIssuedCumulative.toString()));
                }
            });
        }
        return cumulativeRewardsPerToken;
    }
    /**
     * This will return an overview of each reserve that is part of the vault allocation
     * @param vault - the kamino vault to get available liquidity to withdraw for
     * @param slot - current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @returns a hashmap from vault reserve pubkey to ReserveOverview object
     */
    async getVaultReservesDetails(vault, slot, vaultReserves) {
        const vaultReservesState = vaultReserves ? vaultReserves : await this.loadVaultReserves(vault);
        const reservesDetails = new Map();
        vault.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesState.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            const suppliedInReserve = this.getSuppliedInReserve(vault, slot, reserve);
            const utilizationRatio = new decimal_js_1.default(reserve.getEstimatedUtilizationRatio(slot, 0));
            const reserveOverview = {
                supplyAPY: new decimal_js_1.default(reserve.totalSupplyAPY(slot)),
                utilizationRatio: utilizationRatio,
                liquidationThresholdPct: new decimal_js_1.default(reserve.state.config.liquidationThresholdPct),
                totalBorrowedAmount: reserve.getBorrowedAmount(),
                amountBorrowedFromSupplied: suppliedInReserve.mul(utilizationRatio),
                market: reserve.state.lendingMarket,
                suppliedAmount: suppliedInReserve,
            };
            reservesDetails.set(allocationStrategy.reserve, reserveOverview);
        });
        return reservesDetails;
    }
    /**
     * This will return the APY of the vault under the assumption that all the available tokens in the vault are all the time invested in the reserves as requested by the weights; for percentage it needs multiplication by 100
     * @param vault - the kamino vault to get APY for
     * @param slot - current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @returns a struct containing estimated gross APY and net APY (gross - vault fees) for the vault
     */
    async getVaultTheoreticalAPY(vault, slot, vaultReservesMap) {
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vault);
        let totalWeights = new decimal_js_1.default(0);
        let totalAPY = new decimal_js_1.default(0);
        vault.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesState.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            const reserveAPY = new decimal_js_1.default(reserve.totalSupplyAPY(slot));
            const weight = new decimal_js_1.default(allocationStrategy.targetAllocationWeight.toString());
            const weightedAPY = reserveAPY.mul(weight);
            totalAPY = totalAPY.add(weightedAPY);
            totalWeights = totalWeights.add(weight);
        });
        if (totalWeights.isZero()) {
            return {
                grossAPY: new decimal_js_1.default(0),
                netAPY: new decimal_js_1.default(0),
            };
        }
        const grossAPY = totalAPY.div(totalWeights);
        const netAPY = grossAPY
            .mul(new decimal_js_1.default(1).sub(new decimal_js_1.default(vault.performanceFeeBps.toString()).div(CreationParameters_1.FullBPSDecimal)))
            .mul(new decimal_js_1.default(1).sub(new decimal_js_1.default(vault.managementFeeBps.toString()).div(CreationParameters_1.FullBPSDecimal)));
        return {
            grossAPY,
            netAPY,
        };
    }
    /**
     * This will return the APY of the vault based on the current invested amounts; for percentage it needs multiplication by 100
     * @param vault - the kamino vault to get APY for
     * @param slot - current slot
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @returns a struct containing estimated gross APY and net APY (gross - vault fees) for the vault
     */
    async getVaultActualAPY(vault, slot, vaultReservesMap) {
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vault);
        let totalAUM = new decimal_js_1.default(vault.tokenAvailable.toString());
        let totalAPY = new decimal_js_1.default(0);
        vault.vaultAllocationStrategy.forEach((allocationStrategy) => {
            if (allocationStrategy.reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                return;
            }
            const reserve = vaultReservesState.get(allocationStrategy.reserve);
            if (reserve === undefined) {
                throw new Error(`Reserve ${allocationStrategy.reserve} not found`);
            }
            const reserveAPY = new decimal_js_1.default(reserve.totalSupplyAPY(slot));
            const exchangeRate = reserve.getEstimatedCollateralExchangeRate(slot, 0);
            const investedInReserve = exchangeRate.mul(new decimal_js_1.default(allocationStrategy.ctokenAllocation.toString()));
            const weightedAPY = reserveAPY.mul(investedInReserve);
            totalAPY = totalAPY.add(weightedAPY);
            totalAUM = totalAUM.add(investedInReserve);
        });
        if (totalAUM.isZero()) {
            return {
                grossAPY: new decimal_js_1.default(0),
                netAPY: new decimal_js_1.default(0),
            };
        }
        const grossAPY = totalAPY.div(totalAUM);
        const netAPY = grossAPY
            .mul(new decimal_js_1.default(1).sub(new decimal_js_1.default(vault.performanceFeeBps.toString()).div(CreationParameters_1.FullBPSDecimal)))
            .mul(new decimal_js_1.default(1).sub(new decimal_js_1.default(vault.managementFeeBps.toString()).div(CreationParameters_1.FullBPSDecimal)));
        return {
            grossAPY,
            netAPY,
        };
    }
    /**
     * Retrive the total amount of interest earned by the vault since its inception, up to the last interaction with the vault on chain, including what was charged as fees
     * @param vaultState the kamino vault state to get total net yield for
     * @returns a struct containing a Decimal representing the net number of tokens earned by the vault since its inception and the timestamp of the last fee charge
     */
    async getVaultCumulativeInterest(vaultState) {
        const netYieldLamports = new fraction_1.Fraction(vaultState.cumulativeEarnedInterestSf).toDecimal();
        const cumulativeInterest = (0, lib_1.lamportsToDecimal)(netYieldLamports, vaultState.tokenMintDecimals.toString());
        return {
            cumulativeInterest: cumulativeInterest,
            timestamp: vaultState.lastFeeChargeTimestamp.toNumber(),
        };
    }
    /**
     * Simulate the current holdings of the vault and the earned interest
     * @param vaultState the kamino vault state to get simulated holdings and earnings for
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [slot] - the current slot. Optional. If not provided it will fetch the current slot
     * @param [previousNetAUM] - the previous AUM of the vault to compute the earned interest relative to this value. Optional. If not provided the function will estimate the total AUM at the slot of the last state update on chain
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns a struct of simulated vault holdings and earned interest
     */
    async calculateSimulatedHoldingsWithInterest(vaultState, vaultReservesMap, slot, previousNetAUM, currentSlot) {
        let prevAUM;
        let pendingFees = math_1.ZERO;
        if (previousNetAUM) {
            prevAUM = previousNetAUM;
        }
        else {
            const tokenDecimals = vaultState.tokenMintDecimals.toNumber();
            prevAUM = (0, lib_1.lamportsToDecimal)(new fraction_1.Fraction(vaultState.prevAumSf).toDecimal(), tokenDecimals);
            pendingFees = (0, lib_1.lamportsToDecimal)(new fraction_1.Fraction(vaultState.pendingFeesSf).toDecimal(), tokenDecimals);
        }
        let fetchedLatestSlot = undefined;
        if (!slot || !currentSlot) {
            fetchedLatestSlot = await this.getConnection().getSlot({ commitment: 'confirmed' }).send();
        }
        const latestSlot = slot ? slot : fetchedLatestSlot;
        const latestCurrentSlot = currentSlot ? currentSlot : fetchedLatestSlot;
        const currentHoldings = await this.getVaultHoldings(vaultState, latestSlot, vaultReservesMap, latestCurrentSlot);
        const earnedInterest = currentHoldings.totalAUMIncludingFees.sub(prevAUM).sub(pendingFees);
        return {
            holdings: currentHoldings,
            earnedInterest: earnedInterest,
        };
    }
    /**
     * Simulate the current holdings and compute the fees that would be charged
     * @param vaultState the kamino vault state to get simulated fees for
     * @param [simulatedCurrentHoldingsWithInterest] the simulated holdings and interest earned by the vault. Optional
     * @param [currentTimestamp] the current date. Optional. If not provided it will fetch the current unix timestamp
     * @param [vaultReservesMap] - hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [slot] - the slot at which to compute the fees. Optional. If not provided it will fetch the current slot
     * @param [previousNetAUM] - the previous AUM of the vault to compute the fees relative to this value. Optional. If not provided the function will estimate the total AUM at the slot of the last state update on chain
     * @param [currentSlot] - the latest confirmed slot. Optional. If provided the function will be  faster as it will not have to fetch the latest slot
     * @returns a VaultFees struct of simulated management and interest fees
     */
    async calculateSimulatedFees(vaultState, simulatedCurrentHoldingsWithInterest, currentTimestamp, vaultReservesMap, slot, previousNetAUM, currentSlot) {
        const timestampNowInSeconds = currentTimestamp ? currentTimestamp.valueOf() / 1000 : Date.now() / 1000;
        const timestampLastUpdate = vaultState.lastFeeChargeTimestamp.toNumber();
        const timeElapsed = timestampNowInSeconds - timestampLastUpdate;
        const simulatedCurrentHoldings = simulatedCurrentHoldingsWithInterest
            ? simulatedCurrentHoldingsWithInterest
            : await this.calculateSimulatedHoldingsWithInterest(vaultState, vaultReservesMap, slot, previousNetAUM, currentSlot);
        const performanceFee = simulatedCurrentHoldings.earnedInterest.mul(new decimal_js_1.default(vaultState.performanceFeeBps.toString()).div(CreationParameters_1.FullBPSDecimal));
        const managementFeeFactor = new decimal_js_1.default(timeElapsed)
            .mul(new decimal_js_1.default(vaultState.managementFeeBps.toString()))
            .div(new decimal_js_1.default(utils_2.SECONDS_PER_YEAR))
            .div(CreationParameters_1.FullBPSDecimal);
        const prevAUM = (0, lib_1.lamportsToDecimal)(new fraction_1.Fraction(vaultState.prevAumSf).toDecimal(), vaultState.tokenMintDecimals.toNumber());
        const mgmtFee = prevAUM.mul(managementFeeFactor);
        return {
            managementFee: mgmtFee,
            performanceFee: performanceFee,
        };
    }
    /**
     * This will compute the PDA that is used as delegatee in Farms program to compute the user state PDA for vault depositor investing in vault with reserve having a supply farm
     */
    computeUserFarmStateDelegateePDAForUserInVault(farmsProgramId, vault, reserve, user) {
        return (0, kit_1.getProgramDerivedAddress)({
            seeds: [addressEncoder.encode(reserve), addressEncoder.encode(vault), addressEncoder.encode(user)],
            programAddress: farmsProgramId,
        });
    }
    /**
     * Compute the delegatee PDA for the user farm state for a vault delegate farm
     * @param farmProgramID - the program ID of the farm program
     * @param vault - the address of the vault
     * @param farm - the address of the delegated farm
     * @param user - the address of the user
     * @returns the PDA of the delegatee user farm state for the delegated farm
     */
    async computeUserFarmStateDelegateePDAForUserInDelegatedVaultFarm(farmProgramID, vault, farm, user) {
        return (0, kit_1.getProgramDerivedAddress)({
            seeds: [addressEncoder.encode(vault), addressEncoder.encode(farm), addressEncoder.encode(user)],
            programAddress: farmProgramID,
        });
    }
    /**
     * Compute the user state PDA for a user in a delegated vault farm
     * @param farmProgramID - the program ID of the farm program
     * @param vault - the address of the vault
     * @param farm - the address of the delegated farm
     * @param user - the address of the user
     * @returns the PDA of the user state for the delegated farm
     */
    async computeUserStatePDAForUserInDelegatedVaultFarm(farmProgramID, vault, farm, user) {
        const delegateePDA = await this.computeDelegateeForUserInDelegatedFarm(farmProgramID, vault, farm, user);
        return (0, dist_1.getUserStatePDA)(farmProgramID, farm, delegateePDA);
    }
    async computeDelegateeForUserInDelegatedFarm(farmProgramID, vault, farm, user) {
        const delegateePDA = await this.computeUserFarmStateDelegateePDAForUserInDelegatedVaultFarm(farmProgramID, vault, farm, user);
        return delegateePDA[0];
    }
    /**
     * Read the APY of the farm built on top of the vault (farm in vaultState.vaultFarm)
     * @param vaultOrState - the vault or state to read the farm APY for
     * @param vaultTokenPrice - the price of the vault token in USD (e.g. 1.0 for USDC)
     * @param [farmsClient] - the farms client to use. Optional. If not provided, the function will create a new one
     * @param [slot] - the slot to read the farm APY for. Optional. If not provided, the function will read the current slot
     * @param tokensPrices cached token prices
     * @returns the APY of the farm built on top of the vault
     */
    async getVaultRewardsAPY(vaultOrState, vaultTokenPrice, farmsClient, slot, tokensPrices) {
        // Determine if we have a KaminoVault or VaultState
        const vaultState = 'getState' in vaultOrState ? await vaultOrState.getState() : vaultOrState;
        if (vaultState.vaultFarm === lib_1.DEFAULT_PUBLIC_KEY) {
            return {
                incentivesStats: [],
                totalIncentivesApy: 0,
            };
        }
        const kFarmsClient = farmsClient ? farmsClient : new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const farmState = await dist_1.FarmState.fetch(kFarmsClient.getConnection(), vaultState.vaultFarm, kFarmsClient.getProgramID());
        if (!farmState) {
            // a vault may have a badly configured farm that does not exist on chain but isn't set as a default pubkey by mistake
            return {
                incentivesStats: [],
                totalIncentivesApy: 0,
            };
        }
        const tokensPerShare = await this.getTokensPerShareSingleVault(vaultState, slot);
        const sharePrice = tokensPerShare.mul(vaultTokenPrice);
        const stakedTokenMintDecimals = vaultState.sharesMintDecimals.toNumber();
        return (0, dist_1.getFarmIncentivesWithExistentState)(kFarmsClient, vaultState.vaultFarm, farmState, sharePrice, stakedTokenMintDecimals, tokensPrices);
    }
    /**
     * Read the APY of the delegated farm providing incentives for vault depositors
     * @param vault - the vault to read the farm APY for
     * @param vaultTokenPrice - the price of the vault token in USD (e.g. 1.0 for USDC)
     * @param [farmsClient] - the farms client to use. Optional. If not provided, the function will create a new one
     * @param [slot] - the slot to read the farm APY for. Optional. If not provided, the function will read the current slot
     * @param [tokensPrices] - the prices of the tokens in USD. Optional. If not provided, the function will fetch the prices
     * @returns the APY of the delegated farm providing incentives for vault depositors
     */
    async getVaultDelegatedFarmRewardsAPY(vault, vaultTokenPrice, farmsClient, slot, tokensPrices) {
        const delegatedFarm = await this.getDelegatedFarmForVault(vault.address);
        if (!delegatedFarm) {
            return {
                incentivesStats: [],
                totalIncentivesApy: 0,
            };
        }
        const vaultState = await vault.getState();
        const tokensPerShare = await this.getTokensPerShareSingleVault(vaultState, slot);
        const sharePrice = tokensPerShare.mul(vaultTokenPrice);
        const stakedTokenMintDecimals = vaultState.sharesMintDecimals.toNumber();
        const kFarmsClient = farmsClient ? farmsClient : new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const farmState = await dist_1.FarmState.fetch(kFarmsClient.getConnection(), delegatedFarm, kFarmsClient.getProgramID());
        if (!farmState) {
            // a vault may have a badly configured farm that does not exist on chain but isn't set as a default pubkey by mistake
            return {
                incentivesStats: [],
                totalIncentivesApy: 0,
            };
        }
        return (0, dist_1.getFarmIncentivesWithExistentState)(kFarmsClient, delegatedFarm, farmState, sharePrice, stakedTokenMintDecimals, tokensPrices);
    }
    /**
     * Get all the token mints of the vault, vault farm rewards and the allocation  rewards
     * @param vaults - the vaults to get the token mints for
     * @param [vaultReservesMap] - the vault reserves map to get the reserves for; if not provided, the function will fetch the reserves
     * @param farmsMap - the farms map to get the farms for
     * @returns a map of token mints (keys) and number of decimals (values)
     */
    async getAllVaultsTokenMintsIncludingRewards(vaults, vaultReservesMap, farmsMap) {
        const vaultsTokenMints = new Map();
        const kFarmsMap = farmsMap ? farmsMap : new Map();
        const farmsToFetch = new Set();
        const reservesToFetch = new Set();
        for (const vault of vaults) {
            const vaultState = await vault.getState();
            vaultsTokenMints.set(vaultState.tokenMint, vaultState.tokenMintDecimals.toNumber());
            const hasFarm = await vault.hasFarm();
            if (hasFarm) {
                const farmAddress = vaultState.vaultFarm;
                if (!kFarmsMap.has(farmAddress)) {
                    farmsToFetch.add(farmAddress);
                }
                else {
                    const farmState = kFarmsMap.get(farmAddress);
                    farmState.rewardInfos.forEach((rewardInfo) => {
                        if (rewardInfo.token.mint !== lib_1.DEFAULT_PUBLIC_KEY) {
                            vaultsTokenMints.set(rewardInfo.token.mint, rewardInfo.token.decimals.toNumber());
                        }
                    });
                }
            }
            const reserves = vaultState.vaultAllocationStrategy.map((allocationStrategy) => allocationStrategy.reserve);
            reserves.forEach((reserve) => {
                if (reserve === lib_1.DEFAULT_PUBLIC_KEY) {
                    return;
                }
                if (vaultReservesMap && !vaultReservesMap.has(reserve)) {
                    const reserveState = vaultReservesMap.get(reserve);
                    const supplyFarm = reserveState.state.farmCollateral;
                    if (supplyFarm !== lib_1.DEFAULT_PUBLIC_KEY) {
                        if (!kFarmsMap.has(supplyFarm)) {
                            farmsToFetch.add(supplyFarm);
                        }
                        else {
                            const farmState = kFarmsMap.get(supplyFarm);
                            farmState.rewardInfos.forEach((rewardInfo) => {
                                if (rewardInfo.token.mint !== lib_1.DEFAULT_PUBLIC_KEY) {
                                    vaultsTokenMints.set(rewardInfo.token.mint, rewardInfo.token.decimals.toNumber());
                                }
                            });
                        }
                    }
                }
                else {
                    reservesToFetch.add(reserve);
                }
            });
        }
        // fetch the reserves first so we can add their farms to farms to be fetched, if needed
        const missingReservesStates = await lib_1.Reserve.fetchMultiple(this.getConnection(), Array.from(reservesToFetch));
        missingReservesStates.forEach((reserveState) => {
            if (reserveState) {
                const supplyFarm = reserveState.farmCollateral;
                if (supplyFarm !== lib_1.DEFAULT_PUBLIC_KEY) {
                    if (!kFarmsMap.has(supplyFarm)) {
                        farmsToFetch.add(supplyFarm);
                    }
                    else {
                        const farmState = kFarmsMap.get(supplyFarm);
                        farmState.rewardInfos.forEach((rewardInfo) => {
                            if (rewardInfo.token.mint !== lib_1.DEFAULT_PUBLIC_KEY) {
                                vaultsTokenMints.set(rewardInfo.token.mint, rewardInfo.token.decimals.toNumber());
                            }
                        });
                    }
                }
            }
        });
        // fetch the missing farms
        const missingFarmsStates = await dist_1.FarmState.fetchMultiple(this.getConnection(), Array.from(farmsToFetch), this._farmsProgramId);
        missingFarmsStates.forEach((farmState) => {
            if (farmState) {
                farmState.rewardInfos.forEach((rewardInfo) => {
                    if (rewardInfo.token.mint !== lib_1.DEFAULT_PUBLIC_KEY) {
                        vaultsTokenMints.set(rewardInfo.token.mint, rewardInfo.token.decimals.toNumber());
                    }
                });
            }
        });
        return vaultsTokenMints;
    }
    async getVaultReservesFarmsIncentives(vaultOrState, vaultTokenPrice, farmsClient, slot, vaultReservesMap, tokensPrices) {
        const vaultState = 'getState' in vaultOrState ? await vaultOrState.getState() : vaultOrState;
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const currentSlot = slot ?? (await this.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const holdings = await this.getVaultHoldings(vaultState, currentSlot, vaultReservesState);
        const vaultReservesAddresses = vaultState.vaultAllocationStrategy.map((allocationStrategy) => allocationStrategy.reserve);
        const vaultReservesFarmsIncentives = new Map();
        let totalIncentivesApy = new decimal_js_1.default(0);
        const kFarmsClient = farmsClient ? farmsClient : new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        for (const reserveAddress of vaultReservesAddresses) {
            if (reserveAddress === lib_1.DEFAULT_PUBLIC_KEY) {
                continue;
            }
            const reserveState = vaultReservesState.get(reserveAddress);
            if (reserveState === undefined) {
                console.log(`Reserve to read farm incentives for not found: ${reserveAddress}`);
                vaultReservesFarmsIncentives.set(reserveAddress, {
                    incentivesStats: [],
                    totalIncentivesApy: 0,
                });
                continue;
            }
            const reserveFarmIncentives = await (0, farmUtils_1.getReserveFarmRewardsAPY)(this._rpc, this.recentSlotDurationMs, reserveAddress, vaultTokenPrice, this._kaminoLendProgramId, kFarmsClient, currentSlot, reserveState.state, tokensPrices);
            vaultReservesFarmsIncentives.set(reserveAddress, reserveFarmIncentives.collateralFarmIncentives);
            const investedInReserve = holdings.investedInReserves.get(reserveAddress);
            const weightedReserveAPY = new decimal_js_1.default(reserveFarmIncentives.collateralFarmIncentives.totalIncentivesApy)
                .mul(investedInReserve ?? 0)
                .div(holdings.totalAUMIncludingFees);
            totalIncentivesApy = totalIncentivesApy.add(weightedReserveAPY);
        }
        return {
            reserveFarmsIncentives: vaultReservesFarmsIncentives,
            totalIncentivesAPY: totalIncentivesApy,
        };
    }
    async getVaultFlcFarmStats(vaultOrState) {
        const vaultState = 'getState' in vaultOrState ? await vaultOrState.getState() : vaultOrState;
        if (vaultState.firstLossCapitalFarm === lib_1.DEFAULT_PUBLIC_KEY) {
            return undefined;
        }
        const kFarmsClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const flcFarmState = await dist_1.FarmState.fetch(this.getConnection(), vaultState.firstLossCapitalFarm, this._farmsProgramId);
        if (!flcFarmState) {
            return undefined;
        }
        if (!(await this.isFlcFarmValid(flcFarmState, vaultState))) {
            return undefined;
        }
        const userStates = await kFarmsClient.getAllUserStatesForFarm(vaultState.firstLossCapitalFarm);
        const pendingUnstakes = [];
        for (const { userState, key } of userStates) {
            const pendingWithdrawalUnstake = new decimal_js_1.default((0, dist_1.scaleDownWads)(userState.pendingWithdrawalUnstakeScaled));
            if (pendingWithdrawalUnstake.gt(0)) {
                pendingUnstakes.push({
                    userStateAddress: key,
                    pendingUnstakeAmountLamports: pendingWithdrawalUnstake,
                    pendingUnstakeAvailableAtTimestamp: userState.pendingWithdrawalUnstakeTs.toNumber(),
                });
            }
        }
        return {
            address: vaultState.firstLossCapitalFarm,
            farmState: flcFarmState,
            totalStakedShares: new decimal_js_1.default((0, dist_1.scaleDownWads)(flcFarmState.totalActiveStakeScaled)),
            withdrawalCooldownDurationSeconds: flcFarmState.withdrawalCooldownPeriod,
            isPendingUnstake: pendingUnstakes.length > 0,
            pendingUnstakeInfo: pendingUnstakes,
        };
    }
    async isFlcFarmValid(flcFarmState, vaultOrState) {
        const vaultState = 'getState' in vaultOrState ? await vaultOrState.getState() : vaultOrState;
        if (flcFarmState.timeUnit !== 0) {
            // timeUnit = 0 -> seconds
            return false;
        }
        if (flcFarmState.withdrawalCooldownPeriod === 0) {
            // invalid FLC farm, should have > 0 withdrawal cooldown
            return false;
        }
        if (flcFarmState.token.mint !== vaultState.sharesMint) {
            // staked token mint should be the vault shares mint
            return false;
        }
        return true;
    }
    /// reads the pending rewards for a user in the vault farm
    /// @param user - the user address
    /// @param vault - the vault
    /// @returns a map of the pending rewards token mint and amount in lamports
    async getUserPendingRewardsInVaultFarm(user, vault) {
        const vaultState = await vault.getState();
        const hasFarm = await vault.hasFarm();
        if (!hasFarm) {
            return new Map();
        }
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const userState = await (0, dist_1.getUserStatePDA)(farmClient.getProgramID(), vaultState.vaultFarm, user);
        return (0, farm_utils_1.getUserPendingRewardsInFarm)(this.getConnection(), userState, vaultState.vaultFarm, this._farmsProgramId);
    }
    /// reads the pending rewards for a user in a delegated vault farm
    /// @param user - the user address
    /// @param vaultAddress - the address of the vault
    /// @returns a map of the pending rewards token mint and amount in lamports
    async getUserPendingRewardsInVaultDelegatedFarm(user, vaultAddress) {
        const delegatedFarm = await this.getDelegatedFarmForVault(vaultAddress);
        if (!delegatedFarm) {
            return new Map();
        }
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const userState = await this.computeUserStatePDAForUserInDelegatedVaultFarm(farmClient.getProgramID(), vaultAddress, delegatedFarm, user);
        return (0, farm_utils_1.getUserPendingRewardsInFarm)(this.getConnection(), userState, delegatedFarm, this._farmsProgramId);
    }
    /// gets the delegated farm for a vault
    async getDelegatedFarmForVault(vault) {
        const resources = await this.loadCdnResourcesOnce();
        const delegatedVaultFarms = resources?.delegatedVaultFarms;
        if (!delegatedVaultFarms) {
            return undefined;
        }
        const delegatedFarmWithVault = delegatedVaultFarms.find((vaultWithFarm) => vaultWithFarm.vault === vault);
        if (!delegatedFarmWithVault) {
            return undefined;
        }
        return (0, kit_1.address)(delegatedFarmWithVault.farm);
    }
    /**
     * gets all the delegated farms addresses
     * @returns a list of delegated farms addresses
     */
    async getAllDelegatedFarms() {
        const vaultsWithDelegatedFarm = await this.getVaultsWithDelegatedFarm();
        return Array.from(vaultsWithDelegatedFarm.values());
    }
    /**
     * This will return a map of the vault address and the delegated farm address for that vault
     * @returns a map of the vault address and the delegated farm address for that vault
     */
    async getVaultsWithDelegatedFarm() {
        const resources = await this.loadCdnResourcesOnce();
        const delegatedVaultFarms = resources?.delegatedVaultFarms;
        if (!delegatedVaultFarms) {
            return new Map();
        }
        return new Map(delegatedVaultFarms.map((delegatedFarm) => [(0, kit_1.address)(delegatedFarm.vault), (0, kit_1.address)(delegatedFarm.farm)]));
    }
    /// reads the pending rewards for a user in the reserves farms of a vault
    /// @param user - the user address
    /// @param vault - the vault
    /// @param [vaultReservesMap] - the vault reserves map to get the reserves for; if not provided, the function will fetch the reserves
    /// @returns a map of the pending rewards token mint and amount in lamports
    async getUserPendingRewardsInVaultReservesFarms(user, vault, vaultReservesMap) {
        const vaultState = await vault.getState();
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const vaultReserves = vaultState.vaultAllocationStrategy
            .map((allocationStrategy) => allocationStrategy.reserve)
            .filter((reserve) => reserve !== lib_1.DEFAULT_PUBLIC_KEY);
        const pendingRewardsPerToken = new Map();
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        for (const reserveAddress of vaultReserves) {
            const reserveState = vaultReservesState.get(reserveAddress);
            if (!reserveState) {
                console.log(`Reserve to read farm incentives for not found: ${reserveAddress}`);
                continue;
            }
            if (reserveState.state.farmCollateral === lib_1.DEFAULT_PUBLIC_KEY) {
                continue;
            }
            const delegatee = await this.computeUserFarmStateDelegateePDAForUserInVault(farmClient.getProgramID(), vault.address, reserveAddress, user);
            const userState = await (0, dist_1.getUserStatePDA)(farmClient.getProgramID(), reserveState.state.farmCollateral, delegatee[0]);
            const pendingRewards = await (0, farm_utils_1.getUserPendingRewardsInFarm)(this.getConnection(), userState, reserveState.state.farmCollateral, this._farmsProgramId);
            pendingRewards.forEach((reward, token) => {
                const existingReward = pendingRewardsPerToken.get(token);
                if (existingReward) {
                    pendingRewardsPerToken.set(token, existingReward.add(reward));
                }
                else {
                    pendingRewardsPerToken.set(token, reward);
                }
            });
        }
        return pendingRewardsPerToken;
    }
    /// reads the pending rewards for a user in the vault farm, the reserves farms of the vault and the delegated vault farm
    /// @param user - the user address
    /// @param vault - the vault
    /// @param [vaultReservesMap] - the vault reserves map to get the reserves for; if not provided, the function will fetch the reserves
    /// @returns a struct containing the pending rewards in the vault farm, the reserves farms of the vault and the delegated vault farm, and the total pending rewards in lamports
    async getAllPendingRewardsForUserInVault(user, vault, vaultReservesMap) {
        const pendingRewardsInVaultFarm = await this.getUserPendingRewardsInVaultFarm(user, vault);
        const pendingRewardsInVaultReservesFarms = await this.getUserPendingRewardsInVaultReservesFarms(user, vault, vaultReservesMap);
        const pendingRewardsInVaultDelegatedFarm = await this.getUserPendingRewardsInVaultDelegatedFarm(user, vault.address);
        const totalPendingRewards = new Map();
        pendingRewardsInVaultFarm.forEach((reward, token) => {
            const existingReward = totalPendingRewards.get(token);
            if (existingReward) {
                totalPendingRewards.set(token, existingReward.add(reward));
            }
            else {
                totalPendingRewards.set(token, reward);
            }
        });
        pendingRewardsInVaultReservesFarms.forEach((reward, token) => {
            const existingReward = totalPendingRewards.get(token);
            if (existingReward) {
                totalPendingRewards.set(token, existingReward.add(reward));
            }
            else {
                totalPendingRewards.set(token, reward);
            }
        });
        pendingRewardsInVaultDelegatedFarm.forEach((reward, token) => {
            const existingReward = totalPendingRewards.get(token);
            if (existingReward) {
                totalPendingRewards.set(token, existingReward.add(reward));
            }
            else {
                totalPendingRewards.set(token, reward);
            }
        });
        return {
            pendingRewardsInVaultFarm,
            pendingRewardsInVaultReservesFarms,
            pendingRewardsInVaultDelegatedFarm,
            totalPendingRewards,
        };
    }
    /**
     * This function will return the instructions to claim the rewards for the farm of a vault, the delegated farm of the vault and the reserves farms of the vault
     * @param user - the user to claim the rewards
     * @param vault - the vault
     * @param [vaultReservesMap] - the vault reserves map to get the reserves for; if not provided, the function will fetch the reserves
     * @returns the instructions to claim the rewards for the farm of the vault, the delegated farm of the vault and the reserves farms of the vault
     */
    async getClaimAllRewardsForVaultIxs(user, vault, vaultReservesMap) {
        const [vaultFarmIxs, delegatedFarmIxs, reservesFarmsIxs] = await Promise.all([
            this.getClaimVaultFarmRewardsIxs(user, vault),
            this.getClaimVaultDelegatedFarmRewardsIxs(user, vault),
            this.getClaimVaultReservesFarmsRewardsIxs(user, vault, vaultReservesMap),
        ]);
        return [...new Set([...vaultFarmIxs, ...delegatedFarmIxs, ...reservesFarmsIxs])];
    }
    /**
     * This function will return the instructions to claim the rewards for the farm of a vault
     * @param user - the user to claim the rewards
     * @param vault - the vault
     * @returns the instructions to claim the rewards for the farm of the vault
     */
    async getClaimVaultFarmRewardsIxs(user, vault) {
        const vaultState = await vault.getState();
        const hasFarm = await vault.hasFarm();
        if (!hasFarm) {
            return [];
        }
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const pendingRewardsInVaultFarm = await this.getUserPendingRewardsInVaultFarm(user.address, vault);
        // if there are no pending rewards of their total is 0 no ix is needed
        const totalPendingRewards = Array.from(pendingRewardsInVaultFarm.values()).reduce((acc, reward) => acc.add(reward), new decimal_js_1.default(0));
        if (totalPendingRewards.eq(0)) {
            return [];
        }
        return farmClient.claimForUserForFarmAllRewardsIx(user, user.address, vaultState.vaultFarm, false);
    }
    /**
     * This function will return the instructions to claim the rewards for the delegated farm of a vault
     * @param user - the user to claim the rewards
     * @param vault - the vault
     * @returns the instructions to claim the rewards for the delegated farm of the vault
     */
    async getClaimVaultDelegatedFarmRewardsIxs(user, vault) {
        const delegatedFarm = await this.getDelegatedFarmForVault(vault.address);
        if (!delegatedFarm) {
            return [];
        }
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        const delegatee = await this.computeDelegateeForUserInDelegatedFarm(farmClient.getProgramID(), vault.address, delegatedFarm, user.address);
        const userState = await (0, dist_1.getUserStatePDA)(farmClient.getProgramID(), delegatedFarm, delegatee);
        // check if the user state exists
        const userStateExists = await (0, kit_1.fetchEncodedAccount)(this.getConnection(), userState);
        if (!userStateExists.exists) {
            return [];
        }
        return farmClient.claimForUserForFarmAllRewardsIx(user, user.address, delegatedFarm, true, [delegatee]);
    }
    /**
     * This function will return the instructions to claim the rewards for the reserves farms of a vault
     * @param user - the user to claim the rewards
     * @param vault - the vault
     * @param [vaultReservesMap] - the vault reserves map to get the reserves for; if not provided, the function will fetch the reserves
     * @returns the instructions to claim the rewards for the reserves farms of the vault
     */
    async getClaimVaultReservesFarmsRewardsIxs(user, vault, vaultReservesMap) {
        const vaultState = await vault.getState();
        const vaultReservesState = vaultReservesMap ? vaultReservesMap : await this.loadVaultReserves(vaultState);
        const vaultReserves = vaultState.vaultAllocationStrategy
            .map((allocationStrategy) => allocationStrategy.reserve)
            .filter((reserve) => reserve !== lib_1.DEFAULT_PUBLIC_KEY);
        const ixs = [];
        const farmClient = new farms_sdk_1.Farms(this.getConnection(), this._farmsProgramId);
        for (const reserveAddress of vaultReserves) {
            const reserveState = vaultReservesState.get(reserveAddress);
            if (!reserveState) {
                console.log(`Reserve to read farm incentives for not found: ${reserveAddress}`);
                continue;
            }
            if (reserveState.state.farmCollateral === lib_1.DEFAULT_PUBLIC_KEY) {
                continue;
            }
            const delegatee = await this.computeUserFarmStateDelegateePDAForUserInVault(farmClient.getProgramID(), vault.address, reserveAddress, user.address);
            const userState = await (0, dist_1.getUserStatePDA)(farmClient.getProgramID(), reserveState.state.farmCollateral, delegatee[0]);
            const pendingRewards = await (0, farm_utils_1.getUserPendingRewardsInFarm)(this.getConnection(), userState, reserveState.state.farmCollateral, this._farmsProgramId);
            const totalPendingRewards = Array.from(pendingRewards.values()).reduce((acc, reward) => acc.add(reward), new decimal_js_1.default(0));
            if (totalPendingRewards.eq(0)) {
                continue;
            }
            const ix = await farmClient.claimForUserForFarmAllRewardsIx(user, user.address, reserveState.state.farmCollateral, true, [delegatee[0]]);
            ixs.push(...ix);
        }
        return ixs;
    }
    buildRemainingAccountsForVaultReserves(vaultReserves, vaultReservesState) {
        let vaultReservesAccountMetas = [];
        let vaultReservesLendingMarkets = [];
        vaultReserves.forEach((reserve) => {
            const reserveState = vaultReservesState.get(reserve);
            if (reserveState === undefined) {
                throw new Error(`Reserve ${reserve} not found`);
            }
            vaultReservesAccountMetas = vaultReservesAccountMetas.concat([{ address: reserve, role: kit_1.AccountRole.WRITABLE }]);
            vaultReservesLendingMarkets = vaultReservesLendingMarkets.concat([
                { address: reserveState.state.lendingMarket, role: kit_1.AccountRole.READONLY },
            ]);
        });
        return [...vaultReservesAccountMetas, ...vaultReservesLendingMarkets];
    }
    appendRemainingAccountsForVaultReserves(ix, vaultReserves, vaultReservesState) {
        const remainingAccounts = this.buildRemainingAccountsForVaultReserves(vaultReserves, vaultReservesState);
        return {
            ...ix,
            accounts: ix.accounts?.concat(remainingAccounts),
        };
    }
} // KaminoVaultClient
exports.KaminoVaultClient = KaminoVaultClient;
class KaminoVault {
    address;
    state;
    programId;
    client;
    vaultReservesStateCache;
    constructor(rpc, vaultAddress, state, programId = exports.kaminoVaultId, recentSlotDurationMs = lib_1.DEFAULT_RECENT_SLOT_DURATION_MS) {
        this.address = vaultAddress;
        this.state = state;
        this.programId = programId;
        this.client = new KaminoVaultClient(rpc, recentSlotDurationMs);
    }
    static loadWithClientAndState(client, vaultAddress, state) {
        const vault = new KaminoVault(client.getConnection(), vaultAddress);
        vault.state = state;
        vault.programId = client.getProgramID();
        vault.client = client;
        return vault;
    }
    async getState() {
        if (!this.state) {
            const res = await accounts_1.VaultState.fetch(this.client.getConnection(), this.address, this.programId);
            if (!res) {
                throw new Error('Invalid vault');
            }
            this.state = res;
            return res;
        }
        else {
            return this.state;
        }
    }
    async reloadVaultReserves() {
        this.vaultReservesStateCache = await this.client.loadVaultReserves(this.state);
    }
    async reloadState() {
        this.state = await accounts_1.VaultState.fetch(this.client.getConnection(), this.address, this.programId);
        if (!this.state) {
            throw new Error('Could not fetch vault');
        }
        return this.state;
    }
    async hasFarm(vaultState) {
        const state = vaultState ?? (await this.getState());
        return state.vaultFarm !== lib_1.DEFAULT_PUBLIC_KEY;
    }
    async hasFlcFarm() {
        const state = await this.getState();
        return state.firstLossCapitalFarm !== lib_1.DEFAULT_PUBLIC_KEY;
    }
    /**
     * This will return an VaultHoldings object which contains the amount available (uninvested) in vault, total amount invested in reseves and a breakdown of the amount invested in each reserve
     * @returns an VaultHoldings object representing the amount available (uninvested) in vault, total amount invested in reseves and a breakdown of the amount invested in each reserve
     */
    async getVaultHoldings() {
        if (!this.state || !this.vaultReservesStateCache) {
            await this.reloadState();
            await this.reloadVaultReserves();
        }
        return await this.client.getVaultHoldings(this.state, undefined, this.vaultReservesStateCache, undefined);
    }
    /**
     * This will return the a map between reserve pubkey and the allocation overview for the reserve
     * @returns a map between reserve pubkey and the allocation overview for the reserve
     */
    async getVaultAllocations() {
        if (!this.state) {
            await this.reloadState();
        }
        return this.client.getVaultAllocations(this.state);
    }
    /**
     * This will return the APY of the vault based on the current invested amounts and the theoretical APY if all the available tokens were invested
     * @returns a struct containing actualAPY and theoreticalAPY for the vault
     */
    async getAPYs(slot) {
        if (!this.state || !this.vaultReservesStateCache) {
            await this.reloadState();
            await this.reloadVaultReserves();
        }
        const latestSlot = slot ?? (await this.client.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const actualApy = await this.client.getVaultActualAPY(this.state, latestSlot, this.vaultReservesStateCache);
        const theoreticalApy = await this.client.getVaultTheoreticalAPY(this.state, latestSlot, this.vaultReservesStateCache);
        return {
            actualAPY: actualApy,
            theoreticalAPY: theoreticalApy,
        };
    }
    /**
     * This method returns the exchange rate of the vault (tokens per share)
     * @returns - Decimal representing the exchange rate (tokens per share)
     */
    async getExchangeRate(slot) {
        if (!this.state || !this.vaultReservesStateCache) {
            await this.reloadState();
            await this.reloadVaultReserves();
        }
        const latestSlot = slot ?? (await this.client.getConnection().getSlot({ commitment: 'confirmed' }).send());
        const tokensPerShare = await this.client.getTokensPerShareSingleVault(this.state, latestSlot, this.vaultReservesStateCache);
        return tokensPerShare;
    }
    /**
     * This method returns the user shares balance for a given vault
     * @param user - user to calculate the shares balance for
     * @param vault - vault to calculate shares balance for
     * @returns - a struct of user share balance (staked in vault farm if the vault has a farm and unstaked) in decimal (not lamports)
     */
    async getUserShares(user) {
        return this.client.getUserSharesBalanceSingleVault(user, this);
    }
    /**
     * This function creates instructions to deposit into a vault. It will also create ATA creation instructions for the vault shares that the user receives in return
     * @param user - user to deposit
     * @param tokenAmount - token amount to be deposited, in decimals (will be converted in lamports)
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. Optional. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @param [memo] - optional memo string to append as a memo SPL instruction
     * @returns - an instance of DepositIxs which contains the instructions to deposit in vault and the instructions to stake the shares in the farm if the vault has a farm
     */
    async depositIxs(user, tokenAmount, vaultReservesMap, farmState, payer, memo) {
        if (vaultReservesMap) {
            this.vaultReservesStateCache = vaultReservesMap;
        }
        return this.client.depositIxs(user, this, tokenAmount, this.vaultReservesStateCache, farmState, payer, memo);
    }
    /**
     * This function will return the missing ATA creation instructions, as well as one or multiple withdraw instructions, based on how many reserves it's needed to withdraw from. This might have to be split in multiple transactions
     * @param user - user to withdraw
     * @param shareAmount - share amount to withdraw (in tokens, not lamports), in order to withdraw everything, any value > user share amount
     * @param slot - current slot, used to estimate the interest earned in the different reserves with allocation from the vault
     * @param [vaultReservesMap] - optional parameter; a hashmap from each reserve pubkey to the reserve state. If provided the function will be significantly faster as it will not have to fetch the reserves
     * @param [farmState] - the state of the vault farm, if the vault has a farm. Optional. If not provided, it will be fetched
     * @param [payer] - optional parameter to pass a different payer for ATA creation rent. If not provided, the user will be used
     * @returns an array of instructions to create missing ATAs if needed and the withdraw instructions
     */
    async withdrawIxs(user, shareAmount, slot, vaultReservesMap, farmState, payer) {
        if (vaultReservesMap) {
            this.vaultReservesStateCache = vaultReservesMap;
        }
        const currentSlot = slot ?? (await this.client.getConnection().getSlot({ commitment: 'confirmed' }).send());
        return this.client.withdrawIxs(user, this, shareAmount, currentSlot, this.vaultReservesStateCache, farmState, payer);
    }
}
exports.KaminoVault = KaminoVault;
/**
 * Used to initialize a Kamino Vault
 */
class KaminoVaultConfig {
    /** The admin of the vault */
    admin;
    /** The token mint for the vault */
    tokenMint;
    /** The token mint program id */
    tokenMintProgramId;
    /** The performance fee rate of the vault, as percents, expressed as a decimal */
    performanceFeeRatePercentage;
    /** The management fee rate of the vault, as percents, expressed as a decimal */
    managementFeeRatePercentage;
    /** The name to be stored on chain for the vault (max 40 characters). */
    name;
    /** The symbol of the vault token to be stored (max 5 characters). E.g. USDC for a vault using USDC as token. */
    vaultTokenSymbol;
    /** The name of the vault token to be stored (max 10 characters), after the prefix `Kamino Vault <vaultTokenSymbol>`. E.g. USDC Vault for a vault using USDC as token. */
    vaultTokenName;
    constructor(args) {
        this.admin = args.admin;
        this.tokenMint = args.tokenMint;
        this.performanceFeeRatePercentage = args.performanceFeeRatePercentage;
        this.managementFeeRatePercentage = args.managementFeeRatePercentage;
        this.tokenMintProgramId = args.tokenMintProgramId;
        this.name = args.name;
        this.vaultTokenSymbol = args.vaultTokenSymbol;
        this.vaultTokenName = args.vaultTokenName;
    }
    getPerformanceFeeBps() {
        return this.performanceFeeRatePercentage.mul(100).toNumber();
    }
    getManagementFeeBps() {
        return this.managementFeeRatePercentage.mul(100).toNumber();
    }
}
exports.KaminoVaultConfig = KaminoVaultConfig;
class ReserveAllocationConfig {
    reserve;
    targetAllocationWeight;
    allocationCapDecimal;
    constructor(reserve, targetAllocationWeight, allocationCapDecimal) {
        this.reserve = reserve;
        this.targetAllocationWeight = targetAllocationWeight;
        this.allocationCapDecimal = allocationCapDecimal;
    }
    getAllocationCapLamports() {
        return (0, utils_1.numberToLamportsDecimal)(this.allocationCapDecimal, this.reserve.state.liquidity.mintDecimals.toNumber());
    }
    getReserveState() {
        return this.reserve.state;
    }
    getReserveAddress() {
        return this.reserve.address;
    }
}
exports.ReserveAllocationConfig = ReserveAllocationConfig;
async function getCTokenVaultPda(vaultAddress, reserveAddress, kaminoVaultProgramId) {
    return (await (0, kit_1.getProgramDerivedAddress)({
        seeds: [
            Buffer.from(CTOKEN_VAULT_SEED),
            addressEncoder.encode(vaultAddress),
            addressEncoder.encode(reserveAddress),
        ],
        programAddress: kaminoVaultProgramId,
    }))[0];
}
async function getEventAuthorityPda(kaminoVaultProgramId) {
    return (await (0, kit_1.getProgramDerivedAddress)({
        seeds: [Buffer.from(EVENT_AUTHORITY_SEED)],
        programAddress: kaminoVaultProgramId,
    }))[0];
}
async function getKvaultGlobalConfigPda(kaminoVaultProgramId) {
    return (await (0, kit_1.getProgramDerivedAddress)({
        seeds: [Buffer.from(GLOBAL_CONFIG_STATE_SEED)],
        programAddress: kaminoVaultProgramId,
    }))[0];
}
async function getReserveWhitelistEntryPda(reserveAddress, kaminoVaultProgramId) {
    return (await (0, kit_1.getProgramDerivedAddress)({
        seeds: [Buffer.from(WHITELISTED_RESERVES_SEED), addressEncoder.encode(reserveAddress)],
        programAddress: kaminoVaultProgramId,
    }))[0];
}
async function getReserveWhitelistEntryIfExists(reserveAddress, rpc, kaminoVaultProgramId) {
    const reserveWhitelistEntry = await getReserveWhitelistEntryPda(reserveAddress, kaminoVaultProgramId);
    const reserveWhitelistEntryAccount = await (0, kit_1.fetchEncodedAccount)(rpc, reserveWhitelistEntry, {
        commitment: 'processed',
    });
    return reserveWhitelistEntryAccount.exists ? (0, kit_1.some)(reserveWhitelistEntry) : (0, kit_1.none)();
}
async function getReservesWhitelistPDAs(reserves, kaminoVaultProgramId) {
    return Promise.all(reserves.map((reserve) => getReserveWhitelistEntryPda(reserve, kaminoVaultProgramId)));
}
function deduplicateVaults(vaults) {
    const seen = new Set();
    return vaults.filter((vault) => {
        if (seen.has(vault.address)) {
            return false;
        }
        seen.add(vault.address);
        return true;
    });
}
function parseVaultAdmin(vault, signer) {
    return signer ?? (0, signer_1.noopSigner)(vault.vaultAdminAuthority);
}
function parseVaultPendingAdmin(vault, signer) {
    return signer ?? (0, signer_1.noopSigner)(vault.pendingAdmin);
}
class VaultHoldings {
    available;
    invested;
    investedInReserves;
    pendingFees;
    totalAUMIncludingFees;
    constructor(params) {
        this.available = params.available;
        this.invested = params.invested;
        this.investedInReserves = params.investedInReserves;
        this.pendingFees = params.pendingFees;
        this.totalAUMIncludingFees = params.totalAUMIncludingFees;
    }
    asJSON() {
        return {
            available: this.available.toString(),
            invested: this.invested.toString(),
            totalAUMIncludingFees: this.totalAUMIncludingFees.toString(),
            pendingFees: this.pendingFees.toString(),
            investedInReserves: (0, utils_1.pubkeyHashMapToJson)(this.investedInReserves),
        };
    }
    print() {
        console.log('Holdings:');
        console.log('  Available:', this.available.toString());
        console.log('  Invested:', this.invested.toString());
        console.log('  Total AUM including fees:', this.totalAUMIncludingFees.toString());
        console.log('  Pending fees:', this.pendingFees.toString());
        console.log('  Invested in reserves:', (0, utils_1.pubkeyHashMapToJson)(this.investedInReserves));
    }
}
exports.VaultHoldings = VaultHoldings;
//# sourceMappingURL=vault.js.map
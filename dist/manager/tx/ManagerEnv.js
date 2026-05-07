"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerEnv = void 0;
exports.initEnv = initEnv;
const ManagerConnectionPool_1 = require("./ManagerConnectionPool");
const programId_1 = require("../../@codegen/klend/programId");
const programId_2 = require("../../@codegen/kvault/programId");
const programId_3 = require("@kamino-finance/farms-sdk/dist/@codegen/farms/programId");
const constants_1 = require("../../utils/constants");
const keypair_1 = require("./keypair");
const farm_utils_1 = require("../../classes/farm_utils");
const consts_1 = require("../utils/consts");
class ManagerEnv {
    c;
    cluster;
    signerConfig;
    klendProgramId;
    kvaultProgramId;
    farmsProgramId;
    farmsGlobalConfig;
    constructor(c, cluster, signerConfig, klendProgramId, kvaultProgramId, farmsProgramId, farmsGlobalConfig) {
        this.c = c;
        this.cluster = cluster;
        this.signerConfig = signerConfig;
        this.klendProgramId = klendProgramId;
        this.kvaultProgramId = kvaultProgramId;
        this.farmsProgramId = farmsProgramId;
        this.farmsGlobalConfig = farmsGlobalConfig;
    }
    async getSigner({ market, useLendingMarketOwnerCached, vaultState, useVaultPendingAdmin, useVaultAllocationAdmin, } = {}) {
        function matchesAdmin(config, a) {
            return config.admin !== undefined && config.admin.address === a;
        }
        if (vaultState) {
            if (useVaultPendingAdmin) {
                return matchesAdmin(this.signerConfig, vaultState.pendingAdmin)
                    ? this.signerConfig.admin
                    : (0, keypair_1.noopSigner)(vaultState.pendingAdmin);
            }
            else if (useVaultAllocationAdmin) {
                return matchesAdmin(this.signerConfig, vaultState.allocationAdmin)
                    ? this.signerConfig.admin
                    : (0, keypair_1.noopSigner)(vaultState.allocationAdmin);
            }
            else {
                return matchesAdmin(this.signerConfig, vaultState.vaultAdminAuthority)
                    ? this.signerConfig.admin
                    : (0, keypair_1.noopSigner)(vaultState.vaultAdminAuthority);
            }
        }
        else if (market) {
            if (useLendingMarketOwnerCached) {
                return matchesAdmin(this.signerConfig, market.state.lendingMarketOwnerCached)
                    ? this.signerConfig.admin
                    : (0, keypair_1.noopSigner)(market.state.lendingMarketOwnerCached);
            }
            else {
                return matchesAdmin(this.signerConfig, market.state.lendingMarketOwner)
                    ? this.signerConfig.admin
                    : (0, keypair_1.noopSigner)(market.state.lendingMarketOwner);
            }
        }
        else if (this.signerConfig.admin) {
            return this.signerConfig.admin;
        }
        else if (this.signerConfig.multisigSigner) {
            return this.signerConfig.multisigSigner;
        }
        throw new Error(`No signer in config ${JSON.stringify(this.signerConfig)}`);
    }
}
exports.ManagerEnv = ManagerEnv;
function resolveProgramId(explicit, ids, staging, devnet) {
    if (explicit)
        return explicit;
    if (staging)
        return ids.staging;
    if (devnet && ids.devnet)
        return ids.devnet;
    return ids.mainnet;
}
function defaultProgramConfig(programConfig) {
    const staging = programConfig.staging ?? false;
    const devnet = programConfig.devnet ?? false;
    return {
        staging,
        devnet,
        klendProgramId: resolveProgramId(programConfig.klendProgramId, {
            staging: constants_1.STAGING_PROGRAM_ID,
            mainnet: programId_1.PROGRAM_ID,
            devnet: programId_1.PROGRAM_ID,
        }, staging, devnet),
        kvaultProgramId: resolveProgramId(programConfig.kvaultProgramId, {
            staging: consts_1.KVAULT_STAGING_PROGRAM_ID,
            devnet: consts_1.KVAULT_DEVNET_PROGRAM_ID,
            mainnet: programId_2.PROGRAM_ID,
        }, staging, devnet),
        farmsProgramId: resolveProgramId(programConfig.farmsProgramId, {
            staging: consts_1.FARMS_STAGING_PROGRAM_ID,
            devnet: consts_1.FARMS_DEVNET_PROGRAM_ID,
            mainnet: programId_3.PROGRAM_ID,
        }, staging, devnet),
        farmsGlobalConfig: resolveProgramId(programConfig.farmsGlobalConfig, {
            staging: farm_utils_1.FARMS_GLOBAL_CONFIG_MAINNET,
            devnet: farm_utils_1.FARMS_GLOBAL_CONFIG_DEVNET,
            mainnet: farm_utils_1.FARMS_GLOBAL_CONFIG_MAINNET,
        }, staging, devnet),
    };
}
async function initEnv(staging = false, multisig = undefined, adminKeypairPath = undefined, rpcUrl = undefined, devnet = false) {
    if (staging && devnet) {
        throw new Error('Cannot use both --staging and --devnet at the same time');
    }
    const config = defaultProgramConfig({
        staging,
        devnet,
    });
    let resolvedUrl;
    if (rpcUrl) {
        resolvedUrl = rpcUrl;
    }
    else if (devnet && process.env.RPC_DEVNET) {
        resolvedUrl = process.env.RPC_DEVNET;
    }
    else if (process.env.RPC) {
        resolvedUrl = process.env.RPC;
    }
    else {
        throw 'Must specify an RPC URL';
    }
    const resolvedAdminPath = adminKeypairPath ?? (devnet ? process.env.ADMIN_DEVNET : process.env.ADMIN);
    let resolvedAdmin = undefined;
    if (resolvedAdminPath) {
        resolvedAdmin = await (0, keypair_1.parseKeypairFile)(resolvedAdminPath);
    }
    const rpcChain = parseRpcChain(resolvedUrl, devnet);
    const c = new ManagerConnectionPool_1.ManagerConnectionPool(rpcChain);
    const multisigSigner = multisig ? (0, keypair_1.noopSigner)(multisig) : undefined;
    const env = new ManagerEnv(c, rpcChain.name, {
        admin: resolvedAdmin,
        multisigSigner,
    }, config.klendProgramId, config.kvaultProgramId, config.farmsProgramId, config.farmsGlobalConfig);
    console.log('\nSettings ⚙️');
    console.log(`Multisig: ${multisig}`);
    console.log(`Multisig signer: ${multisigSigner?.address}`);
    console.log(`Admin: ${resolvedAdmin?.address}`);
    console.log(`Rpc: ${resolvedUrl}`);
    console.log(`klendProgramId: ${env.klendProgramId}`);
    console.log(`kvaultProgramId: ${env.kvaultProgramId}`);
    return env;
}
function parseRpcChain(rpcUrl, devnet = false) {
    let chain;
    if (rpcUrl === 'localnet') {
        chain = {
            name: 'localnet',
            endpoint: {
                url: 'http://127.0.0.1:8899',
                name: 'localnet',
            },
            wsEndpoint: {
                name: 'localnet',
                url: 'ws://127.0.0.1:8900',
            },
            multicastEndpoints: [],
        };
    }
    else if (devnet) {
        chain = {
            name: 'devnet',
            endpoint: {
                url: rpcUrl,
                name: 'devnet',
            },
            wsEndpoint: {
                url: rpcUrl.replace('https:', 'wss:'),
                name: 'devnet-ws',
            },
            multicastEndpoints: [],
        };
    }
    else {
        chain = {
            name: 'mainnet-beta',
            endpoint: {
                url: rpcUrl,
                name: 'mainnet-beta',
            },
            wsEndpoint: {
                url: rpcUrl.replace('https:', 'wss:') + '/whirligig',
                name: 'mainnet-beta-ws',
            },
            multicastEndpoints: [],
        };
    }
    return chain;
}
//# sourceMappingURL=ManagerEnv.js.map
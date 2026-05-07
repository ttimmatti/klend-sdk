"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliEnv = exports.sendTxModes = void 0;
exports.parseEnv = parseEnv;
exports.initEnv = initEnv;
const kit_1 = require("@solana/kit");
const CliConnectionPool_1 = require("./CliConnectionPool");
const programId_1 = require("../../@codegen/klend/programId");
const programId_2 = require("@kamino-finance/farms-sdk/dist/@codegen/farms/programId");
const constants_1 = require("../../utils/constants");
const keypair_1 = require("./keypair");
const farm_utils_1 = require("../../classes/farm_utils");
const consts_1 = require("../../manager/utils/consts");
exports.sendTxModes = ['execute', 'simulate', 'multisig', 'print'];
class CliEnv {
    c;
    cluster;
    env;
    signerConfig;
    klendProgramId;
    farmsProgramId;
    farmsGlobalConfig;
    constructor(c, cluster, env, signerConfig, klendProgramId, farmsProgramId, farmsGlobalConfig) {
        this.c = c;
        this.cluster = cluster;
        this.env = env;
        this.signerConfig = signerConfig;
        this.klendProgramId = klendProgramId;
        this.farmsProgramId = farmsProgramId;
        this.farmsGlobalConfig = farmsGlobalConfig;
    }
    async getSigner(market) {
        if (this.signerConfig.multisig) {
            if (market) {
                return (0, keypair_1.noopSigner)(market.state.lendingMarketOwner);
            }
            else if (process.env.MULTISIG) {
                return (0, keypair_1.noopSigner)((0, kit_1.address)(process.env.MULTISIG));
            }
            else {
                throw new Error('Multisig signer could not be detected consider setting the MULTISIG env var');
            }
        }
        if (this.signerConfig.admin) {
            return this.signerConfig.admin;
        }
        else if (market) {
            return (0, keypair_1.noopSigner)(market.state.lendingMarketOwner);
        }
        else if (process.env.MULTISIG) {
            return (0, keypair_1.noopSigner)((0, kit_1.address)(process.env.MULTISIG));
        }
        throw new Error(`No signer in config ${JSON.stringify(this.signerConfig)}`);
    }
}
exports.CliEnv = CliEnv;
function parseEnv(env) {
    if (!env || env === 'mainnet-beta') {
        return 'mainnet-beta';
    }
    if (env === 'staging') {
        return 'staging';
    }
    if (env === 'devnet') {
        return 'devnet';
    }
    throw new Error(`Invalid --env value: '${env}'. Must be one of: mainnet-beta, staging, devnet`);
}
function defaultProgramConfig(env, programConfig) {
    const isStaging = env === 'staging';
    const isDevnet = env === 'devnet';
    return {
        env,
        klendProgramId: programConfig?.klendProgramId ??
            envAddress(isStaging ? 'KLEND_PROGRAM_ID_STAGING' : 'KLEND_PROGRAM_ID_MAINNET') ??
            (isStaging ? constants_1.STAGING_PROGRAM_ID : programId_1.PROGRAM_ID),
        farmsProgramId: programConfig?.farmsProgramId ??
            (isStaging ? consts_1.FARMS_STAGING_PROGRAM_ID : isDevnet ? consts_1.FARMS_DEVNET_PROGRAM_ID : programId_2.PROGRAM_ID),
        farmsGlobalConfig: programConfig?.farmsGlobalConfig ?? (isDevnet ? farm_utils_1.FARMS_GLOBAL_CONFIG_DEVNET : farm_utils_1.FARMS_GLOBAL_CONFIG_MAINNET),
    };
}
async function initEnv(env, adminKeypairPath, multisig = false, programConfig, rpcUrl) {
    const isDevnet = env === 'devnet';
    const config = defaultProgramConfig(env, programConfig);
    let resolvedUrl;
    if (rpcUrl) {
        resolvedUrl = rpcUrl;
    }
    else if (isDevnet && process.env.RPC_DEVNET) {
        resolvedUrl = process.env.RPC_DEVNET;
    }
    else if (process.env.RPC) {
        resolvedUrl = process.env.RPC;
    }
    else {
        throw new Error('Must specify an RPC URL (provide --rpc, or set RPC/RPC_DEVNET env var)');
    }
    const resolvedAdminPath = adminKeypairPath ?? (isDevnet ? process.env.ADMIN_DEVNET : process.env.ADMIN);
    let resolvedAdmin = undefined;
    if (resolvedAdminPath) {
        resolvedAdmin = await (0, keypair_1.parseKeypairFile)(resolvedAdminPath);
    }
    const rpcChain = parseRpcChain(resolvedUrl, isDevnet);
    const c = new CliConnectionPool_1.CliConnectionPool(rpcChain);
    const cliEnv = new CliEnv(c, rpcChain.name, env, {
        admin: resolvedAdmin,
        multisig,
    }, config.klendProgramId, config.farmsProgramId, config.farmsGlobalConfig);
    console.log('\nSettings ⚙️');
    console.log(`Env: ${env}`);
    console.log(`Multisig: ${multisig}`);
    console.log(`Cluster: ${cliEnv.cluster}`);
    console.log(`Rpc: ${resolvedUrl}`);
    console.log(`klendProgramId: ${cliEnv.klendProgramId}`);
    console.log(`farmsProgramId: ${cliEnv.farmsProgramId}`);
    console.log(`Admin: ${resolvedAdmin?.address}`);
    return cliEnv;
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
function envAddress(envVar) {
    if (process.env[envVar]) {
        return (0, kit_1.address)(process.env[envVar]);
    }
    return undefined;
}
//# sourceMappingURL=CliEnv.js.map
import { Address, TransactionSigner } from '@solana/kit';
import { CliConnectionPool } from './CliConnectionPool';
import { KaminoMarket } from '../../classes';
export type Cluster = 'localnet' | 'devnet' | 'mainnet-beta';
export type Env = 'mainnet-beta' | 'staging' | 'devnet';
export declare const sendTxModes: readonly ["execute", "simulate", "multisig", "print"];
export type SendTxMode = (typeof sendTxModes)[number];
export type SignerConfig = {
    multisig: boolean;
    admin?: TransactionSigner;
};
export type ProgramConfig = {
    klendProgramId?: Address;
    farmsProgramId?: Address;
    farmsGlobalConfig?: Address;
};
export declare class CliEnv {
    c: CliConnectionPool;
    cluster: Cluster;
    env: Env;
    signerConfig: SignerConfig;
    klendProgramId: Address;
    farmsProgramId: Address;
    farmsGlobalConfig: Address;
    constructor(c: CliConnectionPool, cluster: Cluster, env: Env, signerConfig: SignerConfig, klendProgramId: Address, farmsProgramId: Address, farmsGlobalConfig: Address);
    getSigner(market?: KaminoMarket): Promise<TransactionSigner>;
}
export declare function parseEnv(env: string | undefined): Env;
export declare function initEnv(env: Env, adminKeypairPath?: string, multisig?: boolean, programConfig?: ProgramConfig, rpcUrl?: string): Promise<CliEnv>;
//# sourceMappingURL=CliEnv.d.ts.map
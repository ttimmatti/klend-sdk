import BN from 'bn.js';
import { CliEnv, SendTxMode } from '../tx/CliEnv';
import { Address } from '@solana/kit';
export declare function withdraw(env: CliEnv, mode: SendTxMode, token: string, withdrawAmount: BN, marketAddress: Address): Promise<void>;
//# sourceMappingURL=withdraw.d.ts.map
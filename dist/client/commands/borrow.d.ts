import BN from 'bn.js';
import { CliEnv, SendTxMode } from '../tx/CliEnv';
import { Address } from '@solana/kit';
export declare function borrow(env: CliEnv, mode: SendTxMode, token: string, borrowAmount: BN, marketAddress: Address): Promise<void>;
//# sourceMappingURL=borrow.d.ts.map
import { Address, GetProgramAccountsApi, Rpc } from '@solana/kit';
import { LendingMarket, Obligation, Reserve } from '../@codegen/klend/accounts';
export declare function getAllObligationAccounts(connection: Rpc<GetProgramAccountsApi>, programId?: Address): AsyncGenerator<[Address, Obligation], void, unknown>;
export declare function getAllReserveAccounts(rpc: Rpc<GetProgramAccountsApi>, programId?: Address): AsyncGenerator<[Address, Reserve], void, unknown>;
export declare function getAllLendingMarketAccounts(connection: Rpc<GetProgramAccountsApi>, programId?: Address): AsyncGenerator<[Address, LendingMarket], void, unknown>;
//# sourceMappingURL=accountListing.d.ts.map
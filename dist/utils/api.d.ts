import { Address } from '@solana/kit';
import { ConfigType } from '../classes';
import { Logger, LogLevel } from './Logger';
export type ApiRequestOptions = {
    programId?: Address;
    source?: 'API' | 'CDN';
    apiBaseUrl?: string;
};
export type ApiFilterOptions = {
    isCurated?: boolean;
};
export type ApiLoggerOptions = {
    logger?: Logger;
    errorLevel?: LogLevel;
};
export type MarketsApiRequest = {
    api?: ApiRequestOptions;
    filter?: ApiFilterOptions;
    log?: ApiLoggerOptions;
};
/**
 * Fetch config from the API
 * A good place to start to find active klend markets without expensive RPC calls
 *
 * @param programId - The program id to retrieve config for
 * @param source - CDN is a json file hosted in the cloud, API is a webserver
 * @param apiBaseUrl - Optional base URL for the API, if not provided, defaults to the standard API endpoint, not used for CDN
 * @param filterOptions - Config options to filter markets by
 * @param logger - pass a custom logger instance to log retries
 * @param errorLevel - retry log level, NONE for no logs
 */
export declare function getMarketsFromApi({ api: { programId, source, apiBaseUrl }, filter: filterOptions, log: { logger, errorLevel }, }?: MarketsApiRequest): Promise<ConfigType>;
//# sourceMappingURL=api.d.ts.map
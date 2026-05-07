"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketsFromApi = getMarketsFromApi;
const axios_1 = __importDefault(require("axios"));
const classes_1 = require("../classes");
const utils_1 = require("../utils");
const exponential_backoff_1 = require("exponential-backoff");
const lib_1 = require("../lib");
const Logger_1 = require("./Logger");
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
async function getMarketsFromApi({ api: { programId = lib_1.PROGRAM_ID, source = 'CDN', apiBaseUrl } = {}, filter: filterOptions = {}, log: { logger = console, errorLevel = Logger_1.LogLevel.WARN } = {}, } = {}) {
    let unfilteredConfigs = {};
    if (source === 'CDN') {
        unfilteredConfigs = (await (0, exponential_backoff_1.backOff)(() => axios_1.default.get(`${utils_1.CDN_ENDPOINT}/kamino_lend_config_v3.json`), getKaminoCdnRetry(logger, errorLevel))).data[programId.toString()];
    }
    if (!unfilteredConfigs || (0, classes_1.isEmptyObject)(unfilteredConfigs)) {
        const API_ENDPOINT = (0, utils_1.getApiEndpoint)(programId, apiBaseUrl);
        unfilteredConfigs = (await (0, exponential_backoff_1.backOff)(() => axios_1.default.get(API_ENDPOINT), getKaminoApiRetry(logger, errorLevel, API_ENDPOINT))).data;
    }
    return unfilteredConfigs.filter((c) => {
        if (filterOptions.isCurated !== undefined) {
            return c.isCurated === filterOptions.isCurated;
        }
        return true;
    });
}
function getKaminoCdnRetry(logger, errorLevel) {
    return {
        maxDelay: 1000,
        numOfAttempts: 3,
        startingDelay: 10,
        retry: (e, attemptNumber) => {
            log(logger, errorLevel, `kamino CDN call #${attemptNumber} failed, retrying with exponential backoff...`, e);
            return true;
        },
    };
}
function getKaminoApiRetry(logger, errorLevel, apiUrl) {
    return {
        maxDelay: 1000,
        numOfAttempts: 3,
        startingDelay: 10,
        retry: (e, attemptNumber) => {
            log(logger, errorLevel, `${apiUrl} call #${attemptNumber} failed, retrying with exponential backoff...`, e);
            return true;
        },
    };
}
function log(logger, errorLevel, msg, ...meta) {
    if (errorLevel !== Logger_1.LogLevel.NONE) {
        logger[errorLevel](msg, ...meta);
    }
}
//# sourceMappingURL=api.js.map
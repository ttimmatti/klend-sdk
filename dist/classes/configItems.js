"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntireReserveConfigUpdater = exports.PriorityOrderedConfigUpdater = exports.ConfigUpdater = exports.ConfigItemUpdater = exports.CompositeConfigItem = void 0;
exports.arrayElementConfigItems = arrayElementConfigItems;
exports.encodeUsingLayout = encodeUsingLayout;
const borsh_1 = require("@coral-xyz/borsh");
const utils_1 = require("./utils");
const buffer_1 = require("buffer");
const types_1 = require("../@codegen/klend/types");
/**
 * A composite {@link ConfigItem}, allowing to encode multiple fields together.
 *
 * @example
 * ```
 *   ...
 *   [CartoonsUpdateMode.UpdateTomAndJerry.discriminator]: new CompositeConfigItem(
 *     CARTOONS.value().characters.cats.tom,
 *     CARTOONS.value().characters.rodents.jerry
 *   ),
 *   ...
 * ```
 */
class CompositeConfigItem {
    __layout;
    __getter;
    constructor(...components) {
        this.__layout = (0, borsh_1.struct)(components.map((component, index) => component.__layout.replicate(index.toString())));
        this.__getter = (config) => Object.fromEntries(components.map((component, index) => [index.toString(), component.__getter(config)]));
    }
}
exports.CompositeConfigItem = CompositeConfigItem;
/**
 * Creates an array of config items - one per each element of the given array.
 *
 * An example use-case is `LendingMarket.elevationGroups[]`: to update all of them, we need N ixs:
 * - `updateLendingMarket(mode = ElevationGroup, value = elevationGroups[0])`
 * - `updateLendingMarket(mode = ElevationGroup, value = elevationGroups[1])`
 * - `updateLendingMarket(mode = ElevationGroup, value = elevationGroups[2])`
 * ...
 *
 * So: conceptually, the *array* is not "a config item". Each *slot* in that array is its own config item.
 */
function arrayElementConfigItems(arrayConfigItem) {
    const arrayGetter = arrayConfigItem.__getter;
    const wrappedSequenceLayout = arrayConfigItem.__layout;
    const sequenceLayout = wrappedSequenceLayout.layout?.fields?.[0];
    if (sequenceLayout === undefined) {
        throw new Error(`unexpected layout of the input array config item: ${(0, utils_1.toJson)(wrappedSequenceLayout, true)}`);
    }
    return new Array(sequenceLayout.count)
        .fill(sequenceLayout.elementLayout)
        .map((elementLayout, index) => ({
        __layout: elementLayout,
        __getter: (config) => arrayGetter(config)[index],
    }));
}
/**
 * A part of a {@link ConfigUpdater} responsible for a single config item.
 */
class ConfigItemUpdater {
    item;
    constructor(item) {
        this.item = item;
    }
    /**
     * Returns a serialized value of the specific config item extracted from the given top-level {@code newConfig}, or
     * `undefined` if the value has not changed from the given {@code currentConfig}.
     */
    encodeUpdatedItemFrom(currentConfig, newConfig) {
        const getter = this.item.__getter;
        const newItemValue = this.encodeItem(getter(newConfig));
        if (currentConfig === undefined) {
            return newItemValue;
        }
        if ((0, utils_1.blobEquals)(newItemValue, this.encodeItem(getter(currentConfig)))) {
            return undefined;
        }
        return newItemValue;
    }
    /**
     * Borsh-serializes the given value.
     *
     * Only exposed for some legacy callers which still construct the update ixs manually (in tests).
     */
    encodeItem(item) {
        return encodeUsingLayout(this.item.__layout, item);
    }
}
exports.ConfigItemUpdater = ConfigItemUpdater;
/**
 * A resolver of config item changes.
 */
class ConfigUpdater {
    itemUpdaters;
    /**
     * A resolving constructor.
     *
     * The inputs:
     * - `fromDecoded`: a reference to the codegen'ed enum-decoding function, e.g. `UpdateConfigMode.fromDecoded`. Needed
     *   to turn the `<enumClass>.kind` strings into enums (i.e. instances of `M`).
     * - `configClass`: a reference to the codegen'ed top-level config class, e.g. `ReserveConfig`. Need to create a
     *    completion helper for the `itemMapBuilder`.
     * - `itemMapBuilder`: a function building a {@link ConfigItemMap} using the completion helper provided as its
     *    argument, e.g. `(config) => ({[UpdateLendingMarketMode.UpdateImmutableFlag.kind]: config.immutable, ...})`.
     *
     * See the usage example at {@link ConfigItemMap}.
     */
    constructor(fromDecoded, configClass, itemMapBuilder) {
        this.itemUpdaters = new Map(Object.entries(itemMapBuilder(wrap(configClass))).map(([kind, itemOrArray]) => [
            kind,
            [
                fromDecoded({ [kind]: {} }),
                toArray(itemOrArray).map((item) => new ConfigItemUpdater(item)),
            ],
        ]));
    }
    /**
     * Returns all changes between the given current and new configs - in particular, this will be *all* supported fields'
     * changes if the previous config does not exist.
     *
     * Please note that more than one {@link EncodedConfigUpdate}s can be associated with a single `M` enum value (in
     * cases where e.g. an array property is updated by individual updates of its elements).
     */
    encodeAllUpdates(currentConfig, newConfig) {
        const updates = [];
        for (const [mode, itemUpdaters] of this.itemUpdaters.values()) {
            for (const itemUpdater of itemUpdaters) {
                const value = itemUpdater.encodeUpdatedItemFrom(currentConfig, newConfig);
                if (value === undefined) {
                    continue;
                }
                updates.push({ mode, value });
            }
        }
        return updates;
    }
    /**
     * Gets the single updater of the given config item.
     *
     * Throws an error if the updates are not supported (e.g. for deprecated modes) or if the given item is handled by
     * multiple updaters (e.g. for an array property) - to handle these cases, use {@link allForMode()}.
     */
    forMode(mode) {
        const itemUpdaters = this.allForMode(mode);
        switch (itemUpdaters.length) {
            case 0:
                throw new Error(`updates not supported (updaters for ${mode.kind} were explicitly set to [])`);
            case 1:
                return itemUpdaters[0];
            default:
                throw new Error(`${mode.kind} defines multiple (${itemUpdaters.length}) updaters`);
        }
    }
    /**
     * Gets all the updaters of the given config item.
     *
     * This may be an empty array (e.g. for deprecated modes), or multiple elements (e.g. if an array property is updated
     * by individual updates of its elements). If you expect a single updater, use {@link forMode()}.
     */
    allForMode(mode) {
        const [_mode, itemUpdaters] = this.itemUpdaters.get(mode.kind) ??
            (0, utils_1.orThrow)(`updaters for ${mode.kind} were not set (should not be possible, due to type-safety)`);
        return itemUpdaters;
    }
}
exports.ConfigUpdater = ConfigUpdater;
/**
 * A ConfigUpdater wrapper that returns updates in priority order from `encodeAllUpdates`.
 */
class PriorityOrderedConfigUpdater {
    updater;
    constructor(updater) {
        this.updater = updater;
    }
    encodeAllUpdates(currentConfig, newConfig, priorityOf) {
        const updates = this.updater.encodeAllUpdates(currentConfig, newConfig);
        return [...updates].sort((left, right) => priorityOf(left.mode) - priorityOf(right.mode));
    }
}
exports.PriorityOrderedConfigUpdater = PriorityOrderedConfigUpdater;
/** Reserve config fields have cross-dependencies with each other.
 *
 * When several fields must be updated at once, this will ensure
 * all intermediary states are valid.
 */
class EntireReserveConfigUpdater extends ConfigUpdater {
    constructor(itemMapBuilder) {
        super(types_1.UpdateConfigMode.fromDecoded, types_1.ReserveConfig, itemMapBuilder);
    }
    encodeAllUpdates(currentConfig, newConfig) {
        const updates = super.encodeAllUpdates(currentConfig, newConfig);
        // Determine if liquidation threshold is increasing (affects LTV/LiquidationThreshold ordering)
        const currentLiquidationThreshold = currentConfig ? currentConfig.liquidationThresholdPct : 0;
        updates.sort((left, right) => {
            if (newConfig.liquidationThresholdPct > currentLiquidationThreshold) {
                return priorityOf(left.mode, true) - priorityOf(right.mode, true);
            }
            return priorityOf(left.mode) - priorityOf(right.mode);
        });
        return updates;
    }
}
exports.EntireReserveConfigUpdater = EntireReserveConfigUpdater;
/**
 * Borsh-serializes the given value according to the given layout.
 *
 * Only exposed for some legacy callers which still construct the update ixs manually (in tests).
 */
function encodeUsingLayout(layout, value) {
    const buffer = buffer_1.Buffer.alloc(layout.span);
    const length = layout.encode(value, buffer, 0);
    if (length !== layout.span) {
        throw new Error(`layout span declared incorrect length ${layout.span}; got ${length}`);
    }
    return Uint8Array.from(buffer);
}
// Only internals below:
function wrap(configClass) {
    return withPotentialChildren({
        __layout: typeof configClass.layout === 'function' ? configClass.layout() : configClass.layout,
        __getter: (config) => config,
    });
}
function wrapChild(layout, parent) {
    return withPotentialChildren({
        __layout: layout,
        __getter: (config) => parent.__getter(config)[layout.property],
    });
}
function withPotentialChildren(item) {
    for (const fieldLayout of item.__layout.fields ?? []) {
        const structItem = item;
        structItem[fieldLayout.property] = wrapChild(fieldLayout, structItem);
    }
    return item;
}
function toArray(singleOrArray) {
    return Array.isArray(singleOrArray) ? singleOrArray : [singleOrArray];
}
// Lowest priority gets updated first
function priorityOf(mode, liquidationThresholdIncreasing = false) {
    switch (mode.discriminator) {
        case types_1.UpdateConfigMode.UpdateScopePriceFeed.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoScopeTwap.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoScopeChain.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoLowerHeuristic.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoUpperHeuristic.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoExpHeuristic.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoTwapDivergence.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoName.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoPriceMaxAge.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateTokenInfoTwapMaxAge.discriminator:
            return 0;
        case types_1.UpdateConfigMode.UpdateDeleveragingBonusIncreaseBpsPerDay.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateAutodeleverageEnabled()) - 1;
        case types_1.UpdateConfigMode.UpdateDeleveragingMarginCallPeriod.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateAutodeleverageEnabled()) - 1;
        case types_1.UpdateConfigMode.UpdateDeleveragingThresholdDecreaseBpsPerDay.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateAutodeleverageEnabled()) - 1;
        case types_1.UpdateConfigMode.UpdateAutodeleverageEnabled.discriminator:
            return 4;
        case types_1.UpdateConfigMode.UpdateLoanToValuePct.discriminator:
            return 11;
        // LiquidationThreshold >= LTV must always hold
        // If liquidation threshold is increasing, update it first
        // All other cases, we update LTV first
        case types_1.UpdateConfigMode.UpdateLiquidationThresholdPct.discriminator:
            return priorityOf(new types_1.UpdateConfigMode.UpdateLoanToValuePct()) + (liquidationThresholdIncreasing ? -1 : 1);
        // Always update last bc we cannot skip validation
        case types_1.UpdateConfigMode.UpdateDepositLimit.discriminator:
            return 63;
        case types_1.UpdateConfigMode.UpdateBorrowLimit.discriminator:
            return 63;
        default:
            return 10;
    }
}
//# sourceMappingURL=configItems.js.map
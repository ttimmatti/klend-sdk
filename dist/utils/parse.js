"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBooleanFlag = parseBooleanFlag;
/**
 * Parses a boolean-like string value ("true", "false", "1", "0") into a number (0 or 1).
 * Used for vault configuration flags like whitelist settings.
 *
 * @param value - The string value to parse (case-insensitive)
 * @returns 1 for truthy values ("true" or "1"), 0 for falsy values ("false" or "0")
 * @throws Error if the value is not one of the expected values
 */
function parseBooleanFlag(value) {
    const normalizedValue = value.toLowerCase();
    if (normalizedValue === 'true' || normalizedValue === '1') {
        return 1;
    }
    else if (normalizedValue === 'false' || normalizedValue === '0') {
        return 0;
    }
    else {
        throw new Error(`Invalid value '${value}'. Expected 'true', 'false', '1', or '0'.`);
    }
}
//# sourceMappingURL=parse.js.map
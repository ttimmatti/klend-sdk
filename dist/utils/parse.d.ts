/**
 * Parses a boolean-like string value ("true", "false", "1", "0") into a number (0 or 1).
 * Used for vault configuration flags like whitelist settings.
 *
 * @param value - The string value to parse (case-insensitive)
 * @returns 1 for truthy values ("true" or "1"), 0 for falsy values ("false" or "0")
 * @throws Error if the value is not one of the expected values
 */
export declare function parseBooleanFlag(value: string): number;
//# sourceMappingURL=parse.d.ts.map
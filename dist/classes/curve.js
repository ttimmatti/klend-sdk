"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURVE_POINTS_LENGTH = void 0;
exports.newFlat = newFlat;
exports.padPoints = padPoints;
exports.trimPoints = trimPoints;
const types_1 = require("../@codegen/klend/types");
exports.CURVE_POINTS_LENGTH = 11;
/**
 * Create a new curve with a flat borrow rate
 * Useful for testing
 * @param borrowRateBps - the flat borrow rate in bps
 * @return BorrowRateCurve - the serializable flat curve configuration
 */
function newFlat(borrowRateBps) {
    const points = padPoints([
        { borrowRateBps, utilizationRateBps: 0 },
        { borrowRateBps, utilizationRateBps: 10_000 },
    ]);
    return new types_1.BorrowRateCurve({
        points,
    });
}
/**
 * Pad the remainder with the final point
 * @param points - un-padded points
 * @returns points - the padded points
 */
function padPoints(points) {
    points.push(...Array(exports.CURVE_POINTS_LENGTH - points.length).fill(points[points.length - 1]));
    return points;
}
/**
 * Remove trailing duplicate points, keeping only the first occurrence of the
 * final repeated entry. This is the inverse of padPoints and produces a
 * compact representation suitable for human-readable config files.
 * @param points - padded points (length 11)
 * @returns deduplicated points with trailing padding removed
 */
function trimPoints(points) {
    let end = points.length - 1;
    while (end > 0 &&
        points[end].utilizationRateBps === points[end - 1].utilizationRateBps &&
        points[end].borrowRateBps === points[end - 1].borrowRateBps) {
        end--;
    }
    return points.slice(0, end + 1);
}
//# sourceMappingURL=curve.js.map
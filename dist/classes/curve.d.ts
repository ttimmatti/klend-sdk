import { BorrowRateCurve, CurvePointFields } from '../@codegen/klend/types';
export declare const CURVE_POINTS_LENGTH = 11;
/**
 * Create a new curve with a flat borrow rate
 * Useful for testing
 * @param borrowRateBps - the flat borrow rate in bps
 * @return BorrowRateCurve - the serializable flat curve configuration
 */
export declare function newFlat(borrowRateBps: number): BorrowRateCurve;
/**
 * Pad the remainder with the final point
 * @param points - un-padded points
 * @returns points - the padded points
 */
export declare function padPoints(points: CurvePointFields[]): CurvePointFields[];
/**
 * Remove trailing duplicate points, keeping only the first occurrence of the
 * final repeated entry. This is the inverse of padPoints and produces a
 * compact representation suitable for human-readable config files.
 * @param points - padded points (length 11)
 * @returns deduplicated points with trailing padding removed
 */
export declare function trimPoints(points: CurvePointFields[]): CurvePointFields[];
//# sourceMappingURL=curve.d.ts.map
import * as types from "../types";
import * as borsh from "@coral-xyz/borsh";
export interface UpdateOwnerJSON {
    kind: "UpdateOwner";
}
export declare class UpdateOwner {
    static readonly discriminator = 0;
    static readonly kind = "UpdateOwner";
    readonly discriminator = 0;
    readonly kind = "UpdateOwner";
    toJSON(): UpdateOwnerJSON;
    toEncodable(): {
        UpdateOwner: {};
    };
}
export interface UpdateEmergencyModeJSON {
    kind: "UpdateEmergencyMode";
}
export declare class UpdateEmergencyMode {
    static readonly discriminator = 1;
    static readonly kind = "UpdateEmergencyMode";
    readonly discriminator = 1;
    readonly kind = "UpdateEmergencyMode";
    toJSON(): UpdateEmergencyModeJSON;
    toEncodable(): {
        UpdateEmergencyMode: {};
    };
}
export interface UpdateLiquidationCloseFactorJSON {
    kind: "UpdateLiquidationCloseFactor";
}
export declare class UpdateLiquidationCloseFactor {
    static readonly discriminator = 2;
    static readonly kind = "UpdateLiquidationCloseFactor";
    readonly discriminator = 2;
    readonly kind = "UpdateLiquidationCloseFactor";
    toJSON(): UpdateLiquidationCloseFactorJSON;
    toEncodable(): {
        UpdateLiquidationCloseFactor: {};
    };
}
export interface UpdateLiquidationMaxValueJSON {
    kind: "UpdateLiquidationMaxValue";
}
export declare class UpdateLiquidationMaxValue {
    static readonly discriminator = 3;
    static readonly kind = "UpdateLiquidationMaxValue";
    readonly discriminator = 3;
    readonly kind = "UpdateLiquidationMaxValue";
    toJSON(): UpdateLiquidationMaxValueJSON;
    toEncodable(): {
        UpdateLiquidationMaxValue: {};
    };
}
export interface DeprecatedUpdateGlobalUnhealthyBorrowJSON {
    kind: "DeprecatedUpdateGlobalUnhealthyBorrow";
}
export declare class DeprecatedUpdateGlobalUnhealthyBorrow {
    static readonly discriminator = 4;
    static readonly kind = "DeprecatedUpdateGlobalUnhealthyBorrow";
    readonly discriminator = 4;
    readonly kind = "DeprecatedUpdateGlobalUnhealthyBorrow";
    toJSON(): DeprecatedUpdateGlobalUnhealthyBorrowJSON;
    toEncodable(): {
        DeprecatedUpdateGlobalUnhealthyBorrow: {};
    };
}
export interface UpdateGlobalAllowedBorrowJSON {
    kind: "UpdateGlobalAllowedBorrow";
}
export declare class UpdateGlobalAllowedBorrow {
    static readonly discriminator = 5;
    static readonly kind = "UpdateGlobalAllowedBorrow";
    readonly discriminator = 5;
    readonly kind = "UpdateGlobalAllowedBorrow";
    toJSON(): UpdateGlobalAllowedBorrowJSON;
    toEncodable(): {
        UpdateGlobalAllowedBorrow: {};
    };
}
export interface UpdateRiskCouncilJSON {
    kind: "UpdateRiskCouncil";
}
export declare class UpdateRiskCouncil {
    static readonly discriminator = 6;
    static readonly kind = "UpdateRiskCouncil";
    readonly discriminator = 6;
    readonly kind = "UpdateRiskCouncil";
    toJSON(): UpdateRiskCouncilJSON;
    toEncodable(): {
        UpdateRiskCouncil: {};
    };
}
export interface UpdateMinFullLiquidationThresholdJSON {
    kind: "UpdateMinFullLiquidationThreshold";
}
export declare class UpdateMinFullLiquidationThreshold {
    static readonly discriminator = 7;
    static readonly kind = "UpdateMinFullLiquidationThreshold";
    readonly discriminator = 7;
    readonly kind = "UpdateMinFullLiquidationThreshold";
    toJSON(): UpdateMinFullLiquidationThresholdJSON;
    toEncodable(): {
        UpdateMinFullLiquidationThreshold: {};
    };
}
export interface UpdateInsolvencyRiskLtvJSON {
    kind: "UpdateInsolvencyRiskLtv";
}
export declare class UpdateInsolvencyRiskLtv {
    static readonly discriminator = 8;
    static readonly kind = "UpdateInsolvencyRiskLtv";
    readonly discriminator = 8;
    readonly kind = "UpdateInsolvencyRiskLtv";
    toJSON(): UpdateInsolvencyRiskLtvJSON;
    toEncodable(): {
        UpdateInsolvencyRiskLtv: {};
    };
}
export interface UpdateElevationGroupJSON {
    kind: "UpdateElevationGroup";
}
export declare class UpdateElevationGroup {
    static readonly discriminator = 9;
    static readonly kind = "UpdateElevationGroup";
    readonly discriminator = 9;
    readonly kind = "UpdateElevationGroup";
    toJSON(): UpdateElevationGroupJSON;
    toEncodable(): {
        UpdateElevationGroup: {};
    };
}
export interface UpdateReferralFeeBpsJSON {
    kind: "UpdateReferralFeeBps";
}
export declare class UpdateReferralFeeBps {
    static readonly discriminator = 10;
    static readonly kind = "UpdateReferralFeeBps";
    readonly discriminator = 10;
    readonly kind = "UpdateReferralFeeBps";
    toJSON(): UpdateReferralFeeBpsJSON;
    toEncodable(): {
        UpdateReferralFeeBps: {};
    };
}
export interface DeprecatedUpdateMultiplierPointsJSON {
    kind: "DeprecatedUpdateMultiplierPoints";
}
export declare class DeprecatedUpdateMultiplierPoints {
    static readonly discriminator = 11;
    static readonly kind = "DeprecatedUpdateMultiplierPoints";
    readonly discriminator = 11;
    readonly kind = "DeprecatedUpdateMultiplierPoints";
    toJSON(): DeprecatedUpdateMultiplierPointsJSON;
    toEncodable(): {
        DeprecatedUpdateMultiplierPoints: {};
    };
}
export interface UpdatePriceRefreshTriggerToMaxAgePctJSON {
    kind: "UpdatePriceRefreshTriggerToMaxAgePct";
}
export declare class UpdatePriceRefreshTriggerToMaxAgePct {
    static readonly discriminator = 12;
    static readonly kind = "UpdatePriceRefreshTriggerToMaxAgePct";
    readonly discriminator = 12;
    readonly kind = "UpdatePriceRefreshTriggerToMaxAgePct";
    toJSON(): UpdatePriceRefreshTriggerToMaxAgePctJSON;
    toEncodable(): {
        UpdatePriceRefreshTriggerToMaxAgePct: {};
    };
}
export interface UpdateAutodeleverageEnabledJSON {
    kind: "UpdateAutodeleverageEnabled";
}
export declare class UpdateAutodeleverageEnabled {
    static readonly discriminator = 13;
    static readonly kind = "UpdateAutodeleverageEnabled";
    readonly discriminator = 13;
    readonly kind = "UpdateAutodeleverageEnabled";
    toJSON(): UpdateAutodeleverageEnabledJSON;
    toEncodable(): {
        UpdateAutodeleverageEnabled: {};
    };
}
export interface UpdateBorrowingDisabledJSON {
    kind: "UpdateBorrowingDisabled";
}
export declare class UpdateBorrowingDisabled {
    static readonly discriminator = 14;
    static readonly kind = "UpdateBorrowingDisabled";
    readonly discriminator = 14;
    readonly kind = "UpdateBorrowingDisabled";
    toJSON(): UpdateBorrowingDisabledJSON;
    toEncodable(): {
        UpdateBorrowingDisabled: {};
    };
}
export interface UpdateMinNetValueObligationPostActionJSON {
    kind: "UpdateMinNetValueObligationPostAction";
}
export declare class UpdateMinNetValueObligationPostAction {
    static readonly discriminator = 15;
    static readonly kind = "UpdateMinNetValueObligationPostAction";
    readonly discriminator = 15;
    readonly kind = "UpdateMinNetValueObligationPostAction";
    toJSON(): UpdateMinNetValueObligationPostActionJSON;
    toEncodable(): {
        UpdateMinNetValueObligationPostAction: {};
    };
}
export interface UpdateMinValueLtvSkipPriorityLiqCheckJSON {
    kind: "UpdateMinValueLtvSkipPriorityLiqCheck";
}
export declare class UpdateMinValueLtvSkipPriorityLiqCheck {
    static readonly discriminator = 16;
    static readonly kind = "UpdateMinValueLtvSkipPriorityLiqCheck";
    readonly discriminator = 16;
    readonly kind = "UpdateMinValueLtvSkipPriorityLiqCheck";
    toJSON(): UpdateMinValueLtvSkipPriorityLiqCheckJSON;
    toEncodable(): {
        UpdateMinValueLtvSkipPriorityLiqCheck: {};
    };
}
export interface UpdateMinValueBfSkipPriorityLiqCheckJSON {
    kind: "UpdateMinValueBfSkipPriorityLiqCheck";
}
export declare class UpdateMinValueBfSkipPriorityLiqCheck {
    static readonly discriminator = 17;
    static readonly kind = "UpdateMinValueBfSkipPriorityLiqCheck";
    readonly discriminator = 17;
    readonly kind = "UpdateMinValueBfSkipPriorityLiqCheck";
    toJSON(): UpdateMinValueBfSkipPriorityLiqCheckJSON;
    toEncodable(): {
        UpdateMinValueBfSkipPriorityLiqCheck: {};
    };
}
export interface UpdatePaddingFieldsJSON {
    kind: "UpdatePaddingFields";
}
export declare class UpdatePaddingFields {
    static readonly discriminator = 18;
    static readonly kind = "UpdatePaddingFields";
    readonly discriminator = 18;
    readonly kind = "UpdatePaddingFields";
    toJSON(): UpdatePaddingFieldsJSON;
    toEncodable(): {
        UpdatePaddingFields: {};
    };
}
export interface UpdateNameJSON {
    kind: "UpdateName";
}
export declare class UpdateName {
    static readonly discriminator = 19;
    static readonly kind = "UpdateName";
    readonly discriminator = 19;
    readonly kind = "UpdateName";
    toJSON(): UpdateNameJSON;
    toEncodable(): {
        UpdateName: {};
    };
}
export interface UpdateIndividualAutodeleverageMarginCallPeriodSecsJSON {
    kind: "UpdateIndividualAutodeleverageMarginCallPeriodSecs";
}
export declare class UpdateIndividualAutodeleverageMarginCallPeriodSecs {
    static readonly discriminator = 20;
    static readonly kind = "UpdateIndividualAutodeleverageMarginCallPeriodSecs";
    readonly discriminator = 20;
    readonly kind = "UpdateIndividualAutodeleverageMarginCallPeriodSecs";
    toJSON(): UpdateIndividualAutodeleverageMarginCallPeriodSecsJSON;
    toEncodable(): {
        UpdateIndividualAutodeleverageMarginCallPeriodSecs: {};
    };
}
export interface UpdateInitialDepositAmountJSON {
    kind: "UpdateInitialDepositAmount";
}
export declare class UpdateInitialDepositAmount {
    static readonly discriminator = 21;
    static readonly kind = "UpdateInitialDepositAmount";
    readonly discriminator = 21;
    readonly kind = "UpdateInitialDepositAmount";
    toJSON(): UpdateInitialDepositAmountJSON;
    toEncodable(): {
        UpdateInitialDepositAmount: {};
    };
}
export interface UpdateObligationOrderExecutionEnabledJSON {
    kind: "UpdateObligationOrderExecutionEnabled";
}
export declare class UpdateObligationOrderExecutionEnabled {
    static readonly discriminator = 22;
    static readonly kind = "UpdateObligationOrderExecutionEnabled";
    readonly discriminator = 22;
    readonly kind = "UpdateObligationOrderExecutionEnabled";
    toJSON(): UpdateObligationOrderExecutionEnabledJSON;
    toEncodable(): {
        UpdateObligationOrderExecutionEnabled: {};
    };
}
export interface UpdateImmutableFlagJSON {
    kind: "UpdateImmutableFlag";
}
export declare class UpdateImmutableFlag {
    static readonly discriminator = 23;
    static readonly kind = "UpdateImmutableFlag";
    readonly discriminator = 23;
    readonly kind = "UpdateImmutableFlag";
    toJSON(): UpdateImmutableFlagJSON;
    toEncodable(): {
        UpdateImmutableFlag: {};
    };
}
export interface UpdateObligationOrderCreationEnabledJSON {
    kind: "UpdateObligationOrderCreationEnabled";
}
export declare class UpdateObligationOrderCreationEnabled {
    static readonly discriminator = 24;
    static readonly kind = "UpdateObligationOrderCreationEnabled";
    readonly discriminator = 24;
    readonly kind = "UpdateObligationOrderCreationEnabled";
    toJSON(): UpdateObligationOrderCreationEnabledJSON;
    toEncodable(): {
        UpdateObligationOrderCreationEnabled: {};
    };
}
export interface UpdateProposerAuthorityJSON {
    kind: "UpdateProposerAuthority";
}
export declare class UpdateProposerAuthority {
    static readonly discriminator = 25;
    static readonly kind = "UpdateProposerAuthority";
    readonly discriminator = 25;
    readonly kind = "UpdateProposerAuthority";
    toJSON(): UpdateProposerAuthorityJSON;
    toEncodable(): {
        UpdateProposerAuthority: {};
    };
}
export interface UpdatePriceTriggeredLiquidationDisabledJSON {
    kind: "UpdatePriceTriggeredLiquidationDisabled";
}
export declare class UpdatePriceTriggeredLiquidationDisabled {
    static readonly discriminator = 26;
    static readonly kind = "UpdatePriceTriggeredLiquidationDisabled";
    readonly discriminator = 26;
    readonly kind = "UpdatePriceTriggeredLiquidationDisabled";
    toJSON(): UpdatePriceTriggeredLiquidationDisabledJSON;
    toEncodable(): {
        UpdatePriceTriggeredLiquidationDisabled: {};
    };
}
export interface UpdateMatureReserveDebtLiquidationEnabledJSON {
    kind: "UpdateMatureReserveDebtLiquidationEnabled";
}
export declare class UpdateMatureReserveDebtLiquidationEnabled {
    static readonly discriminator = 27;
    static readonly kind = "UpdateMatureReserveDebtLiquidationEnabled";
    readonly discriminator = 27;
    readonly kind = "UpdateMatureReserveDebtLiquidationEnabled";
    toJSON(): UpdateMatureReserveDebtLiquidationEnabledJSON;
    toEncodable(): {
        UpdateMatureReserveDebtLiquidationEnabled: {};
    };
}
export interface UpdateObligationBorrowDebtTermLiquidationEnabledJSON {
    kind: "UpdateObligationBorrowDebtTermLiquidationEnabled";
}
export declare class UpdateObligationBorrowDebtTermLiquidationEnabled {
    static readonly discriminator = 28;
    static readonly kind = "UpdateObligationBorrowDebtTermLiquidationEnabled";
    readonly discriminator = 28;
    readonly kind = "UpdateObligationBorrowDebtTermLiquidationEnabled";
    toJSON(): UpdateObligationBorrowDebtTermLiquidationEnabledJSON;
    toEncodable(): {
        UpdateObligationBorrowDebtTermLiquidationEnabled: {};
    };
}
export interface UpdateBorrowOrderCreationEnabledJSON {
    kind: "UpdateBorrowOrderCreationEnabled";
}
export declare class UpdateBorrowOrderCreationEnabled {
    static readonly discriminator = 29;
    static readonly kind = "UpdateBorrowOrderCreationEnabled";
    readonly discriminator = 29;
    readonly kind = "UpdateBorrowOrderCreationEnabled";
    toJSON(): UpdateBorrowOrderCreationEnabledJSON;
    toEncodable(): {
        UpdateBorrowOrderCreationEnabled: {};
    };
}
export interface UpdateBorrowOrderExecutionEnabledJSON {
    kind: "UpdateBorrowOrderExecutionEnabled";
}
export declare class UpdateBorrowOrderExecutionEnabled {
    static readonly discriminator = 30;
    static readonly kind = "UpdateBorrowOrderExecutionEnabled";
    readonly discriminator = 30;
    readonly kind = "UpdateBorrowOrderExecutionEnabled";
    toJSON(): UpdateBorrowOrderExecutionEnabledJSON;
    toEncodable(): {
        UpdateBorrowOrderExecutionEnabled: {};
    };
}
export declare function fromDecoded(obj: any): types.UpdateLendingMarketModeKind;
export declare function fromJSON(obj: types.UpdateLendingMarketModeJSON): types.UpdateLendingMarketModeKind;
export declare function layout(property?: string): borsh.EnumLayout<unknown>;
//# sourceMappingURL=UpdateLendingMarketMode.d.ts.map
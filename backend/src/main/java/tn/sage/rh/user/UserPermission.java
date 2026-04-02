package tn.sage.rh.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum UserPermission {
    EMPLOYEE_READ("employee:read"),
    EMPLOYEE_UPDATE("employee:update"),
    EMPLOYEE_CREATE("employee:create"),
    EMPLOYEE_DELETE("employee:delete"),

    SALARY_ADVANCE_READ("salary-advance:read"),
    SALARY_ADVANCE_UPDATE("salary-advance:update"),
    SALARY_ADVANCE_CREATE("salary-advance:create"),
    SALARY_ADVANCE_DELETE("salary-advance:delete"),

    SALARY_ADVANCE_DEADLINE_READ("salary-advance-deadline:read"),
    SALARY_ADVANCE_DEADLINE_UPDATE("salary-advance-deadline:update"),
    SALARY_ADVANCE_DEADLINE_CREATE("salary-advance-deadline:create"),
    SALARY_ADVANCE_DEADLINE_DELETE("salary-advance-deadline:delete"),
    REQUEST_READ("request:read"),
    REQUEST_UPDATE("request:update"),
    REQUEST_CREATE("request:create"),

    PERMUTATION_READ("permutation:read"),
    PERMUTATION_CREATE("permutation:create"),
    PERMUTATION_UPDATE("permutation:update"),

    // Absence
    ABSENCE_READ("absence:read"),
    ABSENCE_CREATE("absence:create"),
    ABSENCE_DELETE("absence:delete"),
    ABSENCE_UPDATE_MOTIF("absence:update:motif"),
    ABSENCE_UPDATE_STATUT("absence:update:statut"),


    EDI_CONVERT("edi:convert"),
    EDI_HISTORY("edi:history");


    @Getter
    private final String permission;
}
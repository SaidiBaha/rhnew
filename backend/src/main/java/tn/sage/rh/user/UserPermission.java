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
    PERMUTATION_UPDATE("permutation:update");

    @Getter
    private final String permission;
}
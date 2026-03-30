package tn.sage.rh.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserPermission.*;

@RequiredArgsConstructor
public enum UserRole {
    USER(Collections.emptySet()),
    ADMIN(
            Set.of(
                    EMPLOYEE_READ,
                    EMPLOYEE_UPDATE,
                    EMPLOYEE_CREATE,
                    EMPLOYEE_DELETE,

                    SALARY_ADVANCE_READ,
                    SALARY_ADVANCE_UPDATE,
                    SALARY_ADVANCE_CREATE,
                    SALARY_ADVANCE_DELETE,

                    SALARY_ADVANCE_DEADLINE_READ,
                    SALARY_ADVANCE_DEADLINE_UPDATE,
                    SALARY_ADVANCE_DEADLINE_CREATE,
                    SALARY_ADVANCE_DEADLINE_DELETE,

                    REQUEST_READ,
                    REQUEST_UPDATE,
                    REQUEST_CREATE,

                    ABSENCE_READ,
                    ABSENCE_CREATE,
                    ABSENCE_DELETE,
                    ABSENCE_UPDATE_MOTIF,
                    ABSENCE_UPDATE_STATUT
            )
    ),

    SUPERVISOR(
            Set.of(
                    EMPLOYEE_READ,

                    SALARY_ADVANCE_READ,
                    SALARY_ADVANCE_UPDATE,

                    SALARY_ADVANCE_DEADLINE_READ,

                    REQUEST_READ,
                    REQUEST_UPDATE,
                    REQUEST_CREATE,

                    PERMUTATION_CREATE,
                    PERMUTATION_UPDATE,
                    PERMUTATION_READ,

                    ABSENCE_READ,
                    ABSENCE_CREATE,
                    ABSENCE_UPDATE_STATUT
            )
    ),

    OPERATIONAL_MANAGER(
            Set.of(
                    PERMUTATION_READ
            )
    ),

    INFIRMIERE(
            Set.of(
                    ABSENCE_READ,
                    ABSENCE_CREATE,
                    ABSENCE_DELETE,
                    ABSENCE_UPDATE_MOTIF
            )
    );

    @Getter
    private final Set<UserPermission> permissions;

    public List<SimpleGrantedAuthority> getAuthorities() {
        var authorities = getPermissions()
                .stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getPermission()))
                .collect(Collectors.toList());
        authorities.add(new SimpleGrantedAuthority("ROLE_" + this.name()));
        return authorities;
    }
}
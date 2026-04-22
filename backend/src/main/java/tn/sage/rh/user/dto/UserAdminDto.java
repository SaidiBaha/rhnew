package tn.sage.rh.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminDto {
    private Long id;
    private String matricule;
    private String fullName;
    private String email;
    private String role;
    private boolean blocked;
    private LocalDateTime lastLoginAt;
    private LocalDateTime lastActivityAt;
    private String lastActivityIp;
}

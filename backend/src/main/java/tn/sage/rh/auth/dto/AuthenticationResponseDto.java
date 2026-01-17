package tn.sage.rh.auth.dto;

import lombok.*;
import tn.sage.rh.user.UserRole;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponseDto {
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class User {
        private Long id;
        private String matricule;
        private UserRole role;
    }

    private User user;
    private String accessToken;
    private String refreshToken;
}

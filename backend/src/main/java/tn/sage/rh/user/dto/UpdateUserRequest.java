package tn.sage.rh.user.dto;

import lombok.Data;
import tn.sage.rh.user.UserRole;

@Data
public class UpdateUserRequest {
    private UserRole role;
    private String email;
}

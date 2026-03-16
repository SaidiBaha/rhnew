package tn.sage.rh.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VerifyOtpResponse {
    private String resetToken;
}

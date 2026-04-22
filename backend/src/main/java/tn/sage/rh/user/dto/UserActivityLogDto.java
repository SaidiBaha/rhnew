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
public class UserActivityLogDto {
    private Long id;
    private String eventType;
    private String ipAddress;
    private String userAgent;
    private String detail;
    private LocalDateTime createdAt;
}

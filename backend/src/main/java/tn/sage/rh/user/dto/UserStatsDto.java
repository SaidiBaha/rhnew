package tn.sage.rh.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDto {
    private long totalUsers;
    private long activeUsers;
    private long blockedUsers;
    private long connectedToday;
    private Map<String, Long> byRole;
}

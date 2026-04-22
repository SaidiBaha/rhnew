package tn.sage.rh.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserActivityLogService {

    private final UserActivityLogRepository logRepository;
    private final UserRepository userRepository;

    @Async
    public void logEvent(Long userId, String eventType, String ipAddress, String userAgent, String detail) {
        try {
            userRepository.findById(userId).ifPresent(user -> {
                UserActivityLog entry = UserActivityLog.builder()
                        .user(user)
                        .eventType(eventType)
                        .ipAddress(ipAddress)
                        .userAgent(userAgent)
                        .detail(detail)
                        .createdAt(LocalDateTime.now())
                        .build();
                logRepository.save(entry);
            });
        } catch (Exception e) {
            log.error("Failed to save activity log for user {}: {}", userId, e.getMessage());
        }
    }

    @Async
    public void logEventByMatricule(String matricule, String eventType, String ipAddress, String userAgent, String detail) {
        try {
            userRepository.findByEmployee_Matricule(matricule).ifPresent(user -> {
                UserActivityLog entry = UserActivityLog.builder()
                        .user(user)
                        .eventType(eventType)
                        .ipAddress(ipAddress)
                        .userAgent(userAgent)
                        .detail(detail)
                        .createdAt(LocalDateTime.now())
                        .build();
                logRepository.save(entry);
            });
        } catch (Exception e) {
            log.error("Failed to save activity log for matricule {}: {}", matricule, e.getMessage());
        }
    }

    @Async
    public void updateLastActivity(Long userId, String ipAddress) {
        try {
            userRepository.findById(userId).ifPresent(user -> {
                user.setLastActivityAt(LocalDateTime.now());
                user.setLastActivityIp(ipAddress);
                userRepository.save(user);
            });
        } catch (Exception e) {
            log.error("Failed to update last activity for user {}: {}", userId, e.getMessage());
        }
    }
}

package tn.sage.rh.hse.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.hse.audit.dto.AuditActivityLogDto;
import tn.sage.rh.hse.audit.entity.AuditActivityLog;
import tn.sage.rh.hse.audit.repository.AuditActivityLogRepository;
import tn.sage.rh.user.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditActivityLogService {

    private final AuditActivityLogRepository repository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long auditId, String eventType, Long performedById, String detail) {
        try {
            AuditActivityLog entry = AuditActivityLog.builder()
                    .auditId(auditId)
                    .eventType(eventType)
                    .performedById(performedById)
                    .detail(detail)
                    .build();
            repository.save(entry);
        } catch (Exception e) {
            log.error("Erreur log activité audit auditId={} event={} : {}", auditId, eventType, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<AuditActivityLogDto> findByAuditId(Long auditId) {
        return repository.findByAuditIdOrderByPerformedAtAsc(auditId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private AuditActivityLogDto toDto(AuditActivityLog log) {
        String performedByName = null;
        if (log.getPerformedById() != null) {
            performedByName = userRepository.findById(log.getPerformedById())
                    .map(u -> u.getEmployee() != null ? u.getEmployee().getFullName() : u.getUsername())
                    .orElse(null);
        }
        return AuditActivityLogDto.builder()
                .id(log.getId())
                .auditId(log.getAuditId())
                .eventType(log.getEventType())
                .performedById(log.getPerformedById())
                .performedByName(performedByName)
                .performedAt(log.getPerformedAt())
                .detail(log.getDetail())
                .build();
    }
}

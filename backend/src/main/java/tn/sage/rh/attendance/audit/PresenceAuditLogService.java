package tn.sage.rh.attendance.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceAuditLogService {

    private final PresenceAuditLogRepository repository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Chaque méthode s'exécute dans une transaction séparée (REQUIRES_NEW) pour isoler
     * les échecs d'audit des transactions principales. Les IDs sont utilisés pour éviter
     * tout problème de détachement JPA ; les entités sont rechargées dans cette transaction.
     */

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCreation(Long performedById, Long employeeId,
                            String module, String ipAddress, String detail) {
        User performer = loadUser(performedById);
        if (performer == null) return;
        persist(PresenceAuditLog.builder()
                .actionType("CREATION")
                .module(module)
                .performedBy(performer)
                .employee(loadEmployee(employeeId))
                .ipAddress(ipAddress)
                .detail(detail)
                .build());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logModification(Long performedById, Long employeeId, String module,
                                String fieldChanged, String oldValue, String newValue,
                                String ipAddress, String detail) {
        User performer = loadUser(performedById);
        if (performer == null) return;
        persist(PresenceAuditLog.builder()
                .actionType("MODIFICATION")
                .module(module)
                .performedBy(performer)
                .employee(loadEmployee(employeeId))
                .fieldChanged(fieldChanged)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .detail(detail)
                .build());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDeletion(Long performedById, Long employeeId,
                            String module, String ipAddress, String detail) {
        User performer = loadUser(performedById);
        if (performer == null) return;
        persist(PresenceAuditLog.builder()
                .actionType("SUPPRESSION")
                .module(module)
                .performedBy(performer)
                .employee(loadEmployee(employeeId))
                .ipAddress(ipAddress)
                .detail(detail)
                .build());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private User loadUser(Long id) {
        if (id == null) return null;
        return userRepository.findById(id).orElse(null);
    }

    private Employee loadEmployee(Long id) {
        if (id == null) return null;
        return employeeRepository.findById(id).orElse(null);
    }

    private void persist(PresenceAuditLog entry) {
        entry.setPerformedAt(LocalDateTime.now());
        repository.save(entry);
    }

    // ─── Read (used by controller) ────────────────────────────────────────────

    public Page<PresenceAuditLogDto> findFiltered(
            String module, String actionType,
            String performedByMatricule, String employeeMatricule,
            LocalDateTime from, LocalDateTime to,
            Pageable pageable) {

        return repository.findFiltered(module, actionType, performedByMatricule,
                        employeeMatricule, from, to, pageable)
                .map(this::toDto);
    }

    private PresenceAuditLogDto toDto(PresenceAuditLog entry) {
        PresenceAuditLogDto.PresenceAuditLogDtoBuilder b = PresenceAuditLogDto.builder()
                .id(entry.getId())
                .actionType(entry.getActionType())
                .module(entry.getModule())
                .performedAt(entry.getPerformedAt())
                .fieldChanged(entry.getFieldChanged())
                .oldValue(entry.getOldValue())
                .newValue(entry.getNewValue())
                .ipAddress(entry.getIpAddress())
                .detail(entry.getDetail());

        if (entry.getPerformedBy() != null) {
            User u = entry.getPerformedBy();
            b.performedById(u.getId());
            if (u.getEmployee() != null) {
                b.performedByMatricule(u.getEmployee().getMatricule());
                b.performedByFullName(u.getEmployee().getFullName());
            }
        }

        if (entry.getEmployee() != null) {
            Employee e = entry.getEmployee();
            b.employeeId(e.getId());
            b.employeeMatricule(e.getMatricule());
            b.employeeFullName(e.getFullName());
        }

        return b.build();
    }
}

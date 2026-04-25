package tn.sage.rh.attendance.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.user.User;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "presence_audit_logs")
public class PresenceAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** CREATION, MODIFICATION, SUPPRESSION */
    @Column(nullable = false, length = 30)
    private String actionType;

    /** PRESENCE_ABSENCE, HISTORIQUE_PRESENCE */
    @Column(nullable = false, length = 40)
    private String module;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id", nullable = false)
    private User performedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime performedAt = LocalDateTime.now();

    /** Nullable — null pour les opérations batch (import XLSX). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    /** Nom du champ modifié — null pour les créations/suppressions. */
    @Column(length = 60)
    private String fieldChanged;

    @Column(length = 500)
    private String oldValue;

    @Column(length = 500)
    private String newValue;

    @Column(length = 50)
    private String ipAddress;

    @Column(length = 1000)
    private String detail;
}

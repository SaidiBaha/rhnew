package tn.sage.rh.hse.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.hse.checklist.entity.ChecklistInstance;
import tn.sage.rh.hse.checklist.entity.ChecklistTemplate;
import tn.sage.rh.user.User;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "audits")
@EntityListeners(AuditingEntityListener.class)
public class Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime date;

    private String lineZone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private ChecklistTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_employee_id")
    private Employee assignedEmployee;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AuditStatus status = AuditStatus.EN_ATTENTE;

    @Column(length = 2000)
    private String notes;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instance_id")
    private ChecklistInstance instance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean reminder24hSent = false;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean reminderDaySent = false;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    public enum AuditStatus {
        EN_ATTENTE, EN_COURS, TERMINE, ANNULE
    }
}

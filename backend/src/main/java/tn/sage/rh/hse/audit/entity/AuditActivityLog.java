package tn.sage.rh.hse.audit.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_activity_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Column(name = "performed_by_id")
    private Long performedById;

    @Column(nullable = false)
    private LocalDateTime performedAt;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @PrePersist
    protected void onCreate() {
        if (performedAt == null) performedAt = LocalDateTime.now();
    }
}

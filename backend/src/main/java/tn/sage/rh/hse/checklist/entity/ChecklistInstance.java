package tn.sage.rh.hse.checklist.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.sage.rh.user.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checklist_instances")
@EntityListeners(AuditingEntityListener.class)
public class ChecklistInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private ChecklistTemplate template;

    @Column(name = "audit_id")
    private Long auditId;

    private LocalDate date;
    private String lineUnit;
    private String teamLeader;
    private String auditor;
    private String auditorVisa;
    private String lineResponsible;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InstanceStatus status = InstanceStatus.BROUILLON;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "instance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChecklistResponse> responses = new ArrayList<>();

    @OneToMany(mappedBy = "instance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChecklistAssignment> assignments = new ArrayList<>();

    public enum InstanceStatus {
        BROUILLON, COMPLETE
    }
}

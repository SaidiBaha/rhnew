package tn.sage.rh.salary.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "supervisor_advance_tracking",
    uniqueConstraints = @UniqueConstraint(columnNames = {"supervisor_id", "attendance_import_id"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisorAdvanceTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "supervisor_id", nullable = false)
    private Long supervisorId;

    @Column(name = "attendance_import_id", nullable = false)
    private String attendanceImportId;

    @Column(name = "nb_employees")
    private Integer nbEmployees;

    @Column(name = "nb_avances_saisies")
    private Integer nbAvancesSaisies = 0;

    @Column(name = "montant_total", precision = 10, scale = 2)
    private BigDecimal montantTotal = BigDecimal.ZERO;

    /**
     * Valeurs possibles : EN_ATTENTE | PARTIEL | COMPLETE
     */
    @Column(nullable = false)
    private String statut = "EN_ATTENTE";

    @Column(name = "derniere_action_at")
    private LocalDateTime derniereActionAt;

    @Column(name = "rappel_envoye")
    private boolean rappelEnvoye = false;

    @Column(name = "rappel_envoye_at")
    private LocalDateTime rappelEnvoyeAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

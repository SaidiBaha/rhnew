package tn.sage.rh.absence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.sage.rh.employee.Employee;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "absence",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_absence_employee_date", columnNames = {"employee_id", "date"})
        }
)
public class Absence {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private LocalDate date;

    private LocalTime heureDebut;
    private LocalTime heureFin;
    private LocalTime heureEntree;
    private LocalTime heureSortie;
    private String horaire;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AbsenceStatut statut = AbsenceStatut.ABSENT;

    private String motif;
    private String departement;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;
}
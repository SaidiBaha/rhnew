package tn.sage.rh.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.sage.rh.employee.Employee;

import java.time.Duration;
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
@Table(uniqueConstraints = {
        @UniqueConstraint(name = "uk_attendance", columnNames = {"employee_id", "date"})
})
public class Attendance {
    @Id
    @GeneratedValue
    private long id;

    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    private LocalTime clockIn;

    private LocalTime clockOut;

    private Duration totalAttendance;

    private Duration overtime;

    /** Nom du shift (ex: "Shift matin", "Shift Nuit", "ADM"). */
    private String horaire;

    /** Heure de début planifiée. */
    private LocalTime debut;

    /** Heure de fin planifiée. */
    private LocalTime fin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "absence_reason_id")
    private AbsenceReason absenceReason;

    /**
     * Source de l'enregistrement :
     * "XLSX_IMPORT"        — import administrateur via fichier XLSX
     * "MANUAL_SUPERVISOR"  — saisie manuelle par le superviseur
     */
    private String source;

    /** ID de l'utilisateur ayant saisi manuellement (null si import XLSX). */
    private Long createdBy;

    /** true si le NURSE a marqué cet employé comme "appelé" aujourd'hui. */
    private boolean appele = false;

    /** Horodatage (Africa/Tunis) auquel le NURSE a marqué l'appel. */
    private LocalDateTime appeleAt;

    /** ID de l'utilisateur NURSE ayant marqué l'appel (null si non appelé). */
    private Long appeleBy;

    @CreatedDate
    @Column(
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;
}

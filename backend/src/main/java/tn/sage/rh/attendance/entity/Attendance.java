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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "absence_reason_id")
    private AbsenceReason absenceReason;

    // ── NEW FIELDS ──────────────────────────────────────────
    private String shiftName;

    private LocalTime shiftStart;

    private LocalTime shiftEnd;

    private String status;   // "PRESENT" or "ABSENT"
    // ────────────────────────────────────────────────────────

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;
}

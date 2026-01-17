package tn.sage.rh.employee;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.organization.entity.*;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.request.Request;
import tn.sage.rh.salary.entity.SalaryAdvance;
import tn.sage.rh.user.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Employee {
    @Id
    @GeneratedValue
    private long id;

    @Column(unique = true, nullable = false)
    private String matricule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Civility civility;

    @Column(nullable = false)
    private String fullName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_title_id", nullable = false)
    private JobTitle jobTitle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_line_id")
    private ProductionLine productionLine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employment_type_id", nullable = false)
    private EmploymentType employmentType;

    private LocalDate hireDate;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean hasBankDomiciliation = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supervisor_id")
    private Employee supervisor;

    @OneToMany(mappedBy = "supervisor", fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Set<Employee> operators;

    @OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
    private Set<SalaryAdvance> salaryAdvances;

    @OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
    private Set<Attendance> attendances;

    @OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
    private Set<Request> requests;

    @OneToOne(mappedBy = "employee")
    private User user;

    @ManyToMany(mappedBy = "operators", fetch = FetchType.LAZY)
    private Set<Permutation> permutationsAsOperator;

    @CreatedDate
    @Column(
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;

    private boolean deleted = Boolean.FALSE;

    @PrePersist
    @PreUpdate
    public void toUppercase() {
        this.fullName = this.fullName.toUpperCase();
    }

    @OneToMany(mappedBy = "sender", fetch = FetchType.LAZY)
    private Set<Permutation> sentPermutations = new HashSet<>();

    @OneToMany(mappedBy = "receiver", fetch = FetchType.LAZY)
    private Set<Permutation> receivedPermutations = new HashSet<>();

}

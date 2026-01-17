package tn.sage.rh.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class AbsenceReason {
    @Id
    @GeneratedValue
    private long id;

    @Column(unique = true, nullable = false)
    private String reason;

    @OneToMany(mappedBy = "absenceReason", fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Set<Attendance> attendances;

    @PrePersist
    @PreUpdate
    public void toUppercase() {
        this.reason = this.reason.toUpperCase();
    }
}

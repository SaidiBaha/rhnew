package tn.sage.rh.hse.checklist.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checklist_assignments")
public class ChecklistAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instance_id", nullable = false)
    private ChecklistInstance instance;

    @Column(length = 1000)
    private String action;

    private String responsable;
    private LocalDate delai;
    private LocalDate dateRealisation;
}

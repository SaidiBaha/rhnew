package tn.sage.rh.attendance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_imports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceImport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "imported_by")
    private Long importedBy;

    @Column(name = "import_date")
    private LocalDate importDate;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    @Column(name = "fichier_nom")
    private String fichierNom;

    @Column(name = "nb_lignes")
    private Integer nbLignes;
}

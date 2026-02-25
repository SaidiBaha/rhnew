// tn/sage/rh/dashboard/dto/ProjectHoursRowDTO.java
package tn.sage.rh.dashboard.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectHoursRowDTO {

    // Projet
    private Long idProjet;
    private String nomProjet;

    // Superviseur (= récepteur)
    private Long idSuperviseur;
    private String nomSuperviseur;
    private String matriculeSuperviseur;

    // Heures
    private double heuresAjoutees;
    private double heuresTransferees;
}

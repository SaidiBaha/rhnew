package tn.sage.rh.absence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SaveAbsenceInputDto {

    @NotBlank(message = "Le matricule est obligatoire")
    private String matricule;

    @NotNull(message = "La date est obligatoire")
    private LocalDate date;

    private String horaire;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    private LocalTime heureEntree;
    private LocalTime heureSortie;
    private String motif;
    private String departement;
}
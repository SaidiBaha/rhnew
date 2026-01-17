package tn.sage.rh.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
public class SaveAttendanceInputDto {
    @NotBlank(message = "Matricule obligatoire")
    @Pattern(regexp = "^\\d+$", message = "Matricule invalide")
    private String matricule;

    @NotNull(message = "Date obligatoire")
    private LocalDate date;

    @NotNull
    private LocalTime clockIn;

    @NotNull
    private LocalTime clockOut;

    @NotNull
    @Pattern(regexp = "^([0-1]?\\d|2[0-3]):[0-5]\\d$", message = "Format invalide")
    private String totalAttendance;

    @NotNull
    @Pattern(regexp = "^([0-1]?\\d|2[0-3]):[0-5]\\d$", message = "Format invalide")
    private String overtime;

    private String absenceReason;
}

package tn.sage.rh.attendance.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Corps de la requête PATCH /attendances/{id}/appele.
 * Envoyé par le rôle NURSE pour marquer ou annuler un appel.
 */
@Getter
@NoArgsConstructor
public class UpdateAppeleInputDto {
    private boolean appele;
}

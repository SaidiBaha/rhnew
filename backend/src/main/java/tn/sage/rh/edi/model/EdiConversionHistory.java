package tn.sage.rh.edi.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "edi_conversion_history",
    indexes = {
        @Index(name = "idx_edi_history_matricule",   columnList = "converted_by_matricule"),
        @Index(name = "idx_edi_history_converted_at", columnList = "converted_at"),
        @Index(name = "idx_edi_history_status",      columnList = "status")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EdiConversionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Fichier source EDI ───────────────────────────────────────────────────
    @Column(nullable = false)
    private String ediFileName;

    @Column(nullable = false)
    private Long ediFileSizeBytes;

    // ── Fichier CSV généré ───────────────────────────────────────────────────
    private String csvFileName;
    private Long   csvFileSizeBytes;

    // ── Statistiques de conversion ───────────────────────────────────────────
    private Integer messageCount;
    private Integer lineCount;

    // ── Résultat ─────────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversionStatus status;

    @Column(length = 1000)
    private String errorMessage;

    // ── Auteur ───────────────────────────────────────────────────────────────
    @Column(nullable = false, name = "converted_by_matricule")
    private String convertedByMatricule;

    @Column(nullable = false)
    private String convertedByName;

    @Column(nullable = false, name = "converted_at")
    private LocalDateTime convertedAt;

    // ── Contenu CSV (re-téléchargement) ──────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String csvContent;

    // ── Métadonnées EDI ───────────────────────────────────────────────────────
    private String    interchangeRef;
    private String    senderCode;
    private String    receiverCode;
    private LocalDate ediFileDate;

    // ── Enum ──────────────────────────────────────────────────────────────────
    public enum ConversionStatus {
        SUCCESS, ERROR
    }
}

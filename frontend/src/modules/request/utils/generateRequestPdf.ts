import jsPDF from "jspdf";
import type { RequestColumn } from "@/modules/request/components/columns";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  ATTESTATION_DE_TRAVAIL: "ATTESTATION DE TRAVAIL",
  ATTESTATION_DE_SALAIRE: "ATTESTATION DE SALAIRE",
  FICHE_DE_PAIE:          "FICHE DE PAIE",
  "DÉCLARATION_D_IMPÔTS": "DÉCLARATION D'IMPÔTS",
  RNE:                    "REGISTRE NATIONAL DES ENTREPRISES",
};

const REQUEST_BODY: Record<string, (card: RequestColumn) => string[]> = {
  ATTESTATION_DE_TRAVAIL: (card) => [
    "Nous soussignés, la Direction des Ressources Humaines de la société",
    "SAGE RH AUTOMOTIVE, certifions que :",
    "",
    `${card.employee.civility === "MONSIEUR" ? "M." : "Mme"} ${card.employee.fullName}`,
    `Matricule : ${card.employee.matricule}`,
    `Poste occupé : ${card.employee.jobTitle}`,
    `Département : ${card.employee.department}`,
    `Type de contrat : ${card.employee.employmentType}`,
    "",
    "est bien employé(e) au sein de notre société.",
    "",
    "En foi de quoi, la présente attestation est délivrée à l'intéressé(e)",
    "pour servir et valoir ce que de droit.",
  ],
  ATTESTATION_DE_SALAIRE: (card) => [
    "Nous soussignés, la Direction des Ressources Humaines de la société",
    "SAGE RH AUTOMOTIVE, attestons que :",
    "",
    `${card.employee.civility === "MONSIEUR" ? "M." : "Mme"} ${card.employee.fullName}`,
    `Matricule : ${card.employee.matricule}`,
    `Poste occupé : ${card.employee.jobTitle}`,
    `Département : ${card.employee.department}`,
    `Type de contrat : ${card.employee.employmentType}`,
    "",
    "perçoit régulièrement son salaire conformément à son contrat de travail.",
    "",
    "Cette attestation est délivrée à la demande de l'intéressé(e)",
    "pour servir et valoir ce que de droit.",
  ],
  FICHE_DE_PAIE: (card) => [
    "La présente fiche de paie est établie pour :",
    "",
    `${card.employee.civility === "MONSIEUR" ? "M." : "Mme"} ${card.employee.fullName}`,
    `Matricule : ${card.employee.matricule}`,
    `Poste occupé : ${card.employee.jobTitle}`,
    `Département : ${card.employee.department}`,
    `Type de contrat : ${card.employee.employmentType}`,
    "",
    "Document établi conformément à la législation en vigueur.",
    "",
    "Pour toute information complémentaire, veuillez contacter",
    "le service des Ressources Humaines.",
  ],
  "DÉCLARATION_D_IMPÔTS": (card) => [
    "Nous soussignés, la Direction des Ressources Humaines de la société",
    "SAGE RH AUTOMOTIVE, déclarons que :",
    "",
    `${card.employee.civility === "MONSIEUR" ? "M." : "Mme"} ${card.employee.fullName}`,
    `Matricule : ${card.employee.matricule}`,
    `Poste occupé : ${card.employee.jobTitle}`,
    `Département : ${card.employee.department}`,
    `Type de contrat : ${card.employee.employmentType}`,
    "",
    "est assujetti(e) à l'impôt sur le revenu conformément",
    "à la législation fiscale en vigueur.",
    "",
    "Document établi pour les besoins de la déclaration fiscale annuelle.",
  ],
  RNE: (card) => [
    "Nous soussignés, la Direction des Ressources Humaines de la société",
    "SAGE RH AUTOMOTIVE, certifions que :",
    "",
    `${card.employee.civility === "MONSIEUR" ? "M." : "Mme"} ${card.employee.fullName}`,
    `Matricule : ${card.employee.matricule}`,
    `Poste occupé : ${card.employee.jobTitle}`,
    `Département : ${card.employee.department}`,
    `Type de contrat : ${card.employee.employmentType}`,
    "",
    "figure bien dans le Registre National des Entreprises",
    "en tant qu'employé(e) de notre société.",
    "",
    "Document établi conformément aux dispositions légales en vigueur.",
  ],
};

export function generateRequestPdf(card: RequestColumn): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin - 5, 10, contentW + 10, pageH - 20, 3, 3, "F");

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(26, 35, 50);
  doc.rect(margin - 5, 10, contentW + 10, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SAGE RH", margin, 26);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("AUTOMOTIVE", margin, 32);

  const refDate = new Date();
  const ref = `REF-${card.id}-${refDate.getFullYear()}`;
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(ref, pageW - margin, 28, { align: "right" });

  // ── Orange accent line ───────────────────────────────────────────────────────
  doc.setFillColor(232, 93, 38);
  doc.rect(margin - 5, 38, contentW + 10, 2, "F");

  // ── Document title ───────────────────────────────────────────────────────────
  const title = REQUEST_TYPE_LABELS[card.requestType] || card.requestType.replace(/_/g, " ");
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 35, 50);
  doc.text(title, pageW / 2, 56, { align: "center" });

  const titleW = doc.getTextWidth(title);
  doc.setDrawColor(232, 93, 38);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - titleW / 2, 59, pageW / 2 + titleW / 2, 59);

  // ── Date ────────────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text(`Tunis, le ${dateStr}`, pageW - margin, 70, { align: "right" });

  // ── Body ─────────────────────────────────────────────────────────────────────
  const bodyLines = REQUEST_BODY[card.requestType]?.(card) ?? [];
  let y = 85;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 50, 65);

  for (const line of bodyLines) {
    if (line === "") { y += 5; continue; }

    if (line.startsWith("M.") || line.startsWith("Mme")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(26, 35, 50);
      doc.text(line, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(40, 50, 65);
    } else if (line.includes(" : ")) {
      const colonIdx = line.indexOf(" : ");
      const key = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 3);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 35, 50);
      doc.text(`${key} :`, margin, y);
      const keyW = doc.getTextWidth(`${key} : `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 50, 65);
      doc.text(val, margin + keyW, y);
    } else {
      doc.text(line, margin, y);
    }
    y += 7;
  }

  // ── Signature ────────────────────────────────────────────────────────────────
  y = Math.max(y + 15, 210);
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);

  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 35, 50);
  doc.text("Le Responsable des Ressources Humaines", pageW - margin, y, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 130);
  doc.text("Signature et cachet", pageW - margin, y, { align: "right" });

  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.rect(pageW - margin - 60, y + 5, 60, 25);

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFillColor(26, 35, 50);
  doc.rect(margin - 5, pageH - 20, contentW + 10, 12, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("SAGE RH AUTOMOTIVE — Document officiel généré automatiquement", pageW / 2, pageH - 13, { align: "center" });
  doc.text(`Généré le ${dateStr} — Réf. ${ref}`, pageW / 2, pageH - 8, { align: "center" });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const filename = `${title.replace(/ /g, "_")}_${card.employee.matricule}_${refDate.getFullYear()}.pdf`;
  doc.save(filename);
}
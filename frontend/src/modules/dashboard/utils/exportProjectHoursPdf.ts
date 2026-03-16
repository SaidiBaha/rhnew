import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RowProjet = {
  idProjet: number;
  nomProjet: string;
  nomSuperviseur: string;
  matriculeSuperviseur: string | null;
  heuresAjoutees: number;
  heuresTransferees: number;
};

function pickFontSize(rowCount: number) {
  if (rowCount <= 12) return 10;
  if (rowCount <= 18) return 9;
  if (rowCount <= 24) return 8;
  if (rowCount <= 30) return 7;
  return 6;
}

export function exportProjectHoursToPdf(rows: RowProjet[], du: string, au: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  // const pageH = doc.internal.pageSize.getHeight(); // ❌ Supprimé ou commenté car non utilisé

  const left = 8;
  const right = 8;

  doc.setFontSize(13);
  doc.text("Heures ajoutées / transférées par projet", left, 10);

  doc.setFontSize(9);
  doc.text(`Période: ${du} - ${au}`, left, 15);

  const fontSize = pickFontSize(rows.length);

  const body = rows.map((r) => [
    r.nomProjet,
    r.nomSuperviseur || "",
    r.matriculeSuperviseur ?? "",
    Number(r.heuresAjoutees ?? 0).toFixed(2),
    Number(r.heuresTransferees ?? 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: 18,
    margin: { left, right, top: 0, bottom: 6 },
    tableWidth: "auto",

    head: [[
      "Projet",
      "Superviseur (récepteur)",
      "Matricule",
      "Heures ajoutées",
      "Heures transférées",
    ]],
    body,

    styles: {
      fontSize,
      cellPadding: 1.2,
      overflow: "hidden",
      valign: "middle",
      lineWidth: 0.1,
    },

    headStyles: {
      fontSize: Math.max(fontSize, 7),
      fontStyle: "bold",
      minCellHeight: 6,
    },

    bodyStyles: {
      minCellHeight: 5,
    },

    columnStyles: {
      0: { cellWidth: (pageW - (left + right)) * 0.18 },
      1: { cellWidth: (pageW - (left + right)) * 0.36 },
      2: { cellWidth: (pageW - (left + right)) * 0.12 },
      3: { cellWidth: (pageW - (left + right)) * 0.17, halign: "right" },
      4: { cellWidth: (pageW - (left + right)) * 0.17, halign: "right" },
    },

    didParseCell: (data) => {
      if (data.section === "body") {
        const txt = String(data.cell.text?.[0] ?? "");
        if (data.column.index === 0 && txt.length > 18) data.cell.text = [txt.slice(0, 18) + "…"];
        if (data.column.index === 1 && txt.length > 28) data.cell.text = [txt.slice(0, 28) + "…"];
      }
    },
  });

  doc.save(`dashboard_project_hours_${du}_to_${au}.pdf`);
}
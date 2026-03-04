import { Workbook } from "exceljs";
import { saveAs } from "file-saver";

export type DashboardRowProjet = {
    idProjet: number;
    nomProjet: string;

    idSuperviseur: number | null;
    nomSuperviseur: string;
    matriculeSuperviseur: string | null;

    heuresAjoutees: number;
    heuresTransferees: number;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatDateForFile(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const BRAND     = "FF687818"; // olive principale
const BRAND_DRK = "FF4a5a0e"; // olive foncée (sous-header)
const WHITE     = "FFFFFFFF";
const BLUE_H    = "FF1D4ED8"; // heures ajoutées
const AMBER_H   = "FFB45309"; // heures transférées
const ROW_ODD   = "FFF8FAF0"; // vert très pâle (lignes impaires)
const BORDER_C  = "FFD4DDB0"; // bordure ton vert doux

export async function exportProjectHoursToExcel(
    rows: DashboardRowProjet[],
    du: string,
    au: string
) {
    const wb = new Workbook();
    wb.creator = "Sage Automotive RH";
    wb.created = new Date();

    const ws = wb.addWorksheet("Dashboard", {
        views: [{ state: "frozen", ySplit: 2 }],
    });

    /* ── Largeurs colonnes ── */
    ws.columns = [
        { key: "projet",      width: 30 },
        { key: "superviseur", width: 30 },
        { key: "matricule",   width: 22 },
        { key: "ajoutees",    width: 22 },
        { key: "transferees", width: 24 },
    ];

    /* ── Ligne titre (fusionnée A1:E1) ── */
    ws.mergeCells("A1:E1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `Heures par Projet — Période : ${du}  →  ${au}`;
    titleCell.font  = { bold: true, size: 13, color: { argb: WHITE } };
    titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    /* ── Ligne en-têtes ── */
    const HEADERS = [
        "Projet",
        "Superviseur",
        "Matricule Superviseur",
        "Heures Ajoutées (h)",
        "Heures Transférées (h)",
    ];
    const headerRow = ws.addRow(HEADERS);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font      = { bold: true, color: { argb: WHITE }, size: 10 };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DRK } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border    = {
            bottom: { style: "medium", color: { argb: BRAND } },
            right:  { style: "thin",   color: { argb: WHITE } },
        };
    });

    /* ── Lignes de données ── */
    rows.forEach((r, i) => {
        const row = ws.addRow([
            r.nomProjet,
            r.nomSuperviseur || "",
            r.matriculeSuperviseur || "",
            Number(r.heuresAjoutees   ?? 0),
            Number(r.heuresTransferees ?? 0),
        ]);
        row.height = 18;

        const bgColor = i % 2 === 0 ? WHITE : ROW_ODD;

        row.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            cell.alignment = { vertical: "middle" };
            cell.border    = {
                top:    { style: "hair", color: { argb: BORDER_C } },
                bottom: { style: "hair", color: { argb: BORDER_C } },
                left:   { style: "hair", color: { argb: BORDER_C } },
                right:  { style: "hair", color: { argb: BORDER_C } },
            };

            if (col === 4) {
                cell.numFmt    = "0.00";
                cell.alignment = { horizontal: "right", vertical: "middle" };
                cell.font      = { color: { argb: BLUE_H }, bold: true };
            }
            if (col === 5) {
                cell.numFmt    = "0.00";
                cell.alignment = { horizontal: "right", vertical: "middle" };
                cell.font      = { color: { argb: AMBER_H }, bold: true };
            }
        });
    });

    /* ── Ligne totaux ── */
    const totalAjoutees    = rows.reduce((s, r) => s + Number(r.heuresAjoutees   ?? 0), 0);
    const totalTransferees = rows.reduce((s, r) => s + Number(r.heuresTransferees ?? 0), 0);

    const totalRow = ws.addRow(["", "TOTAUX", "", totalAjoutees, totalTransferees]);
    totalRow.height = 22;
    totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font      = { bold: true, color: { argb: WHITE }, size: 11 };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
        cell.border    = { top: { style: "medium", color: { argb: WHITE } } };
        cell.alignment = { vertical: "middle" };
        if (col === 4 || col === 5) {
            cell.numFmt    = "0.00";
            cell.alignment = { horizontal: "right", vertical: "middle" };
        }
    });

    /* ── Export ── */
    const now      = formatDateForFile(new Date());
    const filename = `dashboard_heures_${du}_${au}_export_${now}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename
    );
}

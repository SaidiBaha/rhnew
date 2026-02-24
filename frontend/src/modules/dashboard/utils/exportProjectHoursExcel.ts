import * as XLSX from "xlsx";
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

export function exportProjectHoursToExcel(rows: DashboardRowProjet[], du: string, au: string) {
    const data = rows.map((r) => ({
        "Projet": r.nomProjet,
        "Superviseur": r.nomSuperviseur || "",
        "Matricule Superviseur": r.matriculeSuperviseur || "",
        "Heures ajoutées": Number(r.heuresAjoutees ?? 0),
        "Heures transférées": Number(r.heuresTransferees ?? 0),
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Largeurs colonnes
    ws["!cols"] = [
        { wch: 10 },
        { wch: 32 },
        { wch: 28 },
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
    ];

    // Format 2 décimales sur colonnes heures (E,F)
    for (let row = 2; row <= data.length + 1; row++) {
        const cellE = ws[`E${row}`];
        const cellF = ws[`F${row}`];
        if (cellE) cellE.z = "0.00";
        if (cellF) cellF.z = "0.00";
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");

    const now = formatDateForFile(new Date());
    const filename = `dashboard_project_hours_${du}_to_${au}_${now}.xlsx`;

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, filename);
}
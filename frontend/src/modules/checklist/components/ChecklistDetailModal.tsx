import { useMemo } from "react";
import { X, FileDown, Sheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Workbook } from "exceljs";
import { saveAs } from "file-saver";
import { Loader } from "@/components/Loader";
import { useFetchInstanceById } from "@/modules/checklist/hooks/useFetchInstanceById";
import { useFetchTemplateById } from "@/modules/checklist/hooks/useFetchTemplateById";
import type { ChecklistItemDto, ChecklistCategoryDto } from "@/modules/checklist/types";

interface Props {
  instanceId: number;
  onClose: () => void;
}

function getAuditLevel(pct: number) {
  if (pct >= 96)
    return { level: "Niveau 0", color: "#007a58", bg: "rgba(0,196,140,0.12)", border: "#00c48c", message: "Rien à signaler" };
  if (pct >= 60)
    return { level: "Niveau 1", color: "#b86f00", bg: "rgba(255,140,0,0.12)", border: "#ff8c00", message: "Escalation TOP Five — Actions correctives rapides" };
  return { level: "Niveau 2/3", color: "#c0392b", bg: "rgba(240,62,62,0.12)", border: "#f03e3e", message: "Arrêter l'activité — Réunion urgente" };
}

type FlatItem = {
  item: ChecklistItemDto;
  category: ChecklistCategoryDto;
  categorySize: number;
  isFirstInCategory: boolean;
  globalIndex: number;
};

function buildFilename(prefix: string, lineUnit: string | undefined, date: string | undefined, ext: string) {
  const line = (lineUnit || "").replace(/[^a-zA-Z0-9_\-]/g, "_") || "HSE";
  const d = date ? date.split("T")[0] : new Date().toISOString().split("T")[0];
  return `${prefix}_${line}_${d}.${ext}`;
}

async function loadLogoAsPngDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = "/logo.webp";
  });
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function ChecklistDetailModal({ instanceId, onClose }: Props) {
  const { data: instance, isLoading: loadingInst } = useFetchInstanceById(instanceId);
  const { data: template, isLoading: loadingTemplate } = useFetchTemplateById(
    instance?.templateId ?? null
  );

  const isLoading = loadingInst || (!!instance && loadingTemplate);

  const responseMap = useMemo(() => {
    const map: Record<number, { response?: string; ecartDescription?: string }> = {};
    instance?.responses?.forEach((r) => {
      map[r.itemId] = { response: r.response, ecartDescription: r.ecartDescription };
    });
    return map;
  }, [instance?.responses]);

  const flatItems = useMemo((): FlatItem[] => {
    if (!template) return [];
    const items: FlatItem[] = [];
    let idx = 0;
    template.categories.forEach((cat) => {
      cat.items.forEach((item, ii) => {
        idx++;
        items.push({
          item,
          category: cat,
          categorySize: cat.items.length,
          isFirstInCategory: ii === 0,
          globalIndex: idx,
        });
      });
    });
    return items;
  }, [template]);

  const score = useMemo(() => {
    const answered = flatItems.filter((fi) => responseMap[fi.item.id]?.response);
    const ok = answered.filter((fi) => responseMap[fi.item.id]?.response === "OK").length;
    const nok = answered.filter((fi) => responseMap[fi.item.id]?.response === "NOK").length;
    const na = answered.filter((fi) => responseMap[fi.item.id]?.response === "NA").length;
    const total = ok + nok + na;
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { ok, nok, na, total, pct };
  }, [flatItems, responseMap]);

  const auditLevel = getAuditLevel(score.pct);

  /* ── Export PDF ── */
  const handleExportPdf = async () => {
    if (!instance || !template) return;

    const logoDataUrl = await loadLogoAsPngDataUrl();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const left = 10;
    const right = 10;
    const usableW = pageW - left - right;

    // Logo (top-left)
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", left, 3, 28, 14);
    }

    // Title (centered)
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Check-list GEMBA WALK HSE", pageW / 2, 11, { align: "center" });

    // Reference (top-right)
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("SAGE-FOR-DRH-62 — Révision : 00 — Date : 28/01/2026", pageW - right, 6, { align: "right" });

    // Info table
    autoTable(doc, {
      startY: 20,
      margin: { left, right },
      tableWidth: usableW,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: usableW * 0.14 },
        1: { cellWidth: usableW * 0.36 },
        2: { fontStyle: "bold", cellWidth: usableW * 0.18 },
        3: { cellWidth: usableW * 0.32 },
      },
      body: [
        ["Date", instance.date ? new Date(instance.date).toLocaleDateString("fr-FR") : "—", "Auditeur", instance.auditor || "—"],
        ["Ligne / Unité", instance.lineUnit || "—", "Visa auditeur", instance.auditorVisa || "—"],
        ["Chef d'équipe", instance.teamLeader || "—", "Responsable Ligne/Unité", instance.lineResponsible || "—"],
      ],
    });

    const afterHeader = (doc as any).lastAutoTable?.finalY ?? 42;

    // Build body with text-based status indicators
    const tableBody: (string | number)[][] = flatItems.map((fi) => {
      const resp = responseMap[fi.item.id] ?? {};
      return [
        fi.globalIndex,
        fi.isFirstInCategory ? fi.category.name : "",
        fi.item.label,
        resp.response === "OK" ? "OUI" : "",
        resp.response === "NOK" ? "NON" : "",
        resp.response === "NA" ? "—" : "",
        resp.ecartDescription || "",
      ];
    });

    autoTable(doc, {
      startY: afterHeader + 4,
      margin: { left, right },
      tableWidth: usableW,
      theme: "grid",
      head: [["N°", "Catégorie", "Points à vérifier", "OK", "N'OK", "NA", "Description de l'écart"]],
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [47, 107, 255], textColor: 255, fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: usableW * 0.04, halign: "center" },
        1: { cellWidth: usableW * 0.14, fontStyle: "bold" },
        2: { cellWidth: usableW * 0.32 },
        3: { cellWidth: usableW * 0.05, halign: "center" },
        4: { cellWidth: usableW * 0.05, halign: "center" },
        5: { cellWidth: usableW * 0.04, halign: "center" },
        6: { cellWidth: usableW * 0.36 },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = data.column.index;
        const raw = String(data.cell.raw ?? "");
        const rowRaw = data.row.raw as (string | number)[];

        // NOK rows: light red background on all cells
        if (Array.isArray(rowRaw) && rowRaw[4] === "NON") {
          data.cell.styles.fillColor = [254, 242, 242];
        }

        // Column-specific overrides
        if (col === 3 && raw === "OUI") {
          data.cell.styles.fillColor = [212, 237, 218];
          data.cell.styles.textColor = [21, 87, 36];
          data.cell.styles.fontStyle = "bold";
        } else if (col === 4 && raw === "NON") {
          data.cell.styles.fillColor = [248, 215, 218];
          data.cell.styles.textColor = [114, 28, 36];
          data.cell.styles.fontStyle = "bold";
        } else if (col === 5 && raw === "—") {
          data.cell.styles.fillColor = [233, 236, 239];
          data.cell.styles.textColor = [73, 80, 87];
        }
      },
    });

    const afterTable = (doc as any).lastAutoTable?.finalY ?? 200;

    const scoreY = afterTable + 8;
    if (scoreY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Résultats :  OK = ${score.ok}    N'OK = ${score.nok}    NA = ${score.na}    Score = ${score.pct}%`,
        left,
        scoreY
      );
      const level = getAuditLevel(score.pct);
      doc.setTextColor(level.color);
      doc.text(`${level.level} — ${level.message}`, left, scoreY + 6);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
    }

    if (instance.assignments && instance.assignments.length > 0) {
      doc.addPage("a4", "landscape");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TABLEAU DE SUIVI DES ASSIGNATIONS", left, 14);

      autoTable(doc, {
        startY: 20,
        margin: { left, right },
        tableWidth: usableW,
        theme: "grid",
        head: [["N°", "Action", "Responsable", "Délai", "Date Réalisation"]],
        body: instance.assignments.map((a, i) => [
          i + 1,
          a.action || "",
          a.responsable || "",
          a.delai ? new Date(a.delai).toLocaleDateString("fr-FR") : "",
          a.dateRealisation ? new Date(a.dateRealisation).toLocaleDateString("fr-FR") : "",
        ]),
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [47, 107, 255], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: usableW * 0.04, halign: "center" },
          1: { cellWidth: usableW * 0.50 },
          2: { cellWidth: usableW * 0.20 },
          3: { cellWidth: usableW * 0.13 },
          4: { cellWidth: usableW * 0.13 },
        },
      });
    }

    doc.save(buildFilename("Checklist_HSE", instance.lineUnit, instance.date, "pdf"));
  };

  /* ── Export Excel ── */
  const handleExportExcel = async () => {
    if (!instance || !template) return;

    const logoDataUrl = await loadLogoAsPngDataUrl();

    const wb = new Workbook();
    wb.creator = "Sage Automotive RH";
    wb.created = new Date();
    const ws = wb.addWorksheet("Checklist HSE");

    const BLUE = "FF2F6BFF";
    const WHITE = "FFFFFFFF";
    const LIGHT_BLUE = "FFEEF3FF";
    const LIGHT_RED = "FFFDECEA";
    const LIGHT_GRAY = "FFF4F6FB";
    const BORDER_COLOR = "FFE4E8F0";

    const border = {
      top: { style: "thin" as const, color: { argb: BORDER_COLOR } },
      bottom: { style: "thin" as const, color: { argb: BORDER_COLOR } },
      left: { style: "thin" as const, color: { argb: BORDER_COLOR } },
      right: { style: "thin" as const, color: { argb: BORDER_COLOR } },
    };

    ws.columns = [
      { key: "a", width: 6 },
      { key: "b", width: 22 },
      { key: "c", width: 54 },
      { key: "d", width: 7 },
      { key: "e", width: 7 },
      { key: "f", width: 7 },
      { key: "g", width: 44 },
    ];

    /* ── Header rows 1–4: Logo area / Title / Reference ── */
    ws.mergeCells("A1:B4");
    const logoAreaCell = ws.getCell("A1");
    logoAreaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

    ws.mergeCells("C1:F2");
    const titleCell = ws.getCell("C1");
    titleCell.value = "Check-list GEMBA WALK HSE";
    titleCell.font = { bold: true, size: 15, color: { argb: "FF1a2340" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    titleCell.border = border;

    ws.mergeCells("C3:F4");
    const underTitleCell = ws.getCell("C3");
    underTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    underTitleCell.border = border;

    ws.mergeCells("G1:G4");
    const refCell = ws.getCell("G1");
    refCell.value = "SAGE-FOR-DRH-62\nRévision : 00\nDate : 28/01/2026";
    refCell.font = { size: 8, color: { argb: "FF4b5675" } };
    refCell.alignment = { horizontal: "right", vertical: "top", wrapText: true };
    refCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
    refCell.border = border;

    [1, 2, 3, 4].forEach((r) => { ws.getRow(r).height = 20; });

    // Logo image overlay
    if (logoDataUrl) {
      const imgBuffer = dataUrlToArrayBuffer(logoDataUrl);
      const imageId = wb.addImage({ buffer: imgBuffer, extension: "png" });
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: 2, row: 4 },
        editAs: "oneCell",
      });
    }

    /* ── Info block rows 5–7 ── */
    const headerData: [string, string, string, string][] = [
      ["Date", instance.date ? new Date(instance.date).toLocaleDateString("fr-FR") : "—", "Auditeur", instance.auditor || "—"],
      ["Ligne / Unité", instance.lineUnit || "—", "Visa auditeur", instance.auditorVisa || "—"],
      ["Chef d'équipe", instance.teamLeader || "—", "Responsable Ligne/Unité", instance.lineResponsible || "—"],
    ];

    headerData.forEach(([lbl1, val1, lbl2, val2], ri) => {
      const rowNum = 5 + ri;
      ws.mergeCells(`A${rowNum}:C${rowNum}`);
      ws.mergeCells(`D${rowNum}:G${rowNum}`);

      const c1 = ws.getCell(`A${rowNum}`);
      c1.value = `${lbl1} : ${val1}`;
      c1.font = { size: 9 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
      c1.border = border;
      c1.alignment = { vertical: "middle" };

      const c2 = ws.getCell(`D${rowNum}`);
      c2.value = `${lbl2} : ${val2}`;
      c2.font = { size: 9 };
      c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
      c2.border = border;
      c2.alignment = { vertical: "middle" };

      ws.getRow(rowNum).height = 18;
    });

    /* ── Row 8: thin separator ── */
    ws.getRow(8).height = 6;

    /* ── Row 9: Column headers ── */
    const colHeaderRow = ws.getRow(9);
    colHeaderRow.values = ["N°", "Catégorie", "Points à vérifier", "OK", "N'OK", "NA", "Description de l'écart"];
    colHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = border;
    });
    colHeaderRow.height = 22;

    /* ── Data rows starting at row 10 ── */
    flatItems.forEach((fi, index) => {
      const resp = responseMap[fi.item.id] ?? {};
      const isNok = resp.response === "NOK";
      const isOk = resp.response === "OK";
      const isNa = resp.response === "NA";
      const labelText = fi.item.label || "";
      const ecartText = resp.ecartDescription || "";

      const rowNum = 10 + index;
      const dataRow = ws.getRow(rowNum);
      dataRow.values = [
        fi.globalIndex,
        fi.isFirstInCategory ? fi.category.name : "",
        labelText,
        isOk ? "✓" : "",
        isNok ? "✗" : "",
        isNa ? "—" : "",
        ecartText,
      ];

      // Auto height: calculate based on wrapped text in the widest columns
      const labelLines = Math.ceil(Math.max(1, labelText.length) / 50);
      const ecartLines = Math.ceil(Math.max(1, ecartText.length) / 40);
      dataRow.height = Math.max(18, Math.max(labelLines, ecartLines) * 14);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = border;
        cell.font = { size: 9 };
        cell.alignment = { vertical: "middle", wrapText: colNumber === 3 || colNumber === 7 };

        if (isNok) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_RED } };
        } else if (index % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
        }

        if (colNumber === 2) {
          cell.font = { bold: true, size: 9, color: { argb: "FF2F6BFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        }
        if (colNumber === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (colNumber === 4 && isOk) cell.font = { bold: true, size: 11, color: { argb: "FF00C48C" } };
        if (colNumber === 5 && isNok) cell.font = { bold: true, size: 11, color: { argb: "FFF03E3E" } };
        if (colNumber === 4 || colNumber === 5 || colNumber === 6)
          cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    /* ── Score row ── */
    const scoreRowNum = 10 + flatItems.length + 1;
    ws.mergeCells(`A${scoreRowNum}:G${scoreRowNum}`);
    const scoreRow = ws.getRow(scoreRowNum);
    scoreRow.getCell(1).value = `Score : OK=${score.ok}  N'OK=${score.nok}  NA=${score.na}  →  ${score.pct}%  (${auditLevel.level} — ${auditLevel.message})`;
    scoreRow.getCell(1).font = { bold: true, size: 10, color: { argb: auditLevel.color.replace("#", "FF").toUpperCase() } };
    scoreRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
    scoreRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    scoreRow.getCell(1).border = border;
    scoreRow.height = 20;

    /* ── Assignments ── */
    if (instance.assignments && instance.assignments.length > 0) {
      const assignTitleRowNum = scoreRowNum + 2;
      ws.mergeCells(`A${assignTitleRowNum}:G${assignTitleRowNum}`);
      const assignTitleRow = ws.getRow(assignTitleRowNum);
      assignTitleRow.getCell(1).value = "TABLEAU DE SUIVI DES ASSIGNATIONS";
      assignTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: WHITE } };
      assignTitleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      assignTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      assignTitleRow.height = 20;

      const assignHeaderRow = ws.getRow(assignTitleRowNum + 1);
      assignHeaderRow.values = ["N°", "Action", "Responsable", "Délai", "Date Réalisation", "", ""];
      assignHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = border;
      });
      assignHeaderRow.height = 18;

      instance.assignments.forEach((a, i) => {
        const rowNum = assignTitleRowNum + 2 + i;
        const row = ws.getRow(rowNum);
        row.values = [
          i + 1,
          a.action || "",
          a.responsable || "",
          a.delai ? new Date(a.delai).toLocaleDateString("fr-FR") : "",
          a.dateRealisation ? new Date(a.dateRealisation).toLocaleDateString("fr-FR") : "",
          "",
          "",
        ];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = border;
          cell.font = { size: 9 };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 2 };
          if (i % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
          if (colNumber === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        row.height = 18;
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      buildFilename("Checklist_HSE", instance.lineUnit, instance.date, "xlsx")
    );
  };

  const headerFields: [string, string][] = instance
    ? [
        ["Date", instance.date ? new Date(instance.date).toLocaleDateString("fr-FR") : "—"],
        ["Ligne / Unité", instance.lineUnit || "—"],
        ["Chef d'équipe", instance.teamLeader || "—"],
      ]
    : [];

  const headerFieldsRight: [string, string][] = instance
    ? [
        ["Auditeur", instance.auditor || "—"],
        ["Visa auditeur", instance.auditorVisa || "—"],
        ["Responsable Ligne/Unité", instance.lineResponsible || "—"],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-6 px-4">
      <div
        className="w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--white)", border: "1px solid var(--border)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 rounded-t-2xl"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--white)" }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Détails de la checklist
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {instance?.templateTitle ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isLoading || !instance || !template}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent2)" }}
            >
              <Sheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isLoading || !instance || !template}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--bg)]" style={{ color: "var(--muted)" }}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {isLoading ? (
          <div className="p-16">
            <Loader />
          </div>
        ) : !instance || !template ? (
          <div className="p-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            Données introuvables.
          </div>
        ) : (
          <div className="px-6 py-6 space-y-8">

            {/* ── Bloc en-tête document ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: "2px solid var(--border)" }}>
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ background: "var(--accent)" }}
              >
                <span className="font-bold text-base text-white">Check-list GEMBA WALK HSE</span>
                <div className="text-right text-xs text-white space-y-0.5">
                  <div className="font-bold">SAGE-FOR-DRH-62</div>
                  <div>Révision : 00</div>
                  <div>Date : 28/01/2026</div>
                </div>
              </div>
              <div className="grid grid-cols-2" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="divide-y" style={{ borderRight: "1px solid var(--border)" }}>
                  {headerFields.map(([label, value]) => (
                    <div key={label} className="flex">
                      <span
                        className="w-44 shrink-0 px-3 py-2 text-xs font-semibold"
                        style={{ background: "var(--bg)", color: "var(--text2)", borderRight: "1px solid var(--border)" }}
                      >
                        {label}
                      </span>
                      <span className="flex-1 px-3 py-2 text-sm" style={{ color: "var(--text)" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="divide-y">
                  {headerFieldsRight.map(([label, value]) => (
                    <div key={label} className="flex">
                      <span
                        className="w-52 shrink-0 px-3 py-2 text-xs font-semibold"
                        style={{ background: "var(--bg)", color: "var(--text2)", borderRight: "1px solid var(--border)" }}
                      >
                        {label}
                      </span>
                      <span className="flex-1 px-3 py-2 text-sm" style={{ color: "var(--text)" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Tableau des points ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "var(--accent)" }}>
                    <th className="px-2 py-2.5 text-center font-semibold text-white w-10" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>N°</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-white w-32" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>Catégorie</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-white" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>Points à vérifier</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-white w-20" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>Critères OK</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-white w-12" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>OK</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-white w-14" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>N'OK</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-white w-10" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>NA</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-white" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>Description de l'écart</th>
                  </tr>
                </thead>
                <tbody>
                  {flatItems.map((fi) => {
                    const resp = responseMap[fi.item.id] ?? {};
                    const isNok = resp.response === "NOK";
                    return (
                      <tr
                        key={fi.item.id}
                        style={{
                          background: isNok
                            ? "rgba(240,62,62,0.04)"
                            : fi.globalIndex % 2 === 0
                            ? "var(--bg)"
                            : "var(--white)",
                        }}
                      >
                        <td
                          className="px-2 py-2 text-center font-mono"
                          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                          {fi.globalIndex}
                        </td>

                        {fi.isFirstInCategory && (
                          <td
                            rowSpan={fi.categorySize}
                            className="px-2 py-2 text-center font-semibold align-middle"
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--accent-light)",
                              color: "var(--accent)",
                              verticalAlign: "middle",
                              writingMode: fi.categorySize > 3 ? "vertical-rl" : "horizontal-tb",
                              textOrientation: "mixed",
                              transform: fi.categorySize > 3 ? "rotate(180deg)" : "none",
                            }}
                          >
                            {fi.category.name}
                          </td>
                        )}

                        <td
                          className="px-2 py-2"
                          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                        >
                          {fi.item.label}
                        </td>

                        <td
                          className="px-2 py-2 text-center"
                          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                          —
                        </td>

                        <td
                          className="px-2 py-2 text-center text-base"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          {resp.response === "OK" && (
                            <span style={{ color: "var(--accent2)" }}>✓</span>
                          )}
                        </td>

                        <td
                          className="px-2 py-2 text-center text-base"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          {resp.response === "NOK" && (
                            <span style={{ color: "var(--accent4)" }}>✗</span>
                          )}
                        </td>

                        <td
                          className="px-2 py-2 text-center font-medium"
                          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                          {resp.response === "NA" && "—"}
                        </td>

                        <td
                          className="px-2 py-2"
                          style={{
                            border: "1px solid var(--border)",
                            color: isNok ? "var(--accent4)" : "var(--text2)",
                            background: isNok ? "rgba(240,62,62,0.06)" : "transparent",
                          }}
                        >
                          {resp.ecartDescription || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Score & Niveau d'audit ── */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            >
              <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: "var(--text2)" }}>
                <span className="font-semibold">OUI : Nbre OK / Nbre Total</span>
                <span className="mx-2">=</span>
                <span
                  className="rounded-full px-3 py-0.5 font-bold text-sm"
                  style={{ background: "rgba(0,196,140,0.15)", color: "#007a58" }}
                >
                  OK : {score.ok}
                </span>
                <span
                  className="rounded-full px-3 py-0.5 font-bold text-sm"
                  style={{ background: "rgba(240,62,62,0.15)", color: "#c0392b" }}
                >
                  N'OK : {score.nok}
                </span>
                <span
                  className="rounded-full px-3 py-0.5 font-bold text-sm"
                  style={{ background: "rgba(154,163,184,0.2)", color: "var(--muted)" }}
                >
                  NA : {score.na}
                </span>
              </div>
              <div className="text-sm" style={{ color: "var(--text2)" }}>
                Résultat = (OK / (OK + N'OK + NA)) × 100 ={" "}
                <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
                  {score.pct}%
                </span>
              </div>
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{
                  background: auditLevel.bg,
                  border: `1.5px solid ${auditLevel.border}`,
                }}
              >
                <span className="font-bold text-sm" style={{ color: auditLevel.color }}>
                  {auditLevel.level}
                </span>
                <span className="text-sm" style={{ color: auditLevel.color }}>
                  — {auditLevel.message}
                </span>
              </div>
            </div>

            {/* ── Tableau de suivi des assignations ── */}
            {instance.assignments && instance.assignments.length > 0 && (
              <div>
                <h3
                  className="mb-3 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--text2)" }}
                >
                  Tableau de suivi des assignations
                </h3>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--accent)" }}>
                        <th className="px-3 py-2.5 text-center font-semibold text-white w-10">N°</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-white">Action</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-white w-36">Responsable</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-white w-28">Délai</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-white w-36">Date Réalisation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instance.assignments.map((a, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom:
                              i < (instance.assignments?.length ?? 0) - 1
                                ? "1px solid var(--border)"
                                : "none",
                          }}
                          className="hover:bg-[var(--bg)] transition-colors"
                        >
                          <td className="px-3 py-2.5 text-center font-mono text-xs" style={{ color: "var(--text2)" }}>
                            {i + 1}
                          </td>
                          <td className="px-3 py-2.5 text-sm" style={{ color: "var(--text)" }}>
                            {a.action || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text2)" }}>
                            {a.responsable || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs" style={{ color: "var(--text2)" }}>
                            {a.delai ? new Date(a.delai).toLocaleDateString("fr-FR") : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs" style={{ color: "var(--text2)" }}>
                            {a.dateRealisation
                              ? new Date(a.dateRealisation).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

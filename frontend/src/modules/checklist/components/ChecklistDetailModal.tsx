import { useMemo, useState } from "react";
import { X, FileDown, Sheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Workbook } from "exceljs";
import { saveAs } from "file-saver";
import axios from "axios";
import { Loader } from "@/components/Loader";
import { useFetchInstanceById } from "@/modules/checklist/hooks/useFetchInstanceById";
import { useFetchTemplateById } from "@/modules/checklist/hooks/useFetchTemplateById";
import { PhotoGalleryModal, PhotoIndicator } from "./PhotoGalleryModal";
import useAuth from "@/hooks/useAuth";
import type {
  ChecklistItemDto,
  ChecklistCategoryDto,
  ChecklistResponsePhotoMeta,
} from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface Props {
  instanceId: number;
  onClose: () => void;
  completedLate?: boolean;
}

function getAuditLevel(pct: number) {
  if (pct >= 96)
    return {
      level: "Niveau 0",
      color: "#007a58",
      bg: "rgba(0,196,140,0.12)",
      border: "#00c48c",
      message: "Rien à signaler",
    };
  if (pct >= 60)
    return {
      level: "Niveau 1",
      color: "#b86f00",
      bg: "rgba(255,140,0,0.12)",
      border: "#ff8c00",
      message: "Escalation TOP Five — Actions correctives rapides",
    };
  return {
    level: "Niveau 2/3",
    color: "#c0392b",
    bg: "rgba(240,62,62,0.12)",
    border: "#f03e3e",
    message: "Arrêter l'activité — Réunion urgente",
  };
}

type FlatItem = {
  item: ChecklistItemDto;
  category: ChecklistCategoryDto;
  categorySize: number;
  isFirstInCategory: boolean;
  globalIndex: number;
};

type GalleryData = {
  responseId: number;
  itemLabel: string;
  categoryName: string;
};

function buildFilename(
  prefix: string,
  lineUnit: string | undefined,
  date: string | undefined,
  ext: string
) {
  const line =
    (lineUnit || "").replace(/[^a-zA-Z0-9_\-]/g, "_") || "HSE";
  const d = date
    ? date.split("T")[0]
    : new Date().toISOString().split("T")[0];
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
      if (!ctx) {
        resolve(null);
        return;
      }
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

/* ── Photo export helpers ── */

async function fetchPhotosMeta(
  responseId: number,
  token: string | null
): Promise<ChecklistResponsePhotoMeta[]> {
  try {
    const { data } = await axios.get<ChecklistResponsePhotoMeta[]>(
      `${API_BASE_URL}/checklist/responses/${responseId}/photos`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    );
    return data;
  } catch {
    return [];
  }
}

async function fetchPhotoForPdf(
  photoId: number,
  token: string | null
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" | "WEBP" } | null> {
  try {
    const resp = await axios.get<Blob>(
      `${API_BASE_URL}/checklist/photos/${photoId}`,
      {
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    const blob = resp.data;
    const format: "JPEG" | "PNG" | "WEBP" =
      blob.type === "image/png"
        ? "PNG"
        : blob.type === "image/webp"
        ? "WEBP"
        : "JPEG";
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

async function fetchPhotoForExcel(
  photoId: number,
  token: string | null
): Promise<{ buffer: ArrayBuffer; extension: "jpeg" | "png" } | null> {
  try {
    const resp = await axios.get<Blob>(
      `${API_BASE_URL}/checklist/photos/${photoId}`,
      {
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    const blob = resp.data;
    const extension: "jpeg" | "png" =
      blob.type === "image/png" ? "png" : "jpeg";
    const buffer = await blob.arrayBuffer();
    return { buffer, extension };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────── */

export function ChecklistDetailModal({ instanceId, onClose, completedLate = false }: Props) {
  const { auth } = useAuth();
  const { data: instance, isLoading: loadingInst } =
    useFetchInstanceById(instanceId);
  const { data: template, isLoading: loadingTemplate } = useFetchTemplateById(
    instance?.templateId ?? null
  );

  const isLoading = loadingInst || (!!instance && loadingTemplate);

  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);

  const responseMap = useMemo(() => {
    const map: Record<number, { response?: string; ecartDescription?: string }> =
      {};
    instance?.responses?.forEach((r) => {
      map[r.itemId] = {
        response: r.response,
        ecartDescription: r.ecartDescription,
      };
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
    const answered = flatItems.filter(
      (fi) => responseMap[fi.item.id]?.response
    );
    const ok = answered.filter(
      (fi) => responseMap[fi.item.id]?.response === "OK"
    ).length;
    const nok = answered.filter(
      (fi) => responseMap[fi.item.id]?.response === "NOK"
    ).length;
    const na = answered.filter(
      (fi) => responseMap[fi.item.id]?.response === "NA"
    ).length;
    const total = ok + nok + na;
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { ok, nok, na, total, pct };
  }, [flatItems, responseMap]);

  const auditLevel = getAuditLevel(score.pct);

  /* ── Export PDF ── */
  const handleExportPdf = async () => {
    if (!instance || !template) return;
    const token =
      (auth as any)?.accessToken || (auth as any)?.token || null;

    const logoDataUrl = await loadLogoAsPngDataUrl();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const left = 10;
    const right = 10;
    const usableW = pageW - left - right;

    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", left, 3, 28, 14);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Check-list GEMBA WALK HSE", pageW / 2, 11, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "SAGE-FOR-DRH-62 — Révision : 00 — Date : 28/01/2026",
      pageW - right,
      6,
      { align: "right" }
    );

    if (completedLate) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 80, 0);
      doc.text("⚠ Audit complété en retard", pageW / 2, 18, { align: "center" });
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
    }

    autoTable(doc, {
      startY: completedLate ? 23 : 20,
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
        [
          "Date",
          instance.date
            ? new Date(instance.date).toLocaleDateString("fr-FR")
            : "—",
          "Auditeur",
          instance.auditor || "—",
        ],
        [
          "Ligne / Unité",
          instance.lineUnit || "—",
          "Visa auditeur",
          instance.auditorVisa || "—",
        ],
        [
          "Chef d'équipe",
          instance.teamLeader || "—",
          "Responsable Ligne/Unité",
          instance.lineResponsible || "—",
        ],
      ],
    });

    const afterHeader = (doc as any).lastAutoTable?.finalY ?? 42;

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
      head: [
        [
          "N°",
          "Catégorie",
          "Points à vérifier",
          "OK",
          "N'OK",
          "NA",
          "Description de l'écart",
        ],
      ],
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: {
        fillColor: [47, 107, 255],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7,
      },
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

        if (Array.isArray(rowRaw) && rowRaw[4] === "NON") {
          data.cell.styles.fillColor = [254, 242, 242];
        }

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
        head: [
          ["N°", "Action", "Responsable", "Délai", "Date Réalisation"],
        ],
        body: instance.assignments.map((a, i) => [
          i + 1,
          a.action || "",
          a.responsable || "",
          a.delai ? new Date(a.delai).toLocaleDateString("fr-FR") : "",
          a.dateRealisation
            ? new Date(a.dateRealisation).toLocaleDateString("fr-FR")
            : "",
        ]),
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fillColor: [47, 107, 255],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: usableW * 0.04, halign: "center" },
          1: { cellWidth: usableW * 0.5 },
          2: { cellWidth: usableW * 0.2 },
          3: { cellWidth: usableW * 0.13 },
          4: { cellWidth: usableW * 0.13 },
        },
      });
    }

    /* ── ANNEXE PHOTOS ── */
    const nokWithPhotos = flatItems.filter((fi) => {
      const resp = responseMap[fi.item.id];
      const respDto = instance.responses?.find(
        (r) => r.itemId === fi.item.id
      );
      return (
        resp?.response === "NOK" &&
        respDto?.id &&
        (respDto.photoCount ?? 0) > 0
      );
    });

    if (nokWithPhotos.length > 0) {
      doc.addPage("a4", "landscape");

      const PHOTO_W = 83;
      const PHOTO_H = 62;
      const PHOTOS_PER_ROW = 3;
      const H_GAP = 5;
      const PAGE_H = doc.internal.pageSize.getHeight();

      let y = 14;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(47, 107, 255);
      doc.text("ANNEXE PHOTOS — POINTS N'OK", left, y);
      doc.setTextColor(0);
      y += 3;
      doc.setDrawColor(47, 107, 255);
      doc.setLineWidth(0.5);
      doc.line(left, y, pageW - right, y);
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      y += 8;

      for (const fi of nokWithPhotos) {
        const respDto = instance.responses?.find(
          (r) => r.itemId === fi.item.id
        )!;
        const photos = await fetchPhotosMeta(respDto.id!, token);
        if (photos.length === 0) continue;

        if (y + 18 > PAGE_H - 12) {
          doc.addPage("a4", "landscape");
          y = 14;
        }

        autoTable(doc, {
          startY: y,
          margin: { left, right },
          tableWidth: usableW,
          theme: "grid",
          styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak" },
          headStyles: {
            fillColor: [47, 107, 255],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 7.5,
          },
          columnStyles: {
            0: { cellWidth: usableW * 0.05, halign: "center" },
            1: { cellWidth: usableW * 0.16 },
            2: { cellWidth: usableW * 0.39 },
            3: { cellWidth: usableW * 0.4 },
          },
          head: [
            ["N°", "Catégorie", "Point à vérifier", "Description de l'écart"],
          ],
          body: [
            [
              fi.globalIndex,
              fi.category.name,
              fi.item.label,
              responseMap[fi.item.id]?.ecartDescription || "—",
            ],
          ],
        });

        y = ((doc as any).lastAutoTable?.finalY ?? y + 14) + 4;

        for (let i = 0; i < photos.length; i += PHOTOS_PER_ROW) {
          const rowPhotos = photos.slice(i, i + PHOTOS_PER_ROW);

          if (y + PHOTO_H + 10 > PAGE_H - 10) {
            doc.addPage("a4", "landscape");
            y = 14;
          }

          for (let j = 0; j < rowPhotos.length; j++) {
            const result = await fetchPhotoForPdf(rowPhotos[j].id, token);
            if (!result) continue;
            const x = left + j * (PHOTO_W + H_GAP);
            doc.addImage(result.dataUrl, result.format, x, y, PHOTO_W, PHOTO_H);
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text(
              `Photo ${i + j + 1}/${photos.length} — N°${fi.globalIndex} ${fi.category.name}`,
              x + PHOTO_W / 2,
              y + PHOTO_H + 4,
              { align: "center", maxWidth: PHOTO_W }
            );
            doc.setTextColor(0);
          }

          y += PHOTO_H + 9;
        }

        y += 8;
      }
    }

    doc.save(
      buildFilename("Checklist_HSE", instance.lineUnit, instance.date, "pdf")
    );
  };

  /* ── Export Excel ── */
  const handleExportExcel = async () => {
    if (!instance || !template) return;
    const token =
      (auth as any)?.accessToken || (auth as any)?.token || null;

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

    ws.mergeCells("A1:B4");
    ws.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: WHITE },
    };

    ws.mergeCells("C1:F2");
    const titleCell = ws.getCell("C1");
    titleCell.value = "Check-list GEMBA WALK HSE";
    titleCell.font = { bold: true, size: 15, color: { argb: "FF1a2340" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: WHITE },
    };
    titleCell.border = border;

    ws.mergeCells("C3:F4");
    const underTitleCell = ws.getCell("C3");
    underTitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: WHITE },
    };
    underTitleCell.border = border;

    ws.mergeCells("G1:G4");
    const refCell = ws.getCell("G1");
    refCell.value = "SAGE-FOR-DRH-62\nRévision : 00\nDate : 28/01/2026";
    refCell.font = { size: 8, color: { argb: "FF4b5675" } };
    refCell.alignment = {
      horizontal: "right",
      vertical: "top",
      wrapText: true,
    };
    refCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT_GRAY },
    };
    refCell.border = border;

    [1, 2, 3, 4].forEach((r) => {
      ws.getRow(r).height = 20;
    });

    if (logoDataUrl) {
      const imgBuffer = dataUrlToArrayBuffer(logoDataUrl);
      const imageId = wb.addImage({ buffer: imgBuffer, extension: "png" });
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 } as any,
        br: { col: 2, row: 4 } as any,
        editAs: "oneCell",
      });
    }

    const headerData: [string, string, string, string][] = [
      [
        "Date",
        instance.date
          ? new Date(instance.date).toLocaleDateString("fr-FR")
          : "—",
        "Auditeur",
        instance.auditor || "—",
      ],
      [
        "Ligne / Unité",
        instance.lineUnit || "—",
        "Visa auditeur",
        instance.auditorVisa || "—",
      ],
      [
        "Chef d'équipe",
        instance.teamLeader || "—",
        "Responsable Ligne/Unité",
        instance.lineResponsible || "—",
      ],
    ];

    headerData.forEach(([lbl1, val1, lbl2, val2], ri) => {
      const rowNum = 5 + ri;
      ws.mergeCells(`A${rowNum}:C${rowNum}`);
      ws.mergeCells(`D${rowNum}:G${rowNum}`);

      const c1 = ws.getCell(`A${rowNum}`);
      c1.value = `${lbl1} : ${val1}`;
      c1.font = { size: 9 };
      c1.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIGHT_GRAY },
      };
      c1.border = border;
      c1.alignment = { vertical: "middle" };

      const c2 = ws.getCell(`D${rowNum}`);
      c2.value = `${lbl2} : ${val2}`;
      c2.font = { size: 9 };
      c2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIGHT_GRAY },
      };
      c2.border = border;
      c2.alignment = { vertical: "middle" };

      ws.getRow(rowNum).height = 18;
    });

    ws.getRow(8).height = 6;

    const colHeaderRow = ws.getRow(9);
    colHeaderRow.values = [
      "N°",
      "Catégorie",
      "Points à vérifier",
      "OK",
      "N'OK",
      "NA",
      "Description de l'écart",
    ];
    colHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BLUE },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = border;
    });
    colHeaderRow.height = 22;

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

      const labelLines = Math.ceil(Math.max(1, labelText.length) / 50);
      const ecartLines = Math.ceil(Math.max(1, ecartText.length) / 40);
      dataRow.height = Math.max(18, Math.max(labelLines, ecartLines) * 14);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = border;
        cell.font = { size: 9 };
        cell.alignment = {
          vertical: "middle",
          wrapText: colNumber === 3 || colNumber === 7,
        };

        if (isNok) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_RED },
          };
        } else if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_GRAY },
          };
        }

        if (colNumber === 2) {
          cell.font = { bold: true, size: 9, color: { argb: "FF2F6BFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_BLUE },
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        }
        if (colNumber === 1)
          cell.alignment = { horizontal: "center", vertical: "middle" };
        if (colNumber === 4 && isOk)
          cell.font = { bold: true, size: 11, color: { argb: "FF00C48C" } };
        if (colNumber === 5 && isNok)
          cell.font = { bold: true, size: 11, color: { argb: "FFF03E3E" } };
        if (colNumber === 4 || colNumber === 5 || colNumber === 6)
          cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    const scoreRowNum = 10 + flatItems.length + 1;
    ws.mergeCells(`A${scoreRowNum}:G${scoreRowNum}`);
    const scoreRow = ws.getRow(scoreRowNum);
    scoreRow.getCell(1).value = `Score : OK=${score.ok}  N'OK=${score.nok}  NA=${score.na}  →  ${score.pct}%  (${auditLevel.level} — ${auditLevel.message})`;
    scoreRow.getCell(1).font = {
      bold: true,
      size: 10,
      color: {
        argb: auditLevel.color.replace("#", "FF").toUpperCase(),
      },
    };
    scoreRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT_GRAY },
    };
    scoreRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    scoreRow.getCell(1).border = border;
    scoreRow.height = 20;

    let lastWrittenRow = scoreRowNum;

    if (completedLate) {
      const lateRowNum = scoreRowNum + 1;
      ws.mergeCells(`A${lateRowNum}:G${lateRowNum}`);
      const lateRow = ws.getRow(lateRowNum);
      lateRow.getCell(1).value = "⚠ Audit complété en retard — Ce checklist a été rempli après la date d'échéance de l'audit";
      lateRow.getCell(1).font = { bold: true, size: 9, color: { argb: "FFDC5000" } };
      lateRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E8" } };
      lateRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      lateRow.getCell(1).border = border;
      lateRow.height = 18;
      lastWrittenRow = lateRowNum;
    }

    if (instance.assignments && instance.assignments.length > 0) {
      const assignTitleRowNum = scoreRowNum + 2;

      ws.mergeCells(`A${assignTitleRowNum}:G${assignTitleRowNum}`);
      const assignTitleRow = ws.getRow(assignTitleRowNum);
      assignTitleRow.getCell(1).value = "TABLEAU DE SUIVI DES ASSIGNATIONS";
      assignTitleRow.getCell(1).font = {
        bold: true,
        size: 11,
        color: { argb: WHITE },
      };
      assignTitleRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BLUE },
      };
      assignTitleRow.getCell(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      assignTitleRow.height = 20;

      const assignHeaderRow = ws.getRow(assignTitleRowNum + 1);
      assignHeaderRow.values = [
        "N°",
        "Action",
        "Responsable",
        "Délai",
        "Date Réalisation",
        "",
        "",
      ];
      assignHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BLUE },
        };
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
          a.dateRealisation
            ? new Date(a.dateRealisation).toLocaleDateString("fr-FR")
            : "",
          "",
          "",
        ];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = border;
          cell.font = { size: 9 };
          cell.alignment = {
            vertical: "middle",
            wrapText: colNumber === 2,
          };
          if (i % 2 === 0)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: LIGHT_GRAY },
            };
          if (colNumber === 1)
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        row.height = 18;
      });

      lastWrittenRow =
        assignTitleRowNum + 1 + instance.assignments.length;
    }

    /* ── ANNEXE PHOTOS ── */
    const nokWithPhotos = flatItems.filter((fi) => {
      const resp = responseMap[fi.item.id];
      const respDto = instance.responses?.find(
        (r) => r.itemId === fi.item.id
      );
      return (
        resp?.response === "NOK" &&
        respDto?.id &&
        (respDto.photoCount ?? 0) > 0
      );
    });

    if (nokWithPhotos.length > 0) {
      const annexeTitleRowNum = lastWrittenRow + 2;

      ws.mergeCells(`A${annexeTitleRowNum}:G${annexeTitleRowNum}`);
      const annexeTitleRow = ws.getRow(annexeTitleRowNum);
      annexeTitleRow.getCell(1).value = "ANNEXE PHOTOS — POINTS N'OK";
      annexeTitleRow.getCell(1).font = {
        bold: true,
        size: 12,
        color: { argb: WHITE },
      };
      annexeTitleRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BLUE },
      };
      annexeTitleRow.getCell(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      annexeTitleRow.height = 24;

      let currentRow = annexeTitleRowNum + 1;
      const PHOTO_W_PX = 150;
      const PHOTO_H_PX = 115;
      const PHOTOS_PER_ROW = 3;
      const COL_PAIRS: [string, string][] = [
        ["A", "B"],
        ["C", "D"],
        ["E", "F"],
      ];

      for (const fi of nokWithPhotos) {
        const respDto = instance.responses?.find(
          (r) => r.itemId === fi.item.id
        )!;
        const photos = await fetchPhotosMeta(respDto.id!, token);
        if (photos.length === 0) continue;

        // Item title row
        ws.mergeCells(`A${currentRow}:G${currentRow}`);
        const itemTitleCell = ws.getCell(`A${currentRow}`);
        itemTitleCell.value = `N°${fi.globalIndex} — ${fi.category.name} — ${fi.item.label}`;
        itemTitleCell.font = {
          bold: true,
          size: 9.5,
          color: { argb: "FF1a2340" },
        };
        itemTitleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: LIGHT_BLUE },
        };
        itemTitleCell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
        itemTitleCell.border = border;
        ws.getRow(currentRow).height = 18;
        currentRow++;

        // Écart row
        ws.mergeCells(`A${currentRow}:G${currentRow}`);
        const ecartCell = ws.getCell(`A${currentRow}`);
        ecartCell.value = `Écart : ${responseMap[fi.item.id]?.ecartDescription || "—"}`;
        ecartCell.font = { size: 9, color: { argb: "FFC0392B" } };
        ecartCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: LIGHT_RED },
        };
        ecartCell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
        ecartCell.border = border;
        ws.getRow(currentRow).height = 16;
        currentRow++;

        // Photo rows
        for (let i = 0; i < photos.length; i += PHOTOS_PER_ROW) {
          const rowPhotos = photos.slice(i, i + PHOTOS_PER_ROW);
          const photoRowNum = currentRow;
          ws.getRow(photoRowNum).height = 88;
          currentRow++;

          const captionRowNum = currentRow;
          ws.getRow(captionRowNum).height = 14;

          for (let j = 0; j < rowPhotos.length; j++) {
            const result = await fetchPhotoForExcel(rowPhotos[j].id, token);
            if (result) {
              const imgId = wb.addImage({
                buffer: result.buffer,
                extension: result.extension,
              });
              ws.addImage(imgId, {
                tl: { col: j * 2, row: photoRowNum - 1 },
                ext: { width: PHOTO_W_PX, height: PHOTO_H_PX },
                editAs: "oneCell",
              });
            }

            const [sl, el] = COL_PAIRS[j];
            ws.mergeCells(`${sl}${captionRowNum}:${el}${captionRowNum}`);
            const captionCell = ws.getCell(`${sl}${captionRowNum}`);
            captionCell.value = `Photo ${i + j + 1}/${photos.length}`;
            captionCell.font = {
              size: 8,
              italic: true,
              color: { argb: "FF4b5675" },
            };
            captionCell.alignment = {
              horizontal: "center",
              vertical: "middle",
            };
            captionCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: LIGHT_GRAY },
            };
            captionCell.border = border;
          }

          currentRow++;
        }

        // Separator row
        ws.getRow(currentRow).height = 10;
        currentRow++;
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      buildFilename("Checklist_HSE", instance.lineUnit, instance.date, "xlsx")
    );
  };

  const headerFields: [string, string][] = instance
    ? [
        [
          "Date",
          instance.date
            ? new Date(instance.date).toLocaleDateString("fr-FR")
            : "—",
        ],
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
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-6 px-4">
        <div
          className="w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col"
          style={{ background: "var(--white)", border: "1px solid var(--border)" }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 rounded-t-2xl"
            style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--white)",
            }}
          >
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--text)" }}
              >
                Détails de la checklist
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--muted)" }}
              >
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
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-[var(--bg)]"
                style={{ color: "var(--muted)" }}
              >
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
            <div
              className="p-16 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              Données introuvables.
            </div>
          ) : (
            <div className="px-6 py-6 space-y-8">
              {/* ── Indicateur "Complété en retard" ── */}
              {completedLate && (
                <div
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "rgba(220,80,0,0.1)", color: "#dc5000", border: "1px solid rgba(220,80,0,0.25)" }}
                >
                  ⚠ Complété en retard — Ce checklist a été rempli après la date d'échéance de l'audit
                </div>
              )}
              {/* ── Bloc en-tête document ── */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "2px solid var(--border)" }}
              >
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ background: "var(--accent)" }}
                >
                  <span className="font-bold text-base text-white">
                    Check-list GEMBA WALK HSE
                  </span>
                  <div className="text-right text-xs text-white space-y-0.5">
                    <div className="font-bold">SAGE-FOR-DRH-62</div>
                    <div>Révision : 00</div>
                    <div>Date : 28/01/2026</div>
                  </div>
                </div>
                <div
                  className="grid grid-cols-2"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div
                    className="divide-y"
                    style={{ borderRight: "1px solid var(--border)" }}
                  >
                    {headerFields.map(([label, value]) => (
                      <div key={label} className="flex">
                        <span
                          className="w-44 shrink-0 px-3 py-2 text-xs font-semibold"
                          style={{
                            background: "var(--bg)",
                            color: "var(--text2)",
                            borderRight: "1px solid var(--border)",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          className="flex-1 px-3 py-2 text-sm"
                          style={{ color: "var(--text)" }}
                        >
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
                          style={{
                            background: "var(--bg)",
                            color: "var(--text2)",
                            borderRight: "1px solid var(--border)",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          className="flex-1 px-3 py-2 text-sm"
                          style={{ color: "var(--text)" }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Tableau des points ── */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: "var(--accent)" }}>
                      <th
                        className="px-2 py-2.5 text-center font-semibold text-white w-10"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        N°
                      </th>
                      <th
                        className="px-2 py-2.5 text-left font-semibold text-white w-32"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        Catégorie
                      </th>
                      <th
                        className="px-2 py-2.5 text-left font-semibold text-white"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        Points à vérifier
                      </th>
                      <th
                        className="px-2 py-2.5 text-center font-semibold text-white w-20"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        Critères OK
                      </th>
                      <th
                        className="px-2 py-2.5 text-center font-semibold text-white w-12"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        OK
                      </th>
                      <th
                        className="px-2 py-2.5 text-center font-semibold text-white w-14"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        N'OK
                      </th>
                      <th
                        className="px-2 py-2.5 text-center font-semibold text-white w-10"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        NA
                      </th>
                      <th
                        className="px-2 py-2.5 text-left font-semibold text-white"
                        style={{
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        Description de l'écart
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatItems.map((fi) => {
                      const resp = responseMap[fi.item.id] ?? {};
                      const isNok = resp.response === "NOK";
                      const respDto = instance.responses?.find(
                        (r) => r.itemId === fi.item.id
                      );
                      const photoCount = respDto?.photoCount ?? 0;

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
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--muted)",
                            }}
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
                                writingMode:
                                  fi.categorySize > 3
                                    ? "vertical-rl"
                                    : "horizontal-tb",
                                textOrientation: "mixed",
                                transform:
                                  fi.categorySize > 3
                                    ? "rotate(180deg)"
                                    : "none",
                              }}
                            >
                              {fi.category.name}
                            </td>
                          )}

                          <td
                            className="px-2 py-2"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
                          >
                            {fi.item.label}
                          </td>

                          <td
                            className="px-2 py-2 text-center"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--muted)",
                            }}
                          >
                            —
                          </td>

                          <td
                            className="px-2 py-2 text-center text-base"
                            style={{ border: "1px solid var(--border)" }}
                          >
                            {resp.response === "OK" && (
                              <span style={{ color: "var(--accent2)" }}>
                                ✓
                              </span>
                            )}
                          </td>

                          <td
                            className="px-2 py-2 text-center text-base"
                            style={{ border: "1px solid var(--border)" }}
                          >
                            {resp.response === "NOK" && (
                              <span style={{ color: "var(--accent4)" }}>
                                ✗
                              </span>
                            )}
                          </td>

                          <td
                            className="px-2 py-2 text-center font-medium"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--muted)",
                            }}
                          >
                            {resp.response === "NA" && "—"}
                          </td>

                          <td
                            className="px-2 py-2"
                            style={{
                              border: "1px solid var(--border)",
                              color: isNok
                                ? "var(--accent4)"
                                : "var(--text2)",
                              background: isNok
                                ? "rgba(240,62,62,0.06)"
                                : "transparent",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex-1">
                                {resp.ecartDescription || ""}
                              </span>
                              {isNok && respDto?.id && (
                                <PhotoIndicator
                                  count={photoCount}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryData({
                                      responseId: respDto.id!,
                                      itemLabel: fi.item.label,
                                      categoryName: fi.category.name,
                                    });
                                  }}
                                />
                              )}
                            </div>
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
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div
                  className="flex items-center gap-2 flex-wrap text-sm"
                  style={{ color: "var(--text2)" }}
                >
                  <span className="font-semibold">
                    OUI : Nbre OK / Nbre Total
                  </span>
                  <span className="mx-2">=</span>
                  <span
                    className="rounded-full px-3 py-0.5 font-bold text-sm"
                    style={{
                      background: "rgba(0,196,140,0.15)",
                      color: "#007a58",
                    }}
                  >
                    OK : {score.ok}
                  </span>
                  <span
                    className="rounded-full px-3 py-0.5 font-bold text-sm"
                    style={{
                      background: "rgba(240,62,62,0.15)",
                      color: "#c0392b",
                    }}
                  >
                    N'OK : {score.nok}
                  </span>
                  <span
                    className="rounded-full px-3 py-0.5 font-bold text-sm"
                    style={{
                      background: "rgba(154,163,184,0.2)",
                      color: "var(--muted)",
                    }}
                  >
                    NA : {score.na}
                  </span>
                </div>
                <div className="text-sm" style={{ color: "var(--text2)" }}>
                  Résultat = (OK / (OK + N'OK + NA)) × 100 ={" "}
                  <span
                    className="text-xl font-bold"
                    style={{ color: "var(--text)" }}
                  >
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
                  <span
                    className="font-bold text-sm"
                    style={{ color: auditLevel.color }}
                  >
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
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "var(--accent)" }}>
                          <th className="px-3 py-2.5 text-center font-semibold text-white w-10">
                            N°
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold text-white">
                            Action
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold text-white w-36">
                            Responsable
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-white w-28">
                            Délai
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-white w-36">
                            Date Réalisation
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {instance.assignments.map((a, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                i <
                                (instance.assignments?.length ?? 0) - 1
                                  ? "1px solid var(--border)"
                                  : "none",
                            }}
                            className="hover:bg-[var(--bg)] transition-colors"
                          >
                            <td
                              className="px-3 py-2.5 text-center font-mono text-xs"
                              style={{ color: "var(--text2)" }}
                            >
                              {i + 1}
                            </td>
                            <td
                              className="px-3 py-2.5 text-sm"
                              style={{ color: "var(--text)" }}
                            >
                              {a.action || "—"}
                            </td>
                            <td
                              className="px-3 py-2.5 text-xs"
                              style={{ color: "var(--text2)" }}
                            >
                              {a.responsable || "—"}
                            </td>
                            <td
                              className="px-3 py-2.5 text-center text-xs"
                              style={{ color: "var(--text2)" }}
                            >
                              {a.delai
                                ? new Date(a.delai).toLocaleDateString(
                                    "fr-FR"
                                  )
                                : "—"}
                            </td>
                            <td
                              className="px-3 py-2.5 text-center text-xs"
                              style={{ color: "var(--text2)" }}
                            >
                              {a.dateRealisation
                                ? new Date(
                                    a.dateRealisation
                                  ).toLocaleDateString("fr-FR")
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

      {/* ── Photo Gallery Modal ── */}
      {galleryData && (
        <PhotoGalleryModal
          responseId={galleryData.responseId}
          itemLabel={galleryData.itemLabel}
          categoryName={galleryData.categoryName}
          readOnly
          onClose={() => setGalleryData(null)}
        />
      )}
    </>
  );
}

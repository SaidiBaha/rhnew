import {addHours, format} from "date-fns";
import type z from "zod";

import type {EmployeeColumn} from "@/modules/employee/components/columns";
import type {Employee} from "@/modules/employee/types";
import {EmployeeSchema} from "@/modules/employee/schema";

function safeFormatDate(value?: Date | string | null) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(date, "dd / MM / yyyy");
}

export function formatEmployee(employee: Employee): EmployeeColumn {
    return {
        id: employee.id,
        matricule: employee.matricule,
        civility: employee.civility,
        fullName: employee.fullName,
        department: employee.department?.name || "",
        jobTitle: employee.jobTitle?.title || "",
        productionLine: employee.productionLine?.name || "",
        shift: employee.shift?.name || "",
        employmentType: employee.employmentType?.type || "",
        hireDate: safeFormatDate(employee.hireDate),
        hasBankDomiciliation: employee.hasBankDomiciliation ? "oui" : "non",
        supervisor: employee.supervisor?.fullName || "",
        email: employee.email || "",
        attendance: employee.attendance,

        // ✅ nouveaux champs
        hasLeftCompanyLabel:
            employee.hasLeftCompany === true ? "Ancien employé" : "Employé actuel",
        departureDate: safeFormatDate(employee.departureDate),
    };
}

const COLUMN_MAP: Record<string, keyof z.infer<typeof EmployeeSchema>> = {
    matricule: "matricule",
    civilité: "civility",
    "nom et prénom": "fullName",
    département: "department",
    "poste occupé": "jobTitle",
    "ligne de production": "productionLine",
    poste: "shift",
    "type de travail": "employmentType",
    "date d'embauche société": "hireDate",
    superviseur: "supervisor",
    domiciliation: "hasBankDomiciliation",
    email: "email",
    "e-mail": "email",

    "a quitté la société": "hasLeftCompany",
    "hasleftcompany": "hasLeftCompany",
    "date de départ": "departureDate",
    "departure date": "departureDate",
    departuredate: "departureDate",
};

export function parseEmployee(row: any, index: number) {
    const normalizedRow: { [key: string]: any } = {};
    const rowIndex = index + 2;

    Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim();
        const targetKey = COLUMN_MAP[normalizedKey];

        if (!targetKey) return;

        const value = row[key];

        if (targetKey === "hasBankDomiciliation") {
            normalizedRow[targetKey] = String(value).trim().toLowerCase() === "oui";
        } else if (targetKey === "hireDate" && value instanceof Date) {
            const hireDate = format(addHours(value, 12), "yyyy-MM-dd");
            normalizedRow[targetKey] = hireDate;
        } else if (targetKey === "departureDate" && value instanceof Date) {
            normalizedRow[targetKey] = format(addHours(value, 12), "yyyy-MM-dd");
        } else if (targetKey === "hasLeftCompany") {
            const raw = String(value ?? "").trim().toLowerCase();
            if (raw === "oui" || raw === "true" || raw === "1") {
                normalizedRow[targetKey] = true;
            } else if (raw === "non" || raw === "false" || raw === "0") {
                normalizedRow[targetKey] = false;
            } else {
                normalizedRow[targetKey] = null;
            }
        } else if (targetKey === "civility" && typeof value === "string") {
            normalizedRow[targetKey] = value.trim().toUpperCase();
        } else {
            normalizedRow[targetKey] = value;
        }
    });

    const result = EmployeeSchema.safeParse(normalizedRow);

    if (!result.success) {
        const error = result.error.issues[0];
        throw new Error(
            `Ligne ${rowIndex}: [${error.path.join(" > ")}]: ${error.message} `
        );
    }

    return result.data;
}
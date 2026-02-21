import { addHours, format } from "date-fns";
import type z from "zod";

import type { EmployeeColumn } from "@/modules/employee/components/columns";
import type { Employee } from "@/modules/employee/types";
import { EmployeeSchema } from "@/modules/employee/schema";

export function formatEmployee(employee: Employee): EmployeeColumn {
  return {
    id: employee.id,
    matricule: employee.matricule,
    civility: employee.civility,
    fullName: employee.fullName,
    department: employee.department.name,
    jobTitle: employee.jobTitle.title,
    productionLine: employee.productionLine?.name || "",
    shift: employee.shift?.name || "",
    employmentType: employee.employmentType.type,
    hireDate: format(employee.hireDate, "dd / MM / yyyy"),
    hasBankDomiciliation: employee.hasBankDomiciliation ? "oui" : "non",
    supervisor: employee.supervisor?.fullName || "",
    attendance: employee.attendance,
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

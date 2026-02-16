// src/modules/employee/hooks/useFetchAvailableOperators.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000/api/v1";

export type OperatorAvailability = {
  id: number;
  fullName: string;
  matricule?: string | null;
  free: boolean;

  supervisorId?: number | null;
  supervisorFullName?: string | null;
  supervisorMatricule?: string | null;
};

function getToken(auth: any): string | null {
  return auth?.accessToken || auth?.token || auth?.jwt || null;
}

export function getRole(auth: any): string | null {
  return (
      auth?.role ||
      auth?.user?.role ||
      auth?.user?.roles?.[0] ||
      auth?.authorities?.find((a: string) => a?.startsWith("ROLE_"))?.replace("ROLE_", "") ||
      null
  );
}

// ✅ helper: extraire superviseur depuis différents formats backend possibles
function extractSupervisor(x: any): {
  supervisorId: number | null;
  supervisorFullName: string | null;
  supervisorMatricule: string | null;
} {
  // cas le plus simple: champs à plat
  const flatId = x?.supervisorId ?? null;
  const flatName =
      x?.supervisorFullName ?? x?.supervisorName ?? null;
  const flatMat = x?.supervisorMatricule ?? null;

  if (flatId || flatName || flatMat) {
    return {
      supervisorId: flatId,
      supervisorFullName: flatName,
      supervisorMatricule: flatMat,
    };
  }

  // cas: objet supervisor
  const supObj = x?.supervisor;
  if (supObj) {
    return {
      supervisorId: supObj?.id ?? null,
      supervisorFullName: supObj?.fullName ?? supObj?.fullname ?? null,
      supervisorMatricule: supObj?.matricule ?? null,
    };
  }

  // cas: réponses type operatorsWithSupervisors (parfois list ou single)
  // ex: x.operatorsWithSupervisors = [{ operatorId, supervisorFullName... }]
  // pour un "operator" unique, on prend le 1er élément
  const ows = x?.operatorsWithSupervisors;
  if (Array.isArray(ows) && ows.length > 0) {
    const first = ows[0];
    return {
      supervisorId: first?.supervisorId ?? null,
      supervisorFullName: first?.supervisorFullName ?? null,
      supervisorMatricule: first?.supervisorMatricule ?? null,
    };
  }

  return { supervisorId: null, supervisorFullName: null, supervisorMatricule: null };
}

function normalizeOperator(x: any): OperatorAvailability {
  const sup = extractSupervisor(x);

  return {
    id: x?.id ?? x?.employeeId ?? x?.operatorId,
    fullName:
        x?.fullName ??
        x?.fullname ??
        x?.employeeFullName ??
        x?.operatorFullName ??
        x?.name ??
        [x?.firstName, x?.lastName].filter(Boolean).join(" ") ??
        "—",
    matricule: x?.matricule ?? x?.employeeMatricule ?? x?.operatorMatricule ?? null,
    free: x?.free ?? x?.isFree ?? false,

    supervisorId: sup.supervisorId,
    supervisorFullName: sup.supervisorFullName,
    supervisorMatricule: sup.supervisorMatricule,
  };
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function useFetchAvailableOperators(params?: {
  day?: string;
  startTime?: string;
  endTime?: string;
}) {
  const { auth } = useAuth();
  const token = getToken(auth as any);
  const role = getRole(auth as any);

  const isSupervisor = role === "SUPERVISOR";

  const day = params?.day ?? todayIso();
  const startTime = params?.startTime ?? "00:00";
  const endTime = params?.endTime ?? "23:59";

  const url = isSupervisor
      ? `${API_BASE_URL}/free-operators/eligible`
      : role === "OPERATIONAL_MANAGER"
          ? `${API_BASE_URL}/employees/operators/free`
          : `${API_BASE_URL}/employees`;

  return useQuery({
    queryKey: ["employees-availability", role, day, startTime, endTime],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<any[]>(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: isSupervisor ? { day, startTime, endTime } : undefined,
      });

      return (res.data ?? []).map(normalizeOperator);
    },
  });
}

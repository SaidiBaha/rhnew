
import { useState, useMemo, type FormEvent, useEffect } from "react";
import Swal from "sweetalert2";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";

import { useCreatePermutation } from "../hooks/useCreatePermutation";
import type { PermutationCreatePayload, Permutation, TypePermutation } from "../types";

import { useFetchEmployees } from "@/modules/employee/hooks/useFetchEmployees";
import { useFetchFreeEmployees } from "@/modules/employee/hooks/useFetchFreeEmployees";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";
import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";
import type { Employee } from "@/modules/employee/types";
import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import useAuth from "@/hooks/useAuth";

type Props = {
  onCreated?: () => void;
  mode?: "send" | "choose";
};

type AvailabilityFilter = "all" | "free" | "occupied";

/** ✅ Type local : supporte aussi les champs superviseur renvoyés par freeEmployees */
type OperatorRow = Employee & {
  free?: boolean;

  supervisorId?: number | null;
  supervisorFullName?: string | null;
  supervisorMatricule?: string | null;

  // variantes possibles (si backend renvoie snake_case ou objet imbriqué)
  supervisor_id?: number | string | null;
  supervisor_full_name?: string | null;
  supervisor_matricule?: string | null;
  supervisor?: {
    id?: number | string | null;
    fullName?: string | null;
    matricule?: string | null;
    name?: string | null;
  } | null;
  supervisorName?: string | null;
};

export function PermutationForm({ onCreated, mode = "send" }: Props) {
  const [operatorsSearch, setOperatorsSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [typePermutation, setTypePermutation] = useState<TypePermutation>("ENVOYER");

  const { auth } = useAuth();
  const connectedUser = auth.user;

  // ✅ Sender/Receiver: on garde receiverId/senderId pour ENVOYER uniquement.
  // ✅ Pour RECEVOIR: on n'affiche plus le choix du superviseur, senderId reste toujours null.
  const [senderId, setSenderId] = useState<number | "">("");
  const [receiverId, setReceiverId] = useState<number | "">("");

  const [productionLineId, setProductionLineId] = useState<number | "">("");
  const [operatorIds, setOperatorIds] = useState<number[]>([]);

  // ✅ RECEVOIR = uniquement aujourd'hui (date figée)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");

  const {
    data: employees,
    isLoading: empLoading,
    isFetching: empFetching,
    error: empError,
    refetch: refetchEmployees,
  } = useFetchEmployees({ includeAll: mode === "choose" });

  const {
    data: freeEmployees,
    isLoading: freeEmpLoading,
    isFetching: freeEmpFetching,
    error: freeEmpError,
    refetch: refetchFreeEmployees,
  } = useFetchFreeEmployees();

  const {
    data: supervisors,
    isLoading: supLoading,
    isFetching: supFetching,
    error: supError,
  } = useFetchSupervisors();

  const {
    data: permutationsData,
    isLoading: permLoading,
    isFetching: permFetching,
  } = useFetchPermutations();

  const {
    data: productionLines,
    isLoading: plLoading,
    isFetching: plFetching,
    error: plError,
  } = useFetchProductionLines();

  const { mutateAsync, isPending } = useCreatePermutation();

  const permutations: Permutation[] = permutationsData ?? [];
  const lines = productionLines ?? [];

  /** ✅ Map superviseurs (fallback) : id -> { fullName, matricule } */
  const supervisorsById = useMemo(() => {
    const map = new Map<number, { fullName?: string | null; matricule?: string | null }>();
    (supervisors ?? []).forEach((s: any) => {
      map.set(Number(s.id), { fullName: s.fullName ?? null, matricule: s.matricule ?? null });
    });
    return map;
  }, [supervisors]);

  /** ✅ Source brute selon type */
  const rawOperators: OperatorRow[] =
    (typePermutation === "RECEVOIR"
      ? ((freeEmployees ?? []) as OperatorRow[])
      : ((employees ?? []) as OperatorRow[]));

  /**
   * ✅ NORMALISATION GARANTIE :
   * - récupère supervisorId/fullName/matricule même si les clés sont différentes
   * - fallback via supervisorsById si on a seulement l'id
   */
  const operators: OperatorRow[] = useMemo(() => {
    const normalizeOne = (emp: OperatorRow): OperatorRow => {
      const anyEmp = emp as any;

      const supIdRaw =
        emp.supervisorId ??
        emp.supervisor_id ??
        anyEmp.supervisorId ??
        anyEmp.supervisor_id ??
        emp.supervisor?.id ??
        anyEmp.supervisor?.id ??
        null;

      const supId = supIdRaw != null && supIdRaw !== ""
        ? Number(supIdRaw)
        : null;

      const supName =
        emp.supervisorFullName ??
        emp.supervisor_full_name ??
        emp.supervisorName ??
        emp.supervisor?.fullName ??
        emp.supervisor?.name ??
        anyEmp.supervisorFullName ??
        anyEmp.supervisor_full_name ??
        anyEmp.supervisorName ??
        anyEmp.supervisor?.fullName ??
        anyEmp.supervisor?.name ??
        null;

      const supMat =
        emp.supervisorMatricule ??
        emp.supervisor_matricule ??
        emp.supervisor?.matricule ??
        anyEmp.supervisorMatricule ??
        anyEmp.supervisor_matricule ??
        anyEmp.supervisor?.matricule ??
        null;

      const fallback = supId != null ? supervisorsById.get(supId) : undefined;

      return {
        ...emp,
        supervisorId: supId,
        supervisorFullName: supName ?? fallback?.fullName ?? null,
        supervisorMatricule: supMat ?? fallback?.matricule ?? null,
      };
    };

    return rawOperators.map(normalizeOne);
  }, [rawOperators, supervisorsById]);

  // ✅ Initialisation IDs + dates selon le type
  useEffect(() => {
    if (!connectedUser?.id) return;

    if (typePermutation === "RECEVOIR") {
      setReceiverId(Number(connectedUser.id));
      setSenderId("");
      setStartDate(todayStr);
      setEndDate(todayStr);
      refetchFreeEmployees();
    } else {
      setSenderId(Number(connectedUser.id));
      setReceiverId("");
      refetchEmployees();
    }

    setOperatorIds([]);
    setAvailabilityFilter("all");
    setOperatorsSearch("");
  }, [typePermutation, connectedUser, todayStr, refetchEmployees, refetchFreeEmployees]);

  // Calcul de disponibilité uniquement en mode "ENVOYER"
  const unavailableOperatorIds = useMemo(() => {
    if (typePermutation === "RECEVOIR") return new Set<number>();
    const result = new Set<number>();
    if (!startDate || !endDate || !startTime || !endTime) return result;

    permutations.forEach((p) => {
      if (p.status !== "ACCEPTEE") return;
      const datesOverlap = p.startDate <= endDate && p.endDate >= startDate;
      const timesOverlap = p.startTime < endTime && p.endTime > startTime;

      if (datesOverlap && timesOverlap) {
        p.operatorIds.forEach((opId) => result.add(opId));
      }
    });

    return result;
  }, [permutations, startDate, endDate, startTime, endTime, typePermutation]);

  const operatorAvailability = useMemo(() => {
    const result = new Map<number, boolean>();

    operators.forEach((emp: OperatorRow) => {
      const empId = Number(emp.id);
      if (typePermutation === "RECEVOIR") {
        result.set(empId, true);
      } else {
        const isUnavailable = unavailableOperatorIds.has(empId);
        const isFreeFromData = (emp as any).free === true;
        const isFree = !isUnavailable && isFreeFromData;
        result.set(empId, isFree);
      }
    });

    return result;
  }, [operators, unavailableOperatorIds, typePermutation]);

  const availabilityStats = useMemo(() => {
    const allCount = operators.length;
    if (typePermutation === "RECEVOIR") {
      return { allCount, freeCount: allCount, occupiedCount: 0 };
    }

    const freeCount = operators.filter((emp: OperatorRow) => {
      const isFree = operatorAvailability.get(Number(emp.id)) ?? true;
      return isFree;
    }).length;

    const occupiedCount = allCount - freeCount;
    return { allCount, freeCount, occupiedCount };
  }, [operators, operatorAvailability, typePermutation]);

  const searchTerm = operatorsSearch.trim().toLowerCase();

  const filteredOperators = useMemo(
    () =>
      operators.filter((emp: OperatorRow) => {
        if (searchTerm) {
          const fullName = (emp.fullName ?? "").toLowerCase();
          const matricule = (emp.matricule ?? "").toLowerCase();
          const idStr = String(emp.id);

          const matchesSearch =
            fullName.includes(searchTerm) ||
            matricule.includes(searchTerm) ||
            idStr.includes(searchTerm);

          if (!matchesSearch) return false;
        }

        if (typePermutation === "RECEVOIR") return true;

        const isFree = operatorAvailability.get(Number(emp.id)) ?? true;

        switch (availabilityFilter) {
          case "free":
            return isFree;
          case "occupied":
            return !isFree;
          case "all":
          default:
            return true;
        }
      }),
    [operators, operatorAvailability, searchTerm, availabilityFilter, typePermutation]
  );

  const toggleOperator = (id: number | string) => {
    const numId = Number(id);
    setOperatorIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId]
    );
  };

  const labelCls = "mb-1 block text-xs font-semibold text-slate-600";
  const inputCls =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none " +
    "transition focus:border-[#6b7a12] focus:ring-2 focus:ring-[#6b7a12]/20";
  const sectionCls = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";

  const filterButtonCls = (isActive: boolean, color: "green" | "red" = "green") =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
      isActive
        ? color === "green"
          ? "bg-[#6b7a12] text-white"
          : "bg-red-600 text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;

  const selectedOperatorsCount = operatorIds.length;

  const handleTypePermutationChange = (type: TypePermutation) => {
    setTypePermutation(type);
  };

  const isLoading =
    (typePermutation === "ENVOYER" && (empLoading || empFetching)) ||
    (typePermutation === "RECEVOIR" && (freeEmpLoading || freeEmpFetching)) ||
    supLoading ||
    supFetching ||
    permLoading ||
    permFetching ||
    plLoading ||
    plFetching;

  if (isLoading) return <Loader />;

  if (
    (typePermutation === "ENVOYER" && empError) ||
    (typePermutation === "RECEVOIR" && freeEmpError) ||
    supError ||
    plError
  ) {
    return (
      <ErrorAlert
        error={
          (empError as any)?.message ||
          (freeEmpError as any)?.message ||
          (supError as any)?.message ||
          (plError as any)?.message ||
          "Impossible de charger les données."
        }
      />
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (typePermutation === "ENVOYER") {
      if (!receiverId) {
        await Swal.fire({
          icon: "warning",
          title: "Destinataire manquant",
          text: "Veuillez sélectionner un superviseur destinataire.",
          confirmButtonColor: "#6b7a12",
        });
        return;
      }

      if (senderId && receiverId && Number(senderId) === Number(receiverId)) {
        await Swal.fire({
          icon: "warning",
          title: "Destinataire invalide",
          text: "Vous ne pouvez pas vous envoyer des opérateurs à vous-même.",
          confirmButtonColor: "#6b7a12",
        });
        return;
      }
    } else {
      if (startDate !== todayStr || endDate !== todayStr) {
        await Swal.fire({
          icon: "warning",
          title: "Date invalide",
          text: "En mode RECEVOIR, la permutation est autorisée uniquement pour aujourd'hui.",
          confirmButtonColor: "#ef4444",
        });
        return;
      }
    }

    if (!productionLineId) {
      await Swal.fire({
        icon: "warning",
        title: "Projet manquant",
        text: "Veuillez sélectionner le projet / la ligne de production.",
        confirmButtonColor: "#6b7a12",
      });
      return;
    }

    if (operatorIds.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Aucun opérateur sélectionné",
        text: "Veuillez sélectionner au moins un opérateur.",
        confirmButtonColor: "#6b7a12",
      });
      return;
    }

    if (endDate < startDate) {
      await Swal.fire({
        icon: "error",
        title: "Dates invalides",
        text: "La date de fin doit être supérieure ou égale à la date de début.",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    if (mode === "send" && endTime <= startTime) {
      await Swal.fire({
        icon: "error",
        title: "Heures invalides",
        text: "L'heure de fin doit être strictement supérieure à l'heure de début.",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    const payload: PermutationCreatePayload = {
      operatorIds,
      productionLineId: Number(productionLineId),
      startDate,
      endDate,
      startTime,
      endTime,
      typePermutation,
      receiverId: null,
    };

    if (typePermutation === "ENVOYER") {
      payload.receiverId = receiverId ? Number(receiverId) : null;
    } else {
      payload.receiverId = null;
    }

    try {
      await mutateAsync(payload);

      await Swal.fire({
        icon: "success",
        title: "Permutation créée",
        text: "La permutation a été créée avec succès.",
        confirmButtonColor: "#6b7a12",
      });

      setProductionLineId("");
      setOperatorIds([]);
      setStartTime("09:00");
      setEndTime("11:00");
      setOperatorsSearch("");
      setAvailabilityFilter("all");
      setStartDate(todayStr);
      setEndDate(todayStr);

      if (typePermutation === "ENVOYER") setReceiverId("");

      onCreated?.();
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur lors de la création de la permutation.";

      await Swal.fire({
        icon: "error",
        title: "Erreur serveur",
        text: backendMessage,
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const canEditDates = typePermutation === "ENVOYER";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* SWITCH ENVOYER/RECEVOIR */}
      <div className={sectionCls}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Type d'opération
          </p>

          {connectedUser && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
              <UserCircleIcon className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">{connectedUser.fullName}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {connectedUser.role}
              </span>
            </div>
          )}
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleTypePermutationChange("ENVOYER")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              typePermutation === "ENVOYER" ? "bg-white text-[#6b7a12] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowRightIcon className="h-4 w-4" />
            Envoyer
          </button>

          <button
            type="button"
            onClick={() => handleTypePermutationChange("RECEVOIR")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              typePermutation === "RECEVOIR" ? "bg-white text-[#6b7a12] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Recevoir
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {typePermutation === "ENVOYER"
            ? "Vous envoyez vos opérateurs à un autre projet"
            : "Vous recevez des opérateurs libres (uniquement aujourd'hui)"}
        </p>
      </div>

      {/* INFORMATIONS GENERALES */}
      <div className={sectionCls}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Informations générales
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* ✅ ENVOYER : choix destinataire */}
          {typePermutation === "ENVOYER" && (
            <div>
              <label className={labelCls}>
                Destinataire (superviseur) <span className="text-red-500">*</span>
              </label>
              <select
                className={`${inputCls} ${!receiverId ? "border-red-300" : ""}`}
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value ? Number(e.target.value) : ("" as any))}
                required
              >
                <option value="">-- Sélectionner --</option>
                {supervisors!
                  .filter((emp: any) => (connectedUser ? emp.id !== Number(connectedUser.id) : true))
                  .map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} (Matricule: {emp.matricule})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* production line */}
          <div>
            <label className={labelCls}>
              Projet / ligne de production <span className="text-red-500">*</span>
            </label>
            <select
              className={`${inputCls} ${!productionLineId ? "border-red-300" : ""}`}
              value={productionLineId}
              onChange={(e) => setProductionLineId(e.target.value ? Number(e.target.value) : ("" as any))}
              required
            >
              <option value="">-- Sélectionner --</option>
              {lines.map((line: any) => (
                <option key={line.id} value={line.id}>
                  {line.name ?? line.label ?? `Ligne #${line.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* user card */}
          <div>
            <label className={labelCls}>
              {typePermutation === "ENVOYER" ? "Émetteur" : "Destinataire"}
              <span className="ml-1 text-[10px] text-slate-400">(vous)</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <UserCircleIcon className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{connectedUser?.fullName || "Utilisateur"}</p>
                <p className="text-[11px] text-slate-500">Matricule: {connectedUser?.matricule || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* dates */}
          <div>
            <label className={labelCls}>
              Date de début <span className="text-red-500">*</span>
              {typePermutation === "RECEVOIR" && (
                <span className="ml-2 text-[10px] font-semibold text-slate-400">(aujourd'hui)</span>
              )}
            </label>
            <input
              type="date"
              className={`${inputCls} ${!canEditDates ? "bg-slate-100 text-slate-500" : ""}`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={!canEditDates}
            />
          </div>

          <div>
            <label className={labelCls}>
              Date de fin <span className="text-red-500">*</span>
              {typePermutation === "RECEVOIR" && (
                <span className="ml-2 text-[10px] font-semibold text-slate-400">(aujourd'hui)</span>
              )}
            </label>
            <input
              type="date"
              className={`${inputCls} ${!canEditDates ? "bg-slate-100 text-slate-500" : ""}`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              disabled={!canEditDates}
            />
          </div>
        </div>
      </div>

      {/* HORAIRES - Visible seulement si mode = "send" */}
      {mode === "send" && (
        <div className={sectionCls}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Horaires</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>
                Heure de début <span className="text-red-500">*</span>
              </label>
              <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>
                Heure de fin <span className="text-red-500">*</span>
              </label>
              <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
        </div>
      )}

      {/* OPERATEURS */}
      <div className={sectionCls}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {typePermutation === "ENVOYER" ? "Opérateurs à envoyer" : "Opérateurs libres (aujourd'hui)"}
          </p>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              operatorIds.length === 0 ? "bg-[#6b7a12]/10 text-[#6b7a12]" : "bg-[#6b7a12] text-white"
            }`}
          >
            {operatorIds.length === 0
              ? "Aucun opérateur sélectionné"
              : `${operatorIds.length} sélectionné${operatorIds.length > 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="mb-3 space-y-3">
          <input
            type="text"
            value={operatorsSearch}
            onChange={(e) => setOperatorsSearch(e.target.value)}
            placeholder="Rechercher par nom, matricule ou id..."
            className={inputCls}
          />

          {typePermutation === "ENVOYER" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Filtrer par :</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setAvailabilityFilter("all")} className={filterButtonCls(availabilityFilter === "all")}>
                  Tous
                  <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                    availabilityFilter === "all" ? "bg-white/20" : "bg-slate-300 text-slate-700"
                  }`}>
                    {availabilityStats.allCount}
                  </span>
                </button>

                <button type="button" onClick={() => setAvailabilityFilter("free")} className={filterButtonCls(availabilityFilter === "free")}>
                  Libre
                  <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                    availabilityFilter === "free" ? "bg-white/20" : "bg-[#6b7a12]/10 text-[#6b7a12]"
                  }`}>
                    {availabilityStats.freeCount}
                  </span>
                </button>

                <button type="button" onClick={() => setAvailabilityFilter("occupied")} className={filterButtonCls(availabilityFilter === "occupied", "red")}>
                  Occupé
                  <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                    availabilityFilter === "occupied" ? "bg-white/20" : "bg-red-100 text-red-600"
                  }`}>
                    {availabilityStats.occupiedCount}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Liste des opérateurs actuellement libres (aujourd'hui)
              </span>
            </div>
          )}
        </div>

        <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
          {filteredOperators.length === 0 && (
            <p className="text-xs text-slate-400">
              {typePermutation === "ENVOYER"
                ? "Aucun opérateur disponible pour cette période / recherche."
                : "Aucun opérateur libre disponible pour le moment."}
            </p>
          )}

          {filteredOperators.map((emp: OperatorRow) => {
            const checked = operatorIds.includes(Number(emp.id));
            const matricule = emp.matricule ?? "";
            const isFree = operatorAvailability.get(Number(emp.id)) ?? true;

            return (
              <label
                key={emp.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition ${
                  checked ? "border-[#6b7a12] bg-[#6b7a12]/5" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOperator(emp.id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#6b7a12] focus:ring-[#6b7a12]"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{emp.fullName}</p>

                    {typePermutation === "ENVOYER" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isFree ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isFree ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3" />
                            Libre
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-3 w-3" />
                            Occupé
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {matricule && (
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      MATRICULE OPÉRATEUR : {matricule}
                    </p>
                  )}

                  {/* ✅ ICI: affichage superviseur — GARANTI via normalisation au-dessus */}
                  {typePermutation === "RECEVOIR" && (
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold">Superviseur :</span>{" "}
                      {emp.supervisorFullName ?? "N/A"} (Matricule :{" "}
                      {emp.supervisorMatricule ?? "N/A"})
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          {typePermutation === "ENVOYER"
            ? "Cochez chaque opérateur concerné par cette permutation."
            : "Sélectionnez les opérateurs libres que vous souhaitez intégrer (uniquement aujourd'hui)."}
        </p>
      </div>

      {/* FOOTER BUTTON */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-full bg-[#6b7a12] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#5a6610] disabled:opacity-60"
        >
          {isPending
            ? "Création..."
            : typePermutation === "ENVOYER"
            ? "Envoyer les opérateurs"
            : "Recevoir les opérateurs"}
        </button>
      </div>
    </form>
  );
}

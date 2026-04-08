import type {Permutation} from "../types";
export function formatPermutation(p: Permutation) {
    return {
        ...p,
        timeRange: `${p.startTime.slice(0,5)} → ${p.endTime.slice(0,5)}`,
        dateRange: `${p.startDate} → ${p.endDate}`,

        statusLabel:
            p.status === "EN_ATTENTE"
                ? "En attente"
                : p.status === "ACCEPTEE"
                    ? "Acceptée"
                    : p.status === "TERMINEE"
                        ? "Terminée"
                        : "Refusée",
    };
}

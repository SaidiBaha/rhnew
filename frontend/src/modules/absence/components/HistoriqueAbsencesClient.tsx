import { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

interface AbsenceHistoriqueDto {
  date: string;
  total: number;
  present: number;
  absent: number;
  pending: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function HistoriqueAbsencesClient() {
  const [data, setData] = useState<AbsenceHistoriqueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { auth } = useAuth();

  useEffect(() => {
    axios.get("/absences/historique", {
      baseURL: API_BASE_URL,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(res => {
        console.log("Historique response:", res.data);
        const result = Array.isArray(res.data) ? res.data : res.data.content ?? [];
        setData(result);
      })
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) return <div className="p-6">Chargement...</div>;

  if (data.length === 0) return <div className="p-6">Aucun historique trouvé.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Historique des absences</h1>
      <div className="rounded-xl border overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">✅ Présent</th>
              <th className="px-4 py-3 text-center">❌ Absent</th>
              <th className="px-4 py-3 text-center">⏳ Pas encore</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.date}
                className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}
              >
                <td className="px-4 py-3 font-medium">
                  {new Date(row.date).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-center font-bold">{row.total}</td>
                <td className="px-4 py-3 text-center text-green-600 font-semibold">{row.present}</td>
                <td className="px-4 py-3 text-center text-red-600 font-semibold">{row.absent}</td>
                <td className="px-4 py-3 text-center text-orange-500 font-semibold">{row.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
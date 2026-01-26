import { useState } from "react";

interface Props {
    onCreated: () => void;
}

export function ReceiveEmployeeForm({ onCreated }: Props) {
    const [startDate, setStartDate] = useState("2026-01-24");
    const [endDate, setEndDate] = useState("2026-01-24");
    const [selectedOperators, setSelectedOperators] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Données temporaires - à remplacer par vos vraies données
    const operators = [
        { id: 1, name: "BEN TILI ANIS", matricule: "1", status: "libre" },
        { id: 2, name: "LASSOUED HEDI", matricule: "12", status: "libre" },
        { id: 3, name: "LAARIDHI SABRINE", matricule: "21", status: "libre" },
        { id: 4, name: "KHALOUI YOUSSEF", matricule: "24", status: "occupé" },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Logique de soumission ici
        console.log({ startDate, endDate, selectedOperators });
        onCreated();
    };

    const toggleOperator = (id: number) => {
        setSelectedOperators(prev =>
            prev.includes(id) ? prev.filter(opId => opId !== id) : [...prev, id]
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* INFORMATIONS GÉNÉRALES */}
            <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                    Informations générales
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Date de début
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#6b7a12]"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Date de fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#6b7a12]"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* OPÉRATEURS CONCERNÉS */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                        Opérateurs concernés
                    </h3>
                    <span className="text-xs text-[#6b7a12]">
                        {selectedOperators.length} opérateur{selectedOperators.length !== 1 ? 's' : ''} sélectionné{selectedOperators.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <input
                    type="text"
                    placeholder="Rechercher par nom, matricule ou id..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#6b7a12]"
                />

                {/* Filtres */}
                <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-600">Filtrer par :</span>
                    {/*<button
                        type="button"
                        className="rounded-full bg-[#6b7a12] px-3 py-1.5 font-medium text-white"
                    >
                        Tous <span className="ml-1.5">127</span>
                    </button>*/}
                    <button
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
                    >
                        Libres <span className="ml-1.5 text-[#6b7a12]">6</span>
                    </button>
                    {/*<button
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
                    >
                        Occupé <span className="ml-1.5 text-red-600">121</span>
                    </button>*/}
                </div>

                {/* Liste des opérateurs */}
                <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {operators.map((operator) => (
                        <label
                            key={operator.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 hover:bg-slate-50 ${
                                operator.status === "occupé" ? "opacity-60" : ""
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedOperators.includes(operator.id)}
                                onChange={() => toggleOperator(operator.id)}
                                disabled={operator.status === "occupé"}
                                className="h-4 w-4 rounded border-slate-300 text-[#6b7a12] focus:ring-[#6b7a12]"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900">
                                        {operator.name}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            operator.status === "libre"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {operator.status === "libre" ? "Libre" : "Occupé"}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    MATRICULE : {operator.matricule}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                    Cochez chaque opérateur concerné par cette permutation.
                </p>
            </div>

            {/* Bouton Créer */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    className="rounded-xl bg-[#6b7a12] px-6 py-3 font-medium text-white hover:bg-[#5a6610] transition-colors"
                >
                    Créer la permutation
                </button>
            </div>
        </form>
    );
}
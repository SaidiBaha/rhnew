import { useLocation, useNavigate } from "react-router-dom";
import ChangePasswordCard from "@/modules/auth/components/ChangePasswordCard";
import ModalPortal from "@/components/modals/ModalPortal";

export default function ChangePasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from || "/";

    const close = () => navigate(from);
    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
                <button
                    type="button"
                    aria-label="Fermer"
                    onClick={close}
                    className="absolute inset-0 bg-slate-900/10"
                />

                <div className="relative flex h-full w-full items-start justify-center pt-24 px-5">
                    <div className="w-full max-w-27xl mt-10">
                        <div className="mb-4 flex items-center gap-3">
                            <button
                                onClick={close}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                                title="Retour"
                            >
                                ←
                            </button>

                            <div>
                                <h1 className="text-3xl font-extrabold" style={{ color: "var(--navy)" }}>
                                    Changer le mot de passe
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Mettez à jour votre mot de passe en toute sécurité.
                                </p>
                            </div>
                        </div>

                        <ChangePasswordCard />
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

import { useMemo, useState } from "react";
import { ZodError } from "zod";
import { changePasswordSchema } from "../schema";
import { useChangePassword } from "../hooks/useChangePassword";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

type FieldErrors = Partial<
    Record<"currentPassword" | "newPassword" | "confirmationPassword", string>
>;

export default function ChangePasswordCard() {
    const { changePassword, isLoading, error, success, setError, setSuccess } =
        useChangePassword();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmationPassword, setConfirmationPassword] = useState("");
    const navigate = useNavigate();

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const ruleMin8 = useMemo(() => newPassword.length >= 8, [newPassword]);

    const validateForm = () => {
        setFieldErrors({});
        setError(null);
        setSuccess(null);

        try {
            changePasswordSchema.parse({
                currentPassword,
                newPassword,
                confirmationPassword,
            });
            return true;
        } catch (e) {
            if (e instanceof ZodError) {
                const nextErrors: FieldErrors = {};
                for (const issue of e.issues) {
                    const key = issue.path?.[0] as keyof FieldErrors;
                    if (key) nextErrors[key] = issue.message;
                }
                setFieldErrors(nextErrors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const ok = validateForm();
        if (!ok) return;

        const done = await changePassword({
            currentPassword,
            newPassword,
            confirmationPassword,
        });

        if (done) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmationPassword("");
            setFieldErrors({});

            setTimeout(() => {
                navigate("/");
            }, 1200);
        }
    };

    const onTyping =
        (field: keyof FieldErrors, setter: (v: string) => void) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                setter(e.target.value);

                setError(null);
                setSuccess(null);

                setFieldErrors((prev) => {
                    if (!prev[field]) return prev;
                    const next = { ...prev };
                    delete next[field];
                    return next;
                });

                if (field === "newPassword") {
                    setFieldErrors((prev) => {
                        if (!prev.confirmationPassword) return prev;
                        const next = { ...prev };
                        delete next.confirmationPassword;
                        return next;
                    });
                }
            };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="rounded-t-2xl border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">Sécurité du compte</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe.
                </p>
            </div>

            <div className="px-6 py-5">
                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field
                        label="Mot de passe actuel"
                        placeholder="Saisir le mot de passe actuel"
                        value={currentPassword}
                        onChange={onTyping("currentPassword", setCurrentPassword)}
                        show={showCurrent}
                        toggleShow={() => setShowCurrent((v) => !v)}
                        error={fieldErrors.currentPassword}
                    />

                    <div>
                        <Field
                            label="Nouveau mot de passe"
                            placeholder="Saisir le nouveau mot de passe"
                            value={newPassword}
                            onChange={onTyping("newPassword", setNewPassword)}
                            show={showNew}
                            toggleShow={() => setShowNew((v) => !v)}
                            error={fieldErrors.newPassword}
                        />

                        <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                  className={`h-2.5 w-2.5 rounded-full ${
                      ruleMin8 ? "bg-emerald-500" : "bg-slate-300"
                  }`}
              />
                            <span className={ruleMin8 ? "text-emerald-700" : "text-slate-600"}>
                Minimum 8 caractères
              </span>
                        </div>
                    </div>

                    <Field
                        label="Confirmer le nouveau mot de passe"
                        placeholder="Confirmer le nouveau mot de passe"
                        value={confirmationPassword}
                        onChange={onTyping("confirmationPassword", setConfirmationPassword)}
                        show={showConfirm}
                        toggleShow={() => setShowConfirm((v) => !v)}
                        error={fieldErrors.confirmationPassword}
                    />

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl bg-[#687818] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? "Mise à jour..." : "Mettre à jour"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setCurrentPassword("");
                                setNewPassword("");
                                setConfirmationPassword("");
                                setFieldErrors({});
                                setError(null);
                                setSuccess(null);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field(props: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    toggleShow: () => void;
    error?: string;
}) {
    const { label, placeholder, value, onChange, show, toggleShow, error } = props;

    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
                {label}
            </label>

            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm outline-none transition ${
                        error
                            ? "border-red-300 focus:border-red-400"
                            : "border-slate-200 focus:border-[#687818]"
                    }`}
                />

                <button
                    type="button"
                    onClick={toggleShow}
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-[#687818]"
                >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>

            {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}

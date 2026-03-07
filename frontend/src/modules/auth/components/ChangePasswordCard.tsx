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
        <div className="max-w-lg">
            {/* Header */}
            <div
                className="ds-card px-6 py-4 mb-4"
                style={{ position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}
            >
                <div
                    className="absolute bottom-0 left-0 h-0.5 w-32"
                    style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
                />
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
                    Compte
                    <span className="mx-2" style={{ color: "var(--border-mid)" }}>/</span>
                    <span style={{ color: "var(--text-2)" }}>Sécurité</span>
                </div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)" }}>Sécurité du compte</h2>
                <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                    Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe.
                </p>
            </div>

            {/* Form card */}
            <div className="ds-card px-6 py-5">
                {error && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-md px-4 py-3 text-sm"
                        style={{ background: "var(--red-soft)", border: "1px solid rgba(200,51,58,0.25)", color: "var(--red)", fontWeight: 500 }}
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-md px-4 py-3 text-sm"
                        style={{ background: "var(--green-soft)", border: "1px solid rgba(26,158,106,0.25)", color: "var(--green)", fontWeight: 500 }}
                    >
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

                        <div className="mt-2 flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: ruleMin8 ? "var(--green)" : "var(--border-mid)" }}
                            />
                            <span
                                style={{
                                    fontSize: "11px",
                                    color: ruleMin8 ? "var(--green)" : "var(--text-3)",
                                    fontWeight: ruleMin8 ? 600 : 400,
                                }}
                            >
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

                    <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="ds-btn-primary flex-1 justify-center py-2.5 disabled:opacity-60"
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
                            className="flex-1 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors"
                            style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--steel-light)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                            }}
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
            <label
                style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-2)",
                }}
            >
                {label}
            </label>

            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="ds-input w-full pr-10 h-10"
                    style={error ? { borderColor: "var(--red)", boxShadow: "0 0 0 3px rgba(200,51,58,0.10)" } : {}}
                />

                <button
                    type="button"
                    onClick={toggleShow}
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {error && (
                <p style={{ marginTop: "4px", fontSize: "11px", fontWeight: 500, color: "var(--red)" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

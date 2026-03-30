import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { LoginSchema } from "@/modules/auth/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { TriangleAlert } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import type { Auth } from "@/context/AuthProvider";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const LoginCard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>("");

  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      matricule: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof LoginSchema>) {
    setLoading(true);
    try {
      const response = await axios.post("/auth/login", data, {
        baseURL: API_BASE_URL,
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const { accessToken, refreshToken, user }: Auth = response.data;
console.log("role reçu:", user?.role);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth({ accessToken, refreshToken, user });
      localStorage.setItem("refreshToken", refreshToken || "");

     const role = user?.role;
if (role === "INFIRMIERE") {
  navigate("/absences-management", { replace: true });
} else {
  navigate("/", { replace: true });
}
    } catch {
      setError("Matricule ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full md:w-[440px] rounded-lg overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 40px rgba(26,35,50,0.12)",
      }}
    >
      {/* Header stripe */}
      <div
        className="px-8 py-6"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="absolute bottom-0 left-0 h-0.5 w-40"
          style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
        />
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-lg font-black"
            style={{ background: "var(--accent)" }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy)" }}>Sage RH</div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-3)",
              }}
            >
              Automotive
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>Se connecter</h1>
        <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
          Entrez votre matricule et mot de passe pour continuer
        </p>
      </div>

      {/* Form body */}
      <div className="px-8 py-7">
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="matricule"
              render={({ field }) => (
                <FormItem>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-2)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Matricule
                  </label>
                  <FormControl>
                    <Input
                      placeholder="Votre matricule"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-2)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Mot de passe
                  </label>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 500 }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion…
                </span>
              ) : (
                "Connexion"
              )}
            </button>
          </form>
        </Form>

        {error && (
          <div
            className="mt-4 flex items-center gap-2 rounded-md px-4 py-3"
            style={{
              background: "var(--red-soft)",
              border: "1px solid rgba(200,51,58,0.25)",
              color: "var(--red)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

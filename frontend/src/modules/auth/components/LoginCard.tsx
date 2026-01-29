import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { LoginSchema } from "@/modules/auth/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

// LoginCard.tsx - Ajoutez cette ligne après la récupération des données
async function onSubmit(data: z.infer<typeof LoginSchema>) {
  setLoading(true);
  try {
    const response = await axios.post("/auth/login", data, {
      baseURL: API_BASE_URL,
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });

    const { accessToken, refreshToken, user }: Auth = response.data;

    // Sauvegarder l'utilisateur dans localStorage
    localStorage.setItem("user", JSON.stringify(user));
    
    setAuth({ accessToken, refreshToken, user });
    localStorage.setItem("refreshToken", refreshToken || "");

    navigate("/", { replace: true });
  } catch {
    setError("Matricule ou mot de passe incorrect");
  } finally {
    setLoading(false);
  }
}
  return (
    <Card className="w-full h-full md:w-[487px] border-none shadow-none">
      <CardHeader className="flex flex-col justify-center items-center text-center">
        <CardTitle className="text-3xl">Se connecter</CardTitle>
        <CardDescription>
          Entrez votre matricule et mot de passe pour continuer
        </CardDescription>
      </CardHeader>

      <CardContent className="px-7">
        <Form {...form}>
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="matricule"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="matricule"
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
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mot de passe"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={loading}
              size="lg"
              className="w-full bg-[#687818]"
              type="submit"
            >
              Connexion
            </Button>
          </form>
        </Form>

        {error && (
          <Alert
            variant="destructive"
            className="mt-4 bg-destructive/15 font-semibold"
          >
            <TriangleAlert className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

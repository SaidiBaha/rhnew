import { useState } from "react";
import axios from "axios";
import useAuth from "@/hooks/useAuth.ts";

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmationPassword: string;
}

export function useChangePassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {auth} = useAuth();

    const changePassword = async (data: ChangePasswordRequest) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.put("http://192.168.8.32:9000/api/v1/users", data, {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                },
            });

            setSuccess("Mot de passe modifié avec succès.");
            return true;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data ||
                "Erreur lors du changement du mot de passe.";
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        changePassword,
        isLoading,
        error,
        success,
        setError,
        setSuccess,
    };
}

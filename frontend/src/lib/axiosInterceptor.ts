import axios from "axios";
import toast from "react-hot-toast";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      sessionStorage.setItem("session_expired", "1");
      window.location.replace("/login");
    } else if (status === 403) {
      toast.error("Accès refusé");
    } else if (!error.response) {
      toast.error("Erreur réseau, vérifiez votre connexion");
    }

    return Promise.reject(error);
  }
);

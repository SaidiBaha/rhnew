import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { AuthProvider } from "@/context/AuthProvider.tsx";
import QueryProvider from "@/lib/query-provider.tsx";

import "./index.css";
import "@/lib/axiosInterceptor";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </QueryProvider>
);

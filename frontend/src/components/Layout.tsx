import React from "react";
import { Sidebar } from "@/components/Sidebar";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen overflow-hidden bg-neutral-100">
      {/* SIDEBAR FIXE */}
      <Sidebar />

      {/* CONTENU DÉCALÉ - You'll need to handle this differently now */}
      <main className="h-screen overflow-auto p-4 transition-all duration-300 ml-64">
        {children}
      </main>
    </div>
  );
};
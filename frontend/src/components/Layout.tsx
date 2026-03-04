import React from "react";
import { Sidebar } from "@/components/Sidebar";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen overflow-hidden bg-neutral-100">
      {/* SIDEBAR FIXE */}
      <Sidebar />

      {/* CONTENU DÉCALÉ — margin synced via CSS :has(aside[data-expanded]) in index.css */}
      <main className="h-screen overflow-auto p-6 transition-[margin] duration-300 ml-64">
        {children}
      </main>
    </div>
  );
};
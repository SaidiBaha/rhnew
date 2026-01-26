import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="h-screen overflow-hidden bg-neutral-100">
      {/* SIDEBAR FIXE */}
      <Sidebar
        expanded={sidebarExpanded}
        setExpanded={setSidebarExpanded}
      />

      {/* CONTENU DÉCALÉ */}
      <main
        className={`
          h-screen overflow-auto p-4 transition-all duration-300
          ${sidebarExpanded ? "ml-64" : "ml-20"}
        `}
      >
        {children}
      </main>
    </div>
  );
};

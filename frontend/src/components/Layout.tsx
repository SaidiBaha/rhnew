import React from "react";

import { Sidebar } from "@/components/Sidebar";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex min-h-screen bg-neutral-100">
      <Sidebar />
      <div className="flex-1 w-full min-w-0 p-4">{children}</div>
    </main>
  );
};

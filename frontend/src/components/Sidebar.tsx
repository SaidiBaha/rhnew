import { useState } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ArrowLeftIcon, ArrowRightIcon, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useLogout from "@/hooks/useLogout";
import useAuth from "@/hooks/useAuth";
import type { UserRole } from "@/modules/auth/types";

/* ===================== SIDEBAR ITEM ===================== */
interface SidebarItemProps {
  active?: boolean;
  icon: IconName;
  label: string;
  expanded: boolean;
  onClick: () => void;
}

const SidebarItem = ({
  icon,
  active = false,
  label,
  expanded,
  onClick,
}: SidebarItemProps) => {
  return (
    <li>
      <button
        onClick={onClick}
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
          ${active ? "bg-white text-[#687818]" : "text-white hover:bg-white/20"}
        `}
      >
        <DynamicIcon name={icon} className="h-5 w-5 shrink-0" />

        {expanded && (
          <span className="whitespace-nowrap">{label}</span>
        )}
      </button>
    </li>
  );
};

/* ===================== SIDEBAR ===================== */
interface NavigationItem {
  label: string;
  icon: IconName;
  path: string;
  allowedRoles: UserRole[];
}

export const Sidebar = () => {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;
  const logout = useLogout();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const navigationItems: NavigationItem[] = [
    { label: "Accueil", icon: "home", path: "/", allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Employés", icon: "users", path: "/employees", allowedRoles: ["ADMIN"] },
    { label: "Création d'Employés", icon: "user-plus", path: "/addEmployee", allowedRoles: ["ADMIN"] },
    { label: "Avances", icon: "hand-coins", path: "/salary-advances", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Pointage", icon: "clipboard-clock", path: "/attendances", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Correction Pointage", icon: "search-check", path: "", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Demandes Documents", icon: "newspaper", path: "/requests", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Gestion de Carrière", icon: "briefcase-business", path: "", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Permutations", icon: "shuffle", path: "/permutations", allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Opérateurs Disponibles", icon: "user-check", path: "/free-operators", allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Changer mot de passe", icon: "lock-keyhole", path: "/change-password", allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#687818] transition-all duration-300 z-40 ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      <nav className="flex h-full flex-col">
        {/* ================= LOGO ================= */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#687818] text-xl font-bold">
              S
            </div>
            {expanded && (
              <span className="text-sm font-semibold text-white leading-tight">
                Sage<br />Automotive
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg bg-white p-1"
          >
            {expanded ? (
              <ArrowLeftIcon className="h-4 w-4" />
            ) : (
              <ArrowRightIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ================= USER ================= */}
        {expanded && user && (
          <div className="mx-3 mb-4 rounded-xl bg-white/10 px-4 py-3 text-white">
            <div className="text-sm font-semibold uppercase">
              {user.fullName}
            </div>
            <div className="text-xs opacity-80">
              Matricule #{user.matricule}
            </div>
            <span className="mt-1 inline-block rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold">
              {user.role}
            </span>
          </div>
        )}

        {/* ================= MENU ================= */}
        <ul className="flex-1 space-y-1 overflow-y-auto px-3">
          {navigationItems
            .filter(
              (item) =>
                auth.user?.role &&
                item.allowedRoles.includes(auth.user.role)
            )
            .map((item, index) => (
              <SidebarItem
                key={index}
                icon={item.icon}
                label={item.label}
                expanded={expanded}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              />
            ))}
        </ul>

        {/* ================= LOGOUT ================= */}
        <div className="p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            {expanded && "Déconnexion"}
          </button>
        </div>
      </nav>
    </aside>
  );
};
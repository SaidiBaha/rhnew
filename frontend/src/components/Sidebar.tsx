import { useState } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ArrowLeftIcon, ArrowRightIcon, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useLogout from "@/hooks/useLogout";
import useAuth from "@/hooks/useAuth";
import type { UserRole } from "@/modules/auth/types";

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
  expanded = false,
  onClick,
}: SidebarItemProps) => {
  return (
    <>
      <li>
        <button
          className={`
         relative my-1 flex w-full cursor-pointer
         items-center rounded-md px-3
         py-2 font-medium transition-colors
         ${
           active
             ? "text-primary-500 bg-linear-to-tr from-indigo-200 to-indigo-100"
             : "text-white hover:bg-indigo-50 hover:text-black"
         }
         ${!expanded ? "hidden sm:flex justify-center" : "hidden sm:flex"}
     `}
          onClick={onClick}
        >
          <DynamicIcon className="h-6 w-6" name={icon} />

          <span
            className={`overflow-hidden text-start transition-all whitespace-nowrap ${
              expanded ? "ml-3 w-44" : "w-0"
            }`}
          >
            {label}
          </span>

          {/* 
            display item text or sub-menu items when hovered
          */}
          {!expanded && (
            <div
              className={`
            text-primary-500 invisible absolute left-full ml-6 -translate-x-3
            rounded-md bg-indigo-100 px-2
            py-1 text-sm opacity-20 transition-all
            group-hover:visible group-hover:translate-x-0 group-hover:opacity-100
        `}
            >
              {/* 
                if hovered item has no sub-menu, display the text
                else display the sub-menu items
              */}
            </div>
          )}
        </button>
      </li>
    </>
  );
};

interface NavigationItem {
  label: string;
  icon: IconName;
  path: string;
  allowedRoles: UserRole[];
}

export const Sidebar = () => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();

  const logout = useLogout();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const navigationItems: NavigationItem[] = [
    {
      label: "Acceuil",
      icon: "home",
      path: "/",
      allowedRoles: ["ADMIN", "SUPERVISOR","OPERATIONAL_MANAGER"],
    },
    {
      label: "Employés",
      icon: "users",
      path: "/employees",
      allowedRoles: ["ADMIN"],
    },
    {
      label: "Création d'Employés",
      icon: "user-plus",
      path: "",
      allowedRoles: ["ADMIN"],
    },
    {
      label: "Avances",
      icon: "hand-coins",
      path: "/salary-advances",
      allowedRoles: ["ADMIN", "SUPERVISOR"],
    },
    {
      label: "Pointage",
      icon: "clipboard-clock",
      path: "/attendances",
      allowedRoles: ["ADMIN", "SUPERVISOR"],
    },
    {
      label: "Correction Pointage",
      icon: "search-check",
      path: "",
      allowedRoles: ["ADMIN", "SUPERVISOR"],
    },
    {
      label: "Demandes Documents",
      icon: "newspaper",
      path: "/requests",
      allowedRoles: ["ADMIN", "SUPERVISOR"],
    },
    {
      label: "Gestion de Carrière",
      icon: "briefcase-business",
      path: "",
      allowedRoles: ["ADMIN", "SUPERVISOR"],
    },
    {
      label: "Permutations",
      icon: "shuffle",
      path: "/permutations",
      allowedRoles: ["SUPERVISOR","OPERATIONAL_MANAGER"],
    },
    {
      label: "Changer mot de passe",
      icon: "lock-keyhole",
      path: "/change-password",
      allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"],
    },


  ];

  return (
    <div className="sticky top-0 h-screen z-20">
      <div
        className={`fixed inset-0 -z-10 block bg-neutral-400 ${
          expanded ? "block sm:hidden" : "hidden"
        }`}
      />
      <aside
        className={`box-border h-full transition-all ${
          expanded ? "w-5/6 sm:w-64" : "w-0 sm:w-20"
        }`}
      >
        <nav className="flex h-full flex-col bg-[#687818] shadow-sm">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className={`${expanded ? "" : "hidden sm:block"}`}>
              <button
                onClick={() => setExpanded((curr: boolean) => !curr)}
                className="rounded-lg bg-gray-50 p-1.5 hover:bg-gray-100"
              >
                {expanded ? (
                  <ArrowRightIcon className="h-6 w-6" />
                ) : (
                  <ArrowLeftIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          <ul className="flex flex-col items-center justify-center gap-y-2 flex-1 px-3 overflow-y-auto overflow-x-hidden">
            {navigationItems
              .filter(
                (item) =>
                  auth.user?.role && item.allowedRoles.includes(auth.user?.role)
              )
              .map((item, index) => (
                <SidebarItem
                  key={index}
                  expanded={expanded}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                />
              ))}
          </ul>

          {/* Sidebar footer */}
          <div className="flex items-center justify-between p-4 pb-2">
            <button
              onClick={signOut}
              className={
                "flex items-center justify-center gap-x-2 rounded-lg h-10 w-full bg-indigo-100 shadow-md font-semibold text-xs text-black hover:cursor-pointer hover:bg-indigo-50"
              }
            >
              <LogOut className="size-6" />

              <span className={`${expanded ? "" : "hidden"}`}>
                {" "}
                Déconnexion
              </span>
            </button>
          </div>
        </nav>
      </aside>
    </div>
  );
};

import AbsencesManagementPage from "@/pages/AbsencesManagementPage";
import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import EmployeesPage from "@/pages/EmployeesPage";
import SalaryAdvancesPage from "@/pages/SalaryAdvancesPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import VerifyOtpPage from "@/pages/VerifyOtpPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { Layout } from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PersistLogin from "@/components/PersistLogin";
import RequestsPage from "@/pages/RequestsPage";
import AttendancesPage from "@/pages/AttendancesPage";
import PermutationsPage from "@/pages/PermutationsPage";
import ChangePasswordCard from "@/modules/auth/components/ChangePasswordCard.tsx";
import OperatorsAvailabilityPage from "@/pages/OperatorsAvailabilityPage";
import { CreateEmployeeForm } from "@/pages/CreateEmployeeForm";
import HistoriqueAbsencesPage from "@/pages/HistoriqueAbsencesPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PersistLogin />}>

        {/* ADMIN, SUPERVISOR, OPERATIONAL_MANAGER */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"]} />}>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/employees" element={<Layout><EmployeesPage /></Layout>} />
        </Route>

        {/* ADMIN uniquement */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/addEployeem" element={<Layout><CreateEmployeeForm /></Layout>} />
        </Route>

        {/* ADMIN + SUPERVISOR */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}>
          <Route path="/salary-advances" element={<Layout><SalaryAdvancesPage /></Layout>} />
          <Route path="/attendances" element={<Layout><AttendancesPage /></Layout>} />
          <Route path="/requests" element={<Layout><RequestsPage /></Layout>} />
          <Route path="/historique-absences" element={<Layout><HistoriqueAbsencesPage /></Layout>} />
        </Route>

        {/* SUPERVISOR + OPERATIONAL_MANAGER */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER"]} />}>
          <Route path="/permutations" element={<Layout><PermutationsPage /></Layout>} />
        </Route>

        {/* ADMIN + SUPERVISOR + OPERATIONAL_MANAGER */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"]} />}>
          <Route path="/free-operators" element={<Layout><OperatorsAvailabilityPage /></Layout>} />
        </Route>

        {/* Tous les rôles connectés */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "INFIRMIERE"]} />}>
          <Route path="/change-password" element={<Layout><ChangePasswordCard /></Layout>} />
        </Route>

        {/* ABSENCES — ADMIN + SUPERVISOR + INFIRMIERE */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "INFIRMIERE"]} />}>
          <Route path="/absences-management" element={<Layout><AbsencesManagementPage /></Layout>} />
        </Route>

      </Route>
    </Routes>
  );
}

export default App;
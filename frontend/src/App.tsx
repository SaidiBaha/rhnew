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

// import { CreateEmployeeForm } from "@/pages/CreateEmployeeForm";
import CreateEmployeePage from "@/pages/CreateEmployeePage";

function App() {
  return (
    
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* <Route
  element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"]} />}
>
  <Route
    path="/todo"
    element={
      <Layout>
        <TodoRH />
      </Layout>
    }
  />
</Route> */}

      <Route element={<PersistLogin />}>
        {/* Routes accessibles par ADMIN, SUPERVISOR et OPERATIONAL_MANAGER */}
        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"]} />}
        >
          
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/employees"
            element={
              <Layout>
                <EmployeesPage />
              </Layout>
            }
          />
        </Route>

        {/* Routes accessibles uniquement par ADMIN */}
        {/* <Route
          element={<ProtectedRoute allowedRoles={["ADMIN"]} />}
        >
          <Route
            path="/addEmployee"
            element={
              <Layout>
                <CreateEmployeeForm />
              </Layout>
            }
          />
        </Route> */}

        {/* Routes accessibles uniquement par ADMIN */}
        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN"]} />}
        >
          <Route
            path="/create-employee"
            element={
              <Layout>
                <CreateEmployeePage />
              </Layout>
            }
          />
        </Route>

        {/* Routes accessibles par ADMIN et SUPERVISOR */}
        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/salary-advances"
            element={
              <Layout>
                <SalaryAdvancesPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/attendances"
            element={
              <Layout>
                <AttendancesPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/requests"
            element={
              <Layout>
                <RequestsPage />
              </Layout>
            }
          />
        </Route>

        {/* Routes accessibles par SUPERVISOR et OPERATIONAL_MANAGER */}
        <Route
          element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER"]} />}
        >
          <Route
            path="/permutations"
            element={
              <Layout>
                <PermutationsPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER"]} />}
        >
          <Route
            path="/free-operators"
            element={
              <Layout>
                <OperatorsAvailabilityPage />
              </Layout>
            }
          />
        </Route>

        {/* Routes accessibles par tous les rôles connectés */}
        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"]} />}
        >
          <Route
            path="/change-password"
            element={
              <Layout>
                <ChangePasswordCard />
              </Layout>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
import { Navigate, createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { NotFoundPage } from "@/pages/not-found-page"
import { LoginPage } from "@/pages/auth/login-page"
import { RegisterPage } from "@/pages/auth/register-page"
import { AssistantPage } from "@/pages/app/assistant-page"
import { DashboardPage } from "@/pages/app/dashboard-page"
import { NewTransactionPage } from "@/pages/app/new-transaction-page"
import { ProfilePage } from "@/pages/app/profile-page"
import { ReportsPage } from "@/pages/app/reports-page"
import { TransactionsPage } from "@/pages/app/transactions-page"
import { ProtectedRoute } from "@/routes/protected-route"
import { paths } from "@/routes/paths"

export const router = createBrowserRouter([
  // Área pública: acessível sem sessão ativa.
  {
    element: <AuthLayout />,
    children: [
      { path: paths.public.login, element: <LoginPage /> },
      { path: paths.public.register, element: <RegisterPage /> },
    ],
  },

  // Área privada: exige sessão ativa.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: paths.app.dashboard, element: <DashboardPage /> },
          { path: paths.app.transactions, element: <TransactionsPage /> },
          { path: paths.app.newTransaction, element: <NewTransactionPage /> },
          { path: paths.app.reports, element: <ReportsPage /> },
          { path: paths.app.assistant, element: <AssistantPage /> },
          { path: paths.app.profile, element: <ProfilePage /> },
          { path: paths.app.settings, element: <ProfilePage /> },
        ],
      },
    ],
  },

  // A raiz leva ao dashboard; sem sessão o ProtectedRoute devolve ao login.
  { path: "/", element: <Navigate to={paths.app.dashboard} replace /> },
  { path: "*", element: <NotFoundPage /> },
])

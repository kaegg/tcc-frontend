import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useSessionExpiredToast } from "@/hooks/use-session-expired-toast"
import { queryClient } from "@/lib/api/query-client"
import { router } from "@/routes/app-router"

export default function App() {
  // Num único ponto da árvore: montado em vários, cada consulta que falhasse
  // com 401 renderia o seu próprio aviso.
  useSessionExpiredToast()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

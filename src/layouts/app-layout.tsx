import { Link, Outlet } from "react-router-dom"

import { ApiStatusBanner } from "@/components/app/api-status-banner"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuthenticatedUser } from "@/hooks/use-session"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

/**
 * Shell das rotas privadas: menu lateral fixo, barra superior e a área de
 * conteúdo onde cada tela é renderizada.
 */
export function AppLayout() {
  const user = useAuthenticatedUser()

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />

          <div className="ml-auto">
            <Link
              to={paths.app.profile}
              // Contém o nome visível (WCAG 2.5.3) e continua nomeado em tela
              // estreita, onde o nome some da vista.
              aria-label={`Perfil: ${user.name}`}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 gap-2 pr-2.5 pl-1.5",
              )}
            >
              <Avatar className="size-6" aria-hidden="true">
                <AvatarFallback className="text-[11px]">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{user.name}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <ApiStatusBanner />
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

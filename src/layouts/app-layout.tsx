import { Link, Outlet, useNavigate } from "react-router-dom"
import { LogOut, Settings, User } from "lucide-react"
import { toast } from "sonner"

import { ApiStatusBanner } from "@/components/app/api-status-banner"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuthenticatedUser } from "@/hooks/use-session"
import { signOut } from "@/lib/api/auth-session"
import { paths } from "@/routes/paths"

/**
 * Shell das rotas privadas: menu lateral fixo, barra superior e a área de
 * conteúdo onde cada tela é renderizada.
 */
export function AppLayout() {
  const user = useAuthenticatedUser()
  const navigate = useNavigate()

  async function handleSignOut() {
    const confirmed = await signOut()

    if (!confirmed) {
      toast.warning("Não foi possível confirmar o encerramento no servidor", {
        description:
          "Você saiu deste navegador, mas a sessão pode continuar ativa. Tente sair novamente quando a conexão voltar.",
      })
    }

    navigate(paths.public.login, { replace: true })
  }

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 pr-2.5 pl-1.5"
                    aria-label="Abrir menu da conta"
                  />
                }
              >
                <Avatar className="size-6">
                  <AvatarFallback className="text-[11px]">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.name}</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to={paths.app.profile} />}>
                  <User />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to={paths.app.settings} />}>
                  <Settings />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSignOut()}>
                  <LogOut />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

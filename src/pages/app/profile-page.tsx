import { useLocation } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { ProfileDataForm } from "@/components/profile/profile-data-form"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthenticatedUser } from "@/hooks/use-session"
import { paths } from "@/routes/paths"

export function ProfilePage() {
  const user = useAuthenticatedUser()
  const { pathname } = useLocation()

  // "Perfil" e "Configurações" são dois itens do menu que abrem a mesma tela em
  // abas diferentes.
  const defaultTab = pathname === paths.app.settings ? "preferencias" : "dados"

  function notifyPending(area: string) {
    toast.info(`${area} ainda não é persistido`, {
      description: "A gravação real entra com a API de usuários.",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        description="Seus dados de acesso e as preferências da conta."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-base">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-lg font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button
            variant="outline"
            className="ml-auto h-9"
            onClick={() => notifyPending("Foto do perfil")}
          >
            Alterar foto
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>Informações pessoais</CardTitle>
              <CardDescription>
                Estes dados identificam sua conta no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileDataForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="mt-4">
          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>Alterar senha</CardTitle>
              <CardDescription>
                Use uma senha que você não utilize em outros serviços.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4">
          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>Preferências da conta</CardTitle>
              <CardDescription>
                Ajustes que afetam como os dados são exibidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="moeda">Moeda</FieldLabel>
                    <Select defaultValue="brl">
                      <SelectTrigger id="moeda" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brl">Real (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="inicio">
                      Tela inicial ao entrar
                    </FieldLabel>
                    <Select defaultValue="dashboard">
                      <SelectTrigger id="inicio" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="lancamentos">Lançamentos</SelectItem>
                        <SelectItem value="assistente">
                          Assistente IA
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="h-10 sm:w-40"
                    onClick={() => notifyPending("Preferências")}
                  >
                    Salvar preferências
                  </Button>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

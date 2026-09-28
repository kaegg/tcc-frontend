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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthenticatedUser } from "@/hooks/use-session"

export function ProfilePage() {
  const user = useAuthenticatedUser()

  function notifyPending(area: string) {
    toast.info(`${area} ainda não é persistido`, {
      description: "A gravação real entra com a API de usuários.",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        description="Seus dados de acesso e a segurança da conta."
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

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
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
      </Tabs>
    </div>
  )
}

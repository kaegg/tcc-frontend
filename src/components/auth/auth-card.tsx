import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"

/**
 * Moldura compartilhada pelas telas de login e cadastro, para que as duas
 * mantenham o mesmo cabeçalho, espaçamento e hierarquia visual.
 */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <h1
          data-slot="card-title"
          className="font-heading text-xl leading-snug font-semibold tracking-tight"
        >
          {title}
        </h1>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

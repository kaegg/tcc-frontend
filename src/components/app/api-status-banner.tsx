import { CircleAlert, RefreshCw, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useApiHealth } from "@/hooks/use-api-health"
import { BACKEND_UNAVAILABLE_MESSAGE } from "@/lib/api/messages"

/**
 * Aviso de indisponibilidade da API.
 */
export function ApiStatusBanner() {
  const { status, refetch, isFetching } = useApiHealth()

  return (
    <div role="status" aria-live="polite">
      {status === "offline" ? (
        <Alert variant="destructive" className="mb-4">
          <CircleAlert />
          <AlertTitle>Sem conexão com o servidor</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{BACKEND_UNAVAILABLE_MESSAGE}</p>
            <Button
              variant="outline"
              className="h-8"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw />
              {isFetching ? "Verificando..." : "Tentar novamente"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "degradado" ? (
        <Alert className="mb-4">
          <TriangleAlert />
          <AlertTitle>Serviço parcialmente indisponível</AlertTitle>
          <AlertDescription>
            A aplicação está no ar, mas uma dependência não está respondendo.
            Alguns dados podem não carregar.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

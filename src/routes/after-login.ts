import { paths } from "@/routes/paths"

const PUBLIC_PATHS: readonly string[] = Object.values(paths.public)

/**
 * Para onde ir depois de autenticar: a rota privada que o usuário tentou abrir
 * (guardada pelo ProtectedRoute em `state.from`) ou o dashboard.
 *
 * O login e o GuestRoute usam esta mesma função. Se discordassem, as duas
 * navegações disparadas no instante do login competiriam pelo destino.
 *
 * Só caminho interno é aceito: `//outro-site.com` é tratado pelo navegador como
 * endereço de outro domínio (open redirect). Rota pública também é recusada,
 * senão o GuestRoute redirecionaria para si mesmo.
 */
export function afterLoginPath(state: unknown): string {
  const from = (state as { from?: { pathname?: unknown; search?: unknown } })
    ?.from
  const pathname = from?.pathname
  const search = typeof from?.search === "string" ? from.search : ""

  const internal =
    typeof pathname === "string" &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    !pathname.includes("\\") &&
    !PUBLIC_PATHS.includes(pathname)

  return internal ? `${pathname}${search}` : paths.app.dashboard
}

/** Tela exibida enquanto o cookie de refresh é conferido. */
export function SessionCheck() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center text-sm text-muted-foreground"
    >
      Verificando sua sessão...
    </div>
  )
}

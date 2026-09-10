import { Outlet } from "react-router-dom"
import { FormInput, Sparkles } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { Separator } from "@/components/ui/separator"

/**
 * Shell das rotas públicas (login e cadastro). Em telas grandes divide a página
 * entre um painel de marca e o formulário; abaixo de lg o painel some e sobra
 * apenas o formulário, centralizado.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r bg-sidebar p-12 lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 size-[26rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-40 size-[26rem] rounded-full bg-ai/10 blur-3xl"
      />

      <Logo className="relative" />

      <div className="relative max-w-md space-y-8">
        <div className="space-y-4">
          <h1 className="font-heading text-4xl leading-[1.15] font-semibold tracking-tight text-balance">
            Duas formas de registrar. Um só controle financeiro.
          </h1>
          <p className="text-pretty text-muted-foreground">
            Lance receitas e despesas pelo formulário de sempre — ou apenas
            escreva o que aconteceu e deixe o assistente interpretar.
          </p>
        </div>

        <DualModePreview />
      </div>

      <p className="relative text-xs text-muted-foreground">
        Trabalho de Conclusão de Curso · Universidade Estadual de Maringá · 2026
      </p>
    </aside>
  )
}

/**
 * Amostra estática das duas formas de interação do sistema.
 */
function DualModePreview() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="rounded-xl bg-card/70 p-4 ring-1 ring-border backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FormInput className="size-3.5" />
          Formulário
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PreviewField label="Valor" value="R$ 35,00" mono />
          <PreviewField label="Categoria" value="Alimentação" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          mesma tarefa
        </span>
        <Separator className="flex-1" />
      </div>

      <div className="rounded-xl bg-card/70 p-4 ring-1 ring-ai/25 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-medium text-ai-accent">
          <Sparkles className="size-3.5" />
          Assistente IA
        </div>
        <div className="mt-3 space-y-2">
          <p className="ml-auto w-fit rounded-lg rounded-br-sm bg-primary/10 px-3 py-2 text-xs">
            Gastei R$ 35 com almoço hoje
          </p>
          <div className="rounded-lg rounded-bl-sm bg-background/60 px-3 py-2 ring-1 ring-border">
            <p className="text-xs text-muted-foreground">
              Identifiquei uma despesa:
            </p>
            <p className="mt-1 text-xs">
              <span className="financial-value">R$ 35,00</span> · Alimentação ·
              hoje
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Aguardando sua confirmação
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg bg-background/60 px-2.5 py-2 ring-1 ring-border">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className={mono ? "financial-value text-sm" : "text-sm"}>
        {value}
      </div>
    </div>
  )
}

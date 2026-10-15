import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Logo } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const TERMS_VERSION = "14 de outubro de 2026"

/**
 * Termos de Uso, aceitos no cadastro (TCC-030). Pública: quem ainda não tem
 * conta precisa lê-la antes de aceitar. O texto é a fonte de verdade do que a
 * coleta faz — mudar a coleta pede mudar este texto e a data acima.
 */
export function TermsPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <Link
            to="/"
            className={cn(buttonVariants({ variant: "ghost" }), "h-9")}
          >
            Ir para o IntelliFinance
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-sm text-muted-foreground">
            Versão de {TERMS_VERSION}
          </p>
        </div>

        <Section title="1. O que é o IntelliFinance">
          <p>
            O IntelliFinance é um sistema de gestão financeira pessoal
            desenvolvido como Trabalho de Conclusão de Curso (TCC) do curso de
            Engenharia de Software da Universidade Estadual de Maringá (UEM), em
            2026. É um projeto acadêmico, sem fins comerciais, criado para
            comparar duas formas de realizar as mesmas tarefas: um formulário
            convencional e um assistente conversacional com inteligência
            artificial.
          </p>
          <p>
            O sistema não oferece aconselhamento financeiro. Os valores e
            relatórios mostrados são apenas os que você mesmo registrar.
          </p>
        </Section>

        <Section title="2. Sua conta e seus dados financeiros">
          <p>
            Para usar o sistema, você informa nome, e-mail e senha. A senha é
            guardada de forma cifrada e ninguém, nem a equipe do projeto,
            consegue lê-la. Os lançamentos que você registrar (receitas,
            despesas, categorias, datas e descrições) ficam vinculados à sua
            conta e servem só para o funcionamento do sistema: não são vendidos,
            compartilhados nem usados na pesquisa.
          </p>
          <p>
            Você pode usar valores fictícios, se preferir. Você é responsável
            por manter sua senha em segredo.
          </p>
        </Section>

        <Section title="3. O assistente de inteligência artificial">
          <p>
            O assistente interpreta o que você escreve usando um modelo de
            linguagem que roda no próprio servidor do projeto. Suas mensagens{" "}
            <strong>
              não são enviadas a empresas de inteligência artificial
            </strong>{" "}
            nem a serviços externos.
          </p>
          <p>
            A interpretação pode errar. Por isso, nenhum lançamento é gravado
            pelo assistente sem a sua confirmação, e os valores e totais que ele
            mostra vêm dos seus próprios registros, não do modelo.
          </p>
        </Section>

        <Section title="4. Coleta anônima de dados de uso para a pesquisa">
          <p>
            Para avaliar as duas formas de uso, o sistema registra, de forma{" "}
            <strong>anônima</strong>, como as tarefas são realizadas. Isso
            acontece em segundo plano e não muda em nada a sua experiência: não
            há telas, avisos ou etapas a mais.
          </p>
          <p>
            <strong>O que é registrado</strong>, para cada cadastro de
            lançamento e cada consulta de relatório:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>se foi feito pelo formulário ou pelo assistente;</li>
            <li>
              o tipo de tarefa (cadastro de despesa, de receita ou consulta);
            </li>
            <li>quanto tempo levou;</li>
            <li>
              quantos cliques (no formulário) ou mensagens (no assistente) foram
              necessários;
            </li>
            <li>quantos erros apareceram;</li>
            <li>
              se a tarefa foi concluída, interrompida ou terminou com erro.
            </li>
          </ul>
          <p>
            <strong>O que nunca é registrado</strong>: seu nome, e-mail ou
            senha; os valores, categorias e descrições dos seus lançamentos; o
            texto das suas mensagens; seu endereço IP ou dados do seu
            dispositivo.
          </p>
          <p>
            <strong>Como o anonimato é garantido</strong>: cada registro leva
            apenas um código aleatório, gerado no seu navegador, que não tem
            ligação com a sua conta. A tabela da pesquisa não contém nenhuma
            informação que permita identificar quem realizou cada tarefa. Por
            esse mesmo motivo, depois de coletado, um registro não pode ser
            localizado ou excluído individualmente.
          </p>
          <p>
            Os dados são usados apenas de forma agregada (médias, totais e
            comparações) na monografia do TCC e em trabalhos acadêmicos dele
            derivados.
          </p>
        </Section>

        <Section title="5. Lei Geral de Proteção de Dados (LGPD)">
          <p>
            Os dados pessoais da sua conta são tratados conforme a Lei nº
            13.709/2018 (LGPD), apenas para as finalidades descritas acima. Os
            dados de uso da seção 4 são anônimos e, por isso, não identificam
            você. Você pode consultar e corrigir seus dados de cadastro na
            página Perfil e pode solicitar ao responsável pelo projeto
            informações sobre o tratamento ou a exclusão da sua conta.
          </p>
        </Section>

        <Section title="6. Alterações destes termos">
          <p>
            Se estes termos mudarem, a nova versão será publicada nesta página,
            com a data atualizada.
          </p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-pretty">
      <h2 className="font-heading text-lg font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

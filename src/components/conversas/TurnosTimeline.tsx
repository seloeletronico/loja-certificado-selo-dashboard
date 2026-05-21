"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversaTurno } from "@/lib/conversas";
import { cn } from "@/lib/utils";

type Props = {
  turnos: ConversaTurno[];
};

const ATOR_CONFIG = {
  CLIENTE: {
    align: "justify-end",
    bubble: "bg-neutral-800 text-neutral-100 dark:bg-neutral-700 rounded-2xl rounded-tr-sm",
    label: null,
  },
  IA: {
    align: "justify-start",
    bubble: "bg-muted text-foreground rounded-2xl rounded-tl-sm",
    label: "IA",
  },
  HUMANO: {
    align: "justify-start",
    bubble: "bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800 rounded-2xl rounded-tl-sm",
    label: "Operador",
  },
} as const;

function ToolCallChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
      chamou {name}
    </span>
  );
}

export function TurnosTimeline({ turnos }: Props) {
  if (turnos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum turno registrado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {turnos.map((turno) => {
        const cfg = ATOR_CONFIG[turno.ator];
        const toolNames = (turno.toolCalls ?? [])
          .map((tc: unknown) => {
            if (tc && typeof tc === "object" && "name" in tc) {
              return (tc as { name: string }).name;
            }
            return null;
          })
          .filter(Boolean) as string[];

        return (
          <div key={turno.id} className={cn("flex", cfg.align)}>
            <div className="max-w-[75%]">
              {cfg.label && (
                <span className="text-[11px] text-muted-foreground font-medium mb-0.5 block px-1">
                  {cfg.label}
                </span>
              )}
              <div className={cn("px-4 py-2.5 text-sm", cfg.bubble)}>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{turno.texto}</p>
                {toolNames.map((name) => (
                  <ToolCallChip key={name} name={name} />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block px-1">
                {formatDistanceToNow(new Date(turno.createdAt), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

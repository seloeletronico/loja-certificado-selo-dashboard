"use client";

import { ConversaCanal, ConversaStatus } from "@/lib/conversas";

type Periodo = "hoje" | "24h" | "7d" | "30d" | "";

export type FiltrosConversas = {
  status: ConversaStatus | "";
  canal: ConversaCanal | "";
  periodo: Periodo;
  cpfHash: string;
};

const STATUS_OPTS: { value: ConversaStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "ATIVA", label: "Ativa" },
  { value: "IA_PAUSADA", label: "IA Pausada" },
  { value: "HUMANO", label: "Humano" },
  { value: "CONVERTEU", label: "Converteu" },
  { value: "ABANDONADA", label: "Abandonada" },
];

const CANAL_OPTS: { value: ConversaCanal | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "SITE", label: "Site" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SIMULADOR", label: "Simulador" },
];

const PERIODO_OPTS: { value: Periodo; label: string }[] = [
  { value: "", label: "Sempre" },
  { value: "hoje", label: "Hoje" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

type Props = {
  filtros: FiltrosConversas;
  onChange: (f: Partial<FiltrosConversas>) => void;
};

function ChipGroup<T extends string>({
  opts,
  value,
  onSelect,
}: {
  opts: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ConversasFilters({ filtros, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-12 shrink-0">Status</span>
          <ChipGroup opts={STATUS_OPTS} value={filtros.status} onSelect={(v) => onChange({ status: v })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-12 shrink-0">Canal</span>
          <ChipGroup opts={CANAL_OPTS} value={filtros.canal} onSelect={(v) => onChange({ canal: v })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-12 shrink-0">Período</span>
          <ChipGroup opts={PERIODO_OPTS} value={filtros.periodo} onSelect={(v) => onChange({ periodo: v })} />
        </div>
        <div className="ml-auto">
          <input
            type="text"
            value={filtros.cpfHash}
            onChange={(e) => onChange({ cpfHash: e.target.value })}
            placeholder="Buscar por CPF hash..."
            className="h-7 px-3 rounded-lg border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 w-52"
          />
        </div>
      </div>
    </div>
  );
}

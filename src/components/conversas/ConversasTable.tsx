"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Monitor, MessageCircle, Bot, ExternalLink, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConversaSessao, ConversaStatus, ConversaCanal } from "@/lib/conversas";

const STATUS_STYLE: Record<ConversaStatus, { label: string; className: string }> = {
  ATIVA: { label: "Ativa", className: "bg-green-100 text-green-800 border-green-200" },
  IA_PAUSADA: { label: "IA Pausada", className: "bg-orange-100 text-orange-800 border-orange-200" },
  HUMANO: { label: "Humano", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CONVERTEU: { label: "Converteu", className: "bg-blue-100 text-blue-800 border-blue-200" },
  ABANDONADA: { label: "Abandonada", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

const CANAL_ICON: Record<ConversaCanal, React.ReactNode> = {
  SITE: <Monitor className="size-3.5" />,
  WHATSAPP: <MessageCircle className="size-3.5" />,
  SIMULADOR: <Bot className="size-3.5" />,
};

const CANAL_LABEL: Record<ConversaCanal, string> = {
  SITE: "Site",
  WHATSAPP: "WhatsApp",
  SIMULADOR: "Simulador",
};

const col = createColumnHelper<ConversaSessao>();

const columns = [
  col.accessor("status", {
    header: "Status",
    cell: (info) => {
      const s = STATUS_STYLE[info.getValue()];
      return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
    },
  }),
  col.accessor("nomeMascarado", {
    header: "Cliente",
    cell: (info) => (
      <span className="font-medium">
        {info.getValue() ?? <span className="text-muted-foreground italic">Anônimo</span>}
      </span>
    ),
  }),
  col.accessor("canal", {
    header: "Canal",
    cell: (info) => (
      <span className="flex items-center gap-1.5 text-sm">
        {CANAL_ICON[info.getValue()]}
        {CANAL_LABEL[info.getValue()]}
      </span>
    ),
  }),
  col.display({
    id: "localizacao",
    header: "Localização",
    cell: ({ row }) => {
      const { cidade, uf } = row.original;
      if (!cidade && !uf) return <span className="text-muted-foreground">—</span>;
      return <span className="text-sm">{[cidade, uf].filter(Boolean).join("/")}</span>;
    },
  }),
  col.display({
    id: "atribuicao",
    header: "Atribuição",
    cell: ({ row }) => {
      const { utmCampaign, gclid } = row.original;
      return (
        <span className="flex items-center gap-1 text-sm">
          {gclid && <Tv className="size-3.5 text-blue-600 shrink-0" aria-label="Google Ads" />}
          <span>{utmCampaign ?? "Direto"}</span>
        </span>
      );
    },
  }),
  col.display({
    id: "pedido",
    header: "Pedido",
    cell: ({ row }) => {
      const { pedidoId } = row.original;
      if (!pedidoId) return <span className="text-muted-foreground">—</span>;
      return (
        <Link
          href={`/pedidos/${pedidoId}`}
          className="flex items-center gap-1 text-primary text-sm hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-3" />
          Ver pedido
        </Link>
      );
    },
  }),
  col.accessor("lastActiveAt", {
    header: "Última atividade",
    cell: (info) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(info.getValue()), { addSuffix: true, locale: ptBR })}
      </span>
    ),
  }),
];

type Props = {
  data: ConversaSessao[] | undefined;
  isLoading: boolean;
  onRowClick: (id: string) => void;
};

export function ConversasTable({ data, isLoading, onRowClick }: Props) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <MessageCircle className="size-10 opacity-30" />
        <p className="text-sm">Nenhuma conversa encontrada.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => (
              <TableHead key={h.id}>
                {flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick(row.original.id)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

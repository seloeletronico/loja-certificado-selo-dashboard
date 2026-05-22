import { apiFetch } from "@/lib/api";

export type ConversaStatus =
  | "ATIVA"
  | "IA_PAUSADA"
  | "HUMANO"
  | "CONVERTEU"
  | "ABANDONADA";

export type ConversaCanal = "SITE" | "WHATSAPP" | "SIMULADOR";

export type ConversaSessao = {
  id: string;
  sessionIdDialogflow: string | null;
  contactId: string | null;
  status: ConversaStatus;
  canal: ConversaCanal;
  cpfHash: string | null;
  nomeMascarado: string | null;
  emailMascarado: string | null;
  telefoneMascarado: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  gclid: string | null;
  pedidoId: string | null;
  createdAt: string;
  lastActiveAt: string;
  turnos?: ConversaTurno[];
};

export type ConversaTurno = {
  id: string;
  indice: number;
  ator: "CLIENTE" | "IA" | "HUMANO";
  texto: string;
  toolCalls: unknown[] | null;
  meta: unknown | null;
  createdAt: string;
};

export type ListarConversasParams = {
  status?: ConversaStatus | "";
  canal?: ConversaCanal | "";
  periodo?: "hoje" | "24h" | "7d" | "30d" | "";
  cpfHash?: string;
  pagina?: number;
  porPagina?: number;
};

export type ListarConversasResposta = {
  conversas: ConversaSessao[];
  paginacao: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
};

// ──────────────────────────────────────────────
// Mock data (USE_MOCK=true por padrão até backend ter conteúdo)
// ──────────────────────────────────────────────

function iso(minutosAtras: number): string {
  return new Date(Date.now() - minutosAtras * 60_000).toISOString();
}

const MOCK_CONVERSAS: ConversaSessao[] = [
  {
    id: "conv_1a2b3c", sessionIdDialogflow: "sess_abc123", contactId: null,
    status: "ATIVA", canal: "SITE", cpfHash: "a3f5c8e2b1d4",
    nomeMascarado: "João S.", emailMascarado: "j***@gmail.com",
    telefoneMascarado: "(61) 9****-4321", cep: "70040-020",
    cidade: "Brasília", uf: "DF",
    utmSource: "google", utmMedium: "cpc", utmCampaign: "e-cpf-df",
    gclid: "Cj0KCQjw8433BhDqARIsAGBuYb1234",
    pedidoId: null, createdAt: iso(8), lastActiveAt: iso(2),
  },
  {
    id: "conv_2c3d4e", sessionIdDialogflow: "sess_def456", contactId: "wa_5521987654321",
    status: "HUMANO", canal: "WHATSAPP", cpfHash: "b7d9e1f3a5c2",
    nomeMascarado: "Maria O.", emailMascarado: "m***@hotmail.com",
    telefoneMascarado: "(11) 9****-7890", cep: "01310-100",
    cidade: "São Paulo", uf: "SP",
    utmSource: "whatsapp", utmMedium: "social", utmCampaign: "e-cnpj-sp",
    gclid: null, pedidoId: "ped_xyz789", createdAt: iso(45), lastActiveAt: iso(5),
  },
  {
    id: "conv_3e4f5g", sessionIdDialogflow: "sess_ghi789", contactId: null,
    status: "CONVERTEU", canal: "SITE", cpfHash: "c2e4f6a8b0d1",
    nomeMascarado: "Carlos M.", emailMascarado: "c***@empresa.com.br",
    telefoneMascarado: "(21) 9****-1234", cep: "20040-020",
    cidade: "Rio de Janeiro", uf: "RJ",
    utmSource: "google", utmMedium: "organic", utmCampaign: null,
    gclid: null, pedidoId: "ped_abc123", createdAt: iso(180), lastActiveAt: iso(120),
  },
  {
    id: "conv_4f5g6h", sessionIdDialogflow: null, contactId: null,
    status: "ABANDONADA", canal: "SIMULADOR", cpfHash: null,
    nomeMascarado: null, emailMascarado: null, telefoneMascarado: null,
    cep: null, cidade: null, uf: null,
    utmSource: "facebook", utmMedium: "social", utmCampaign: "remarketing",
    gclid: null, pedidoId: null, createdAt: iso(720), lastActiveAt: iso(700),
  },
  {
    id: "conv_5g6h7i", sessionIdDialogflow: "sess_jkl012", contactId: null,
    status: "ATIVA", canal: "WHATSAPP", cpfHash: "d8f0a2b4c6e5",
    nomeMascarado: "Ana P.", emailMascarado: "a***@gmail.com",
    telefoneMascarado: "(31) 9****-5678", cep: "30140-110",
    cidade: "Belo Horizonte", uf: "MG",
    utmSource: null, utmMedium: null, utmCampaign: null,
    gclid: null, pedidoId: null, createdAt: iso(15), lastActiveAt: iso(1),
  },
  {
    id: "conv_6h7i8j", sessionIdDialogflow: "sess_mno345", contactId: null,
    status: "CONVERTEU", canal: "SITE", cpfHash: "e1c3d5f7a9b0",
    nomeMascarado: "Roberto F.", emailMascarado: "r***@outlook.com",
    telefoneMascarado: "(41) 9****-9012", cep: "80010-010",
    cidade: "Curitiba", uf: "PR",
    utmSource: "google", utmMedium: "cpc", utmCampaign: "e-cpf-pr",
    gclid: "Cj0KCQjw8433BhDqARIsAGBuYb5678",
    pedidoId: "ped_def456", createdAt: iso(240), lastActiveAt: iso(200),
  },
  {
    id: "conv_7i8j9k", sessionIdDialogflow: "sess_pqr678", contactId: null,
    status: "IA_PAUSADA", canal: "SITE", cpfHash: "f5a7b9c1d3e4",
    nomeMascarado: "Fernanda L.", emailMascarado: "f***@yahoo.com",
    telefoneMascarado: "(51) 9****-3456", cep: "90010-170",
    cidade: "Porto Alegre", uf: "RS",
    utmSource: "email", utmMedium: "newsletter", utmCampaign: "base-existente",
    gclid: null, pedidoId: null, createdAt: iso(30), lastActiveAt: iso(25),
  },
  {
    id: "conv_8j9k0l", sessionIdDialogflow: "sess_stu901", contactId: "wa_5511999887766",
    status: "HUMANO", canal: "WHATSAPP", cpfHash: "a9c1e3f5b7d2",
    nomeMascarado: "Paulo R.", emailMascarado: "p***@gmail.com",
    telefoneMascarado: "(11) 9****-7766", cep: "04538-133",
    cidade: "São Paulo", uf: "SP",
    utmSource: "whatsapp", utmMedium: "organic", utmCampaign: null,
    gclid: null, pedidoId: null, createdAt: iso(60), lastActiveAt: iso(3),
  },
];

const MOCK_TURNOS: Record<string, ConversaTurno[]> = {
  conv_1a2b3c: [
    { id: "t1", indice: 0, ator: "IA", texto: "Olá! Sou a assistente do Selo Eletrônico. Posso te ajudar com e-CPF ou e-CNPJ. Qual você precisa?", toolCalls: null, meta: null, createdAt: iso(8) },
    { id: "t2", indice: 1, ator: "CLIENTE", texto: "Quero um e-CPF A1", toolCalls: null, meta: null, createdAt: iso(7) },
    { id: "t3", indice: 2, ator: "IA", texto: "Perfeito! O e-CPF A1 tem validade de 1 ano e custa R$ 99. Para agendar a videoconferência, preciso de seus dados.", toolCalls: null, meta: null, createdAt: iso(7) },
    { id: "t4", indice: 3, ator: "CLIENTE", texto: "Pode ser amanhã pela manhã?", toolCalls: null, meta: null, createdAt: iso(6) },
    { id: "t5", indice: 4, ator: "IA", texto: "Verificando disponibilidade...", toolCalls: [{ name: "listar_horarios_videoconferencia", args: { desde: "amanha", periodo: "manha" } }], meta: null, createdAt: iso(6) },
    { id: "t6", indice: 5, ator: "IA", texto: "Tenho amanhã às 09:30, pode ser?", toolCalls: null, meta: null, createdAt: iso(5) },
    { id: "t7", indice: 6, ator: "CLIENTE", texto: "Sim!", toolCalls: null, meta: null, createdAt: iso(2) },
  ],
  conv_2c3d4e: [
    { id: "t8", indice: 0, ator: "IA", texto: "Olá! Como posso te ajudar com seu certificado digital?", toolCalls: null, meta: null, createdAt: iso(45) },
    { id: "t9", indice: 1, ator: "CLIENTE", texto: "Preciso de e-CNPJ mas tenho dúvida sobre a documentação", toolCalls: null, meta: null, createdAt: iso(44) },
    { id: "t10", indice: 2, ator: "IA", texto: "Para e-CNPJ A1 você precisa: CPF do responsável + CNPJ válido. Agendamento é por videoconferência.", toolCalls: null, meta: null, createdAt: iso(44) },
    { id: "t11", indice: 3, ator: "CLIENTE", texto: "E se o responsável não tiver CNH?", toolCalls: null, meta: null, createdAt: iso(40) },
    { id: "t12", indice: 4, ator: "HUMANO", texto: "Oi! Aqui é o time de atendimento. Sem CNH você precisa já ter tido certificado digital antes (renovação). Já teve um certificado emitido?", toolCalls: null, meta: null, createdAt: iso(5) },
  ],
};

// ──────────────────────────────────────────────
// Funções públicas
// ──────────────────────────────────────────────

// Polaridade segura: mock só liga se EXPLICITAMENTE setado como "true".
// Default = false (produção). Dev liga via `.env.local` com NEXT_PUBLIC_USE_MOCK=true.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function listarConversas(
  params: ListarConversasParams,
  token: string
): Promise<ListarConversasResposta> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    let lista = [...MOCK_CONVERSAS];
    if (params.status) lista = lista.filter((c) => c.status === params.status);
    if (params.canal) lista = lista.filter((c) => c.canal === params.canal);
    if (params.cpfHash) lista = lista.filter((c) => c.cpfHash?.toLowerCase().includes(params.cpfHash!.toLowerCase()));
    if (params.periodo) {
      const agora = Date.now();
      const limites: Record<string, number> = {
        hoje: new Date().setHours(0, 0, 0, 0),
        "24h": agora - 24 * 60 * 60_000,
        "7d": agora - 7 * 24 * 60 * 60_000,
        "30d": agora - 30 * 24 * 60 * 60_000,
      };
      const lim = limites[params.periodo];
      if (lim) lista = lista.filter((c) => new Date(c.lastActiveAt).getTime() >= lim);
    }
    const pagina = params.pagina ?? 1;
    const porPagina = params.porPagina ?? 25;
    const total = lista.length;
    const inicio = (pagina - 1) * porPagina;
    return {
      conversas: lista.slice(inicio, inicio + porPagina),
      paginacao: { pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) },
    };
  }

  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.canal) qs.set("canal", params.canal);
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.cpfHash) qs.set("cpfHash", params.cpfHash);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  if (params.porPagina) qs.set("porPagina", String(params.porPagina));
  return apiFetch<ListarConversasResposta>(`/api/admin/conversas?${qs}`, token);
}

export async function buscarConversa(id: string, token: string): Promise<ConversaSessao> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    const conversa = MOCK_CONVERSAS.find((c) => c.id === id);
    if (!conversa) throw new Error("Conversa não encontrada");
    return { ...conversa, turnos: MOCK_TURNOS[id] ?? [] };
  }
  return apiFetch<ConversaSessao>(`/api/admin/conversas/${id}`, token);
}

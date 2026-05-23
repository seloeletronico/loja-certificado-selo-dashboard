"use client";

import { useState, useTransition } from "react";
import { Sparkles, Send, Check, Edit3, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { gerarSugestao, enviarFeedback } from "./actions";

// VALUES espelham enum Category do agente-api (prisma/schema.prisma).
// Labels são livres pra UX amigável.
const CATEGORIAS = [
  { value: "emissao", label: "Emissão" },
  { value: "renovacao", label: "Renovação" },
  { value: "revogacao", label: "Revogação" },
  { value: "agendamento", label: "Agendamento" },
  { value: "comercial", label: "Comercial" },
  { value: "suporte_instalacao", label: "Técnico — Instalação" },
  { value: "problema_tecnico", label: "Técnico — Uso" },
  { value: "duvida_normativa", label: "Dúvida normativa" },
  { value: "outro", label: "Outro" },
];

type Sugestao = {
  chatId: string;
  suggestion: string;
  confidence: number;
  sources: string[];
  latencyMs: number;
};

export default function CopilotIAPage() {
  const [mensagem, setMensagem] = useState("");
  const [categoria, setCategoria] = useState("duvida_geral");
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState("");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [feedbackEnviado, setFeedbackEnviado] = useState<"ACCEPTED_AS_IS" | "EDITED" | "REJECTED" | null>(null);
  const [pending, startTransition] = useTransition();
  const [enviandoFeedback, startFeedback] = useTransition();

  const handleGerar = () => {
    if (!mensagem.trim()) return;
    setSugestao(null);
    setFeedbackEnviado(null);
    setEditando(false);
    startTransition(async () => {
      const res = await gerarSugestao({ customerMessage: mensagem, category: categoria });
      if (res.ok) {
        setSugestao(res.data);
      } else {
        toast.error(`Erro ${res.status}: ${res.error}`);
      }
    });
  };

  const handleFeedback = (action: "ACCEPTED_AS_IS" | "EDITED" | "REJECTED") => {
    if (!sugestao) return;
    startFeedback(async () => {
      const res = await enviarFeedback({
        chatId: sugestao.chatId,
        category: categoria,
        suggestion: sugestao.suggestion,
        action,
        editedVersion: action === "EDITED" ? textoEditado : undefined,
        rejectReason: action === "REJECTED" ? motivoRejeicao || undefined : undefined,
      });
      if (res.ok) {
        toast.success("Feedback registrado.");
        setFeedbackEnviado(action);
      } else {
        toast.error(`Erro ao enviar feedback: ${res.error}`);
      }
    });
  };

  const confidenceColor =
    !sugestao ? "" :
    sugestao.confidence > 0.7 ? "bg-green-100 text-green-800 border-green-200" :
    sugestao.confidence > 0.4 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
    "bg-red-100 text-red-800 border-red-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Copilot IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Playground manual: digite uma mensagem de cliente, veja a sugestão do RAG (Vertex AI Search + Gemini) e avalie a qualidade.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Mensagem do cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex: Como faço para renovar meu certificado A1 que vence semana que vem?"
            rows={4}
            className="w-full min-h-[100px] px-3 py-2 border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <div className="flex items-center gap-3">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-background"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <Button onClick={handleGerar} disabled={pending || !mensagem.trim()} size="sm">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Gerar sugestão
            </Button>
          </div>
        </CardContent>
      </Card>

      {sugestao && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="size-4 text-blue-600" /> Sugestão do RAG
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[11px] ${confidenceColor}`}>
                  Confiança: {(sugestao.confidence * 100).toFixed(0)}%
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {sugestao.latencyMs}ms
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {sugestao.suggestion}
            </div>

            {sugestao.sources.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Fontes:</span> {sugestao.sources.join(", ")}
              </div>
            )}

            {feedbackEnviado ? (
              <div className="text-sm text-green-700 font-medium">
                ✅ Feedback registrado como: {feedbackEnviado === "ACCEPTED_AS_IS" ? "Aceito" : feedbackEnviado === "EDITED" ? "Editado" : "Rejeitado"}
              </div>
            ) : (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Como você avalia essa sugestão?</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleFeedback("ACCEPTED_AS_IS")} disabled={enviandoFeedback}>
                      <Check className="size-4 text-green-600" /> Aceitar como está
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditando(true); setTextoEditado(sugestao.suggestion); }} disabled={enviandoFeedback}>
                      <Edit3 className="size-4 text-yellow-600" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleFeedback("REJECTED")} disabled={enviandoFeedback}>
                      <X className="size-4 text-red-600" /> Rejeitar
                    </Button>
                  </div>

                  {editando && (
                    <div className="space-y-2 mt-3">
                      <textarea
                        value={textoEditado}
                        onChange={(e) => setTextoEditado(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring/50"
                      />
                      <Button size="sm" onClick={() => handleFeedback("EDITED")} disabled={enviandoFeedback || !textoEditado.trim()}>
                        {enviandoFeedback ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Enviar versão editada
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

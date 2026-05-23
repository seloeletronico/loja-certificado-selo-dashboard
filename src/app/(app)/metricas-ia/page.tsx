import { Suspense } from "react";
import { Activity, MessageSquare, Timer, CheckCircle2, TrendingUp, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMetrics, AgenteApiError } from "@/lib/agente-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Server Component — fetcha métricas server-side, X-Agent-Token nunca vai pro browser.
// Revalida em cada request (cache:no-store no fetch dentro do lib).

export const dynamic = "force-dynamic";

async function MetricsBoard() {
  let metrics;
  try {
    metrics = await getMetrics();
  } catch (e) {
    const err = e instanceof AgenteApiError ? e : new Error(String(e));
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Falha ao buscar métricas do agente-api: <span className="font-mono">{err.message}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Endpoint: <code>/api/metrics</code> · backend rev 00012-mmv (Cloud Run southamerica-east1).
          </p>
        </CardContent>
      </Card>
    );
  }

  const aarPct = (metrics.aar * 100).toFixed(1);
  const aarColor = metrics.aar > 0.7 ? "text-green-700" : metrics.aar > 0.4 ? "text-yellow-700" : "text-red-700";
  const fc = metrics.feedbackCounts || { ACCEPTED_AS_IS: 0, EDITED: 0, REJECTED: 0 };
  const totalFb = fc.ACCEPTED_AS_IS + fc.EDITED + fc.REJECTED;

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de queries" value={metrics.totalQueries.toLocaleString("pt-BR")} icon={<MessageSquare className="size-4" />} />
        <KpiCard label="Queries hoje" value={metrics.queriesToday.toLocaleString("pt-BR")} icon={<Activity className="size-4 text-blue-600" />} />
        <KpiCard label="Latência média" value={`${Math.round(metrics.avgLatencyMs)}ms`} icon={<Timer className="size-4 text-purple-600" />} />
        <KpiCard label="AAR global" value={`${aarPct}%`} valueClassName={aarColor} icon={<CheckCircle2 className="size-4" />} />
      </div>

      {/* Distribuição de feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="size-4" /> Distribuição de feedback ({totalFb} no total)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FeedbackBar label="Aceito sem edição" count={fc.ACCEPTED_AS_IS} total={totalFb} color="bg-green-500" />
          <FeedbackBar label="Editado" count={fc.EDITED} total={totalFb} color="bg-yellow-500" />
          <FeedbackBar label="Rejeitado" count={fc.REJECTED} total={totalFb} color="bg-red-500" />
        </CardContent>
      </Card>

      {/* AAR por categoria */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="size-4" /> AAR por categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.categoryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de categoria ainda.</p>
          ) : (
            <div className="space-y-2">
              {metrics.categoryStats.map((c) => (
                <div key={c.category} className="grid grid-cols-[140px_1fr_60px_40px] items-center gap-2 text-sm">
                  <span className="capitalize">{c.category.replace(/_/g, " ")}</span>
                  <div className="h-2 bg-neutral-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${c.aar * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground text-right">{(c.aar * 100).toFixed(0)}%</span>
                  <Badge variant="outline" className="text-[10px] justify-self-end">{c.total}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atividade recente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Últimos feedbacks ({metrics.recentFeedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feedback registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {metrics.recentFeedback.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <ActionBadge action={f.action} />
                    <span className="capitalize text-muted-foreground">{f.category.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">· {f.agentName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, valueClassName }: { label: string; value: string; icon: React.ReactNode; valueClassName?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className={`text-2xl font-semibold tracking-tight ${valueClassName ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FeedbackBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="grid grid-cols-[160px_1fr_70px] items-center gap-2 text-sm">
      <span>{label}</span>
      <div className="h-2.5 bg-neutral-100 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground text-right">{count} ({pct.toFixed(0)}%)</span>
    </div>
  );
}

function ActionBadge({ action }: { action: "ACCEPTED_AS_IS" | "EDITED" | "REJECTED" }) {
  const cfg = {
    ACCEPTED_AS_IS: { label: "Aceito", className: "bg-green-100 text-green-800 border-green-200" },
    EDITED: { label: "Editado", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    REJECTED: { label: "Rejeitado", className: "bg-red-100 text-red-800 border-red-200" },
  }[action];
  return <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function MetricasIAPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Métricas IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AAR, latência e feedback dos atendentes sobre as sugestões do agente. Dados em tempo real do <code className="text-xs">agente-api</code>.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MetricsBoard />
      </Suspense>
    </div>
  );
}

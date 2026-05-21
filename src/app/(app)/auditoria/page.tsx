import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Lista append-only de ações administrativas.
        </CardContent>
      </Card>
    </div>
  );
}

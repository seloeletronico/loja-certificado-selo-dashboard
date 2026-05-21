"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Headphones,
  ShieldCheck,
  Settings,
  TrendingUp,
  Calendar,
  MessagesSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";

type Me = { permissoes: string[]; papeis: string[] };

// Cada item lista as permissões necessárias. Se vazio = todos veem.
const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permissoes: ["metricas.ver_operacional"] },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, permissoes: ["pedido.listar"] },
  { title: "Conversas", url: "/conversas", icon: MessagesSquare, permissoes: ["pedido.listar"] },
  { title: "Atribuição", url: "/atribuicao", icon: TrendingUp, permissoes: ["metricas.ver_operacional"] },
  { title: "Usuários", url: "/usuarios", icon: Users, permissoes: ["usuario.listar"] },
  { title: "Atendimentos", url: "/atendimentos", icon: Headphones, permissoes: ["pedido.listar_proprio"] },
  { title: "Agenda", url: "/agenda", icon: Calendar, permissoes: ["atendente.editar_agenda"] },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck, permissoes: ["auditoria.ver"] },
  { title: "Configurações", url: "/config", icon: Settings, permissoes: ["usuario.listar"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { token, ready } = useAuthToken();

  const meQ = useQuery({
    queryKey: ["me"],
    enabled: !!token,
    queryFn: () => apiFetch<Me>("/api/admin/me", token!),
  });

  const permissoes = new Set(meQ.data?.permissoes ?? []);
  const itemsVisiveis = items.filter(
    (i) => i.permissoes.length === 0 || i.permissoes.some((p) => permissoes.has(p))
  );

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Selo Eletrônico</span>
            <span className="text-xs text-muted-foreground">
              {meQ.data?.papeis.join(", ") || "..."}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(ready && meQ.data ? itemsVisiveis : []).map((item) => {
                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

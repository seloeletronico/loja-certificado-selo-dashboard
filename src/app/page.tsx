import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

async function buscarMe(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { erro: `${res.status} ${res.statusText}` };
    return await res.json();
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "falha desconhecida" };
  }
}

export default async function Home() {
  const { getToken } = await auth();
  const user = await currentUser();
  const token = await getToken();
  const me = token ? await buscarMe(token) : { erro: "sem token" };

  return (
    <main className="flex-1 p-8 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Olá, {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <UserButton />
      </header>

      <section>
        <h2 className="text-lg font-medium mb-2">Resposta de /api/admin/me</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(me, null, 2)}
        </pre>
      </section>
    </main>
  );
}

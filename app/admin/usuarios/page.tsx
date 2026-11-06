import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/auth";
import { Topbar } from "@/components/ui";
import AdminUsers from "@/components/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  if (!(await getAdminSession())) redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <Topbar title="Administración" subtitle="Crea cuentas de coordinadores y habilita o deshabilita correos." />
      <div className="content" style={{ maxWidth: 860 }}>
        <AdminUsers
          users={users.map((u) => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            createdAt: u.createdAt.toISOString().slice(0, 10),
            isAdmin: isAdminEmail(u.email),
            habilitado: u.habilitado,
          }))}
        />
      </div>
    </>
  );
}

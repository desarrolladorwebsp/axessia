import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "./components/Sidebar";
import "./layout.css";

export const metadata: Metadata = {
  title: "Sistema AXESSIA",
  description: "Sistema de gestión privado de AXESSIA",
};

type LayoutProps = {
  children: React.ReactNode;
};

const INTERNAL_ROLE_LABELS: Record<string, string> = {
  EJECUTIVO: "Ejecutivo",
  ADMINISTRADOR: "Administrador",
};

function initialsFrom(firstName: string, lastName: string) {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  return initials || "AX";
}

export default async function AppLayout({ children }: LayoutProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value;
  const session = verifyInternalSessionToken(sessionToken);

  if (!session) {
    redirect("/ingresar");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (!user) {
    redirect("/ingresar");
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="app-system flex min-h-screen bg-[var(--background)]">
      <Sidebar
        user={{
          name: fullName || "Equipo AXESSIA",
          initials: initialsFrom(user.firstName, user.lastName),
          roleLabel: INTERNAL_ROLE_LABELS[user.role] ?? "Equipo AXESSIA",
        }}
      />
      <main className="app-main-content min-w-0 flex-1 flex flex-col md:ml-64">
        <div className="app-content flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

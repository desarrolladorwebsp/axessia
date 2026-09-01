import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizeRut } from "@/lib/customer-validation";
import InvitationRegistrationForm from "@/components/InvitationRegistrationForm";

function InvalidInvitationView({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_16px_40px_rgba(7,30,65,0.08)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl">⚠️</div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--purple)]">Invitación no válida</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--navy)]">La invitación no es válida</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
        <a href="/ingresar" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--navy-dark)]">Volver al inicio</a>
      </section>
    </main>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.internalUserInvitation.findUnique({
    where: { token },
    select: { id: true, email: true, rut: true, role: true, status: true, expiresAt: true },
  });

  if (!invitation) {
    return <InvalidInvitationView message="La invitación no existe, fue eliminada o no es válida." />;
  }

  if (invitation.status !== "PENDING") {
    return <InvalidInvitationView message="Esta invitación ya fue utilizada o ya no está activa." />;
  }

  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    await prisma.internalUserInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return <InvalidInvitationView message="La invitación ha vencido y ya no puede usarse." />;
  }

  return <InvitationRegistrationForm token={token} invitation={{ email: normalizeEmail(invitation.email), rut: normalizeRut(invitation.rut), role: invitation.role }} />;
}

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MyAccountPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  const session = verifyCustomerSessionToken(sessionToken);

  if (!session) {
    redirect("/ingresar");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      rut: true,
      hasPendingRequest: true,
      createdAt: true,
      _count: {
        select: { requests: true },
      },
    },
  });

  if (!customer) {
    redirect("/ingresar");
  }

  return (
    <main className="login-page">
      <section className="login-surface account-surface" aria-labelledby="account-title">
        <div className="login-header">
          <p className="eyebrow">Mi cuenta</p>
          <h1 id="account-title">¡Hola, {customer.name}!</h1>
          <p>Gestiona tus solicitudes, cotizaciones, documentos y seguimiento en un solo lugar.</p>
        </div>

        <div className="account-grid">
          <article className="account-card">
            <span className="account-label">Correo</span>
            <strong>{customer.email}</strong>
          </article>
          <article className="account-card">
            <span className="account-label">Teléfono</span>
            <strong>{customer.phone || "No registrado"}</strong>
          </article>
          <article className="account-card">
            <span className="account-label">Ciudad</span>
            <strong>{customer.city || "No registrada"}</strong>
          </article>
          <article className="account-card">
            <span className="account-label">RUT</span>
            <strong>{customer.rut}</strong>
          </article>
          <article className="account-card">
            <span className="account-label">Solicitudes</span>
            <strong>{customer._count.requests}</strong>
          </article>
          <article className="account-card">
            <span className="account-label">Estado</span>
            <strong>{customer.hasPendingRequest ? "Con solicitud activa" : "Sin solicitudes pendientes"}</strong>
          </article>
        </div>

        <div className="account-actions">
          <Link href="/seguimiento" className="login-submit account-primary-btn">Consultar seguimiento <span aria-hidden="true">→</span></Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="account-secondary-btn">Cerrar sesión</button>
          </form>
        </div>
      </section>
    </main>
  );
}

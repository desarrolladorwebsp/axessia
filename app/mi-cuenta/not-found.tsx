import Link from "next/link";
import { PORTAL_HOME_PATH } from "@/lib/portal/paths";

export default function PortalNotFound() {
  return (
    <section className="card-surface rounded-2xl p-8 text-center">
      <h1 className="font-display text-xl font-extrabold text-[var(--navy)]">No encontramos esa información</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Puede no existir o no pertenecer a tu cuenta.</p>
      <Link href={PORTAL_HOME_PATH} className="mt-5 inline-flex font-bold text-[var(--blue)]">
        Volver a tus solicitudes
      </Link>
    </section>
  );
}

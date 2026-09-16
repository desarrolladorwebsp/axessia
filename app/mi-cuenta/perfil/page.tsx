import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePortalCustomer } from "@/lib/customer-access";
import { PORTAL_HOME_PATH } from "@/lib/portal/paths";
import ProfileForm from "@/components/portal/ProfileForm";

export default async function PortalProfilePage() {
  const customer = await requirePortalCustomer();

  return (
    <section>
      <Link
        href={PORTAL_HOME_PATH}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a solicitudes
      </Link>
      <h1 className="font-display mt-4 text-2xl font-extrabold text-[var(--navy)]">Mi perfil</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
        Puedes actualizar nombre, teléfono, ciudad y preferencias de contacto. El correo y el RUT permanecen protegidos.
      </p>
      <div className="mt-6">
        <ProfileForm
          name={customer.name}
          email={customer.email}
          rut={customer.rut}
          phone={customer.phone}
          city={customer.city}
          promotionsConsent={customer.promotionsConsent}
        />
      </div>
    </section>
  );
}

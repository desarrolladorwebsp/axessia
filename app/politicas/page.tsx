import Link from "next/link";

export default function PoliciesPage() {
  return (
    <main className="policy-page">
      <section className="policy-surface" aria-labelledby="policies-title">
        <p className="eyebrow">AXESSIA</p>
        <h1 id="policies-title">Políticas de la empresa</h1>
        <p>
          En esta vista encontrarás la información general sobre el uso de este sitio y el tratamiento de los datos que compartas al solicitar una cotización.
        </p>
        <p>
          La información será utilizada para gestionar tu solicitud y mantener una comunicación relacionada con ella, de acuerdo con la normativa chilena vigente.
        </p>
        <Link href="/" className="policy-back">Volver al inicio</Link>
      </section>
    </main>
  );
}
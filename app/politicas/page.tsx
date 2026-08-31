import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  FileText,
  Handshake,
  LockKeyhole,
  Scale,
  UserRoundCheck,
} from "lucide-react";

const policySections = [
  {
    id: "terminos",
    number: "01",
    icon: FileText,
    title: "Términos de uso",
    description: "Reglas para navegar y utilizar los canales digitales de AXESSIA.",
  },
  {
    id: "comerciales",
    number: "02",
    icon: Handshake,
    title: "Políticas comerciales",
    description: "Condiciones aplicables a solicitudes, cotizaciones y gestión del servicio.",
  },
  {
    id: "privacidad",
    number: "03",
    icon: LockKeyhole,
    title: "Privacidad y datos",
    description: "Cómo se tratan los datos personales entregados a AXESSIA.",
  },
  {
    id: "derechos",
    number: "04",
    icon: UserRoundCheck,
    title: "Tus derechos",
    description: "Acceso, modificación, eliminación o bloqueo de datos personales.",
  },
];

export default function PoliciesPage() {
  return (
    <main className="policy-page">
      <section className="policy-hero" aria-labelledby="policies-title">
        <div className="policy-hero-inner">
          <p className="eyebrow">AXESSIA / INFORMACIÓN LEGAL</p>
          <h1 id="policies-title">
            Términos, condiciones y <span className="gradient-text">políticas</span>
          </h1>
          <p>
            Reunimos la información que orienta el uso de nuestros canales, la gestión de solicitudes y el cuidado de los datos personales que nos confías.
          </p>
          <p className="policy-updated">
            <BadgeCheck size={17} aria-hidden="true" /> Vigencia: 31 de agosto de 2026
          </p>
        </div>
      </section>

      <div className="policy-layout">
        <aside className="policy-index" aria-label="Índice de políticas">
          <p>En esta página</p>
          <nav>
            {policySections.map(({ id, number, title }) => (
              <a href={`#${id}`} key={id}>
                <span>{number}</span>
                {title}
              </a>
            ))}
          </nav>
          <Link href="/" className="policy-back">
            Volver al inicio <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </aside>

        <div className="policy-content">
          <section className="policy-introduction" aria-label="Introducción">
            <Scale size={22} aria-hidden="true" />
            <p>
              Estas políticas deben leerse junto con las condiciones particulares informadas en cada cotización, solicitud o comunicación de AXESSIA. Cuando exista una condición particular aceptada por la persona usuaria, esta prevalecerá para esa gestión específica.
            </p>
          </section>

          <section id="terminos" className="policy-section" aria-labelledby="terminos-title">
            <PolicyHeading section={policySections[0]} />
            <div className="policy-copy">
              <p>Los contenidos de este sitio tienen un propósito informativo y de orientación sobre los servicios de AXESSIA. El uso del sitio debe realizarse de manera lícita, respetuosa y conforme a la normativa aplicable.</p>
              <p>La información disponible no reemplaza la evaluación, diagnóstico, indicación ni tratamiento de profesionales de la salud. Las decisiones clínicas y el uso de medicamentos deben realizarse con la orientación del profesional tratante.</p>
              <p>Las marcas, textos, imágenes y demás contenidos del sitio están protegidos por la normativa aplicable. No pueden reproducirse, modificarse o utilizarse con fines distintos de los permitidos sin autorización correspondiente.</p>
            </div>
          </section>

          <section id="comerciales" className="policy-section" aria-labelledby="comerciales-title">
            <PolicyHeading section={policySections[1]} />
            <div className="policy-copy">
              <p>Una solicitud o cotización no constituye por sí sola una compraventa ni asegura disponibilidad, precio, plazo de entrega, autorización sanitaria o resultado terapéutico. Las condiciones aplicables se informarán en la cotización correspondiente.</p>
              <p>Cuando el servicio requiera antecedentes clínicos, receta médica, documentación de respaldo o autorizaciones, la persona solicitante deberá proporcionar información completa, exacta y vigente. AXESSIA podrá requerir antecedentes adicionales cuando sean necesarios para evaluar o gestionar una solicitud.</p>
              <p>La importación de productos para uso personal está sujeta a la regulación vigente, a los requisitos de la autoridad competente y a las condiciones del proveedor, transportista y demás intervinientes. AXESSIA no sustituye las atribuciones de las autoridades sanitarias, aduaneras ni de terceros que participan en el proceso.</p>
            </div>
          </section>

          <section id="privacidad" className="policy-section" aria-labelledby="privacidad-title">
            <PolicyHeading section={policySections[2]} />
            <div className="policy-copy">
              <p>AXESSIA trata los datos personales que la persona entrega mediante formularios, solicitudes y comunicaciones para responder consultas, gestionar cotizaciones, dar seguimiento a solicitudes y mantener las comunicaciones asociadas a esas gestiones.</p>
              <p>Los datos de salud son datos sensibles. Su tratamiento requiere las condiciones previstas por la ley, incluyendo el consentimiento expreso de la persona titular cuando corresponda, y se limita a lo necesario para la gestión solicitada y las obligaciones aplicables.</p>
              <p>Los datos no se utilizarán para fines incompatibles con aquellos informados al momento de su recolección. Su comunicación a terceros solo procederá cuando sea necesaria para la gestión solicitada, exista autorización de la persona titular o una habilitación legal.</p>
              <p>AXESSIA debe resguardar los datos mediante medidas de seguridad acordes a la naturaleza de la información y mantener reserva sobre los datos personales a los que acceda, salvo las excepciones establecidas por ley.</p>
            </div>
            <div className="policy-legal-note">
              <LockKeyhole size={19} aria-hidden="true" />
              <p>Esta política se rige actualmente por la Ley N.º 19.628 sobre protección de la vida privada. La Ley N.º 21.719, que moderniza el marco de protección de datos personales, entra en vigencia el 1 de diciembre de 2026.</p>
            </div>
          </section>

          <section id="derechos" className="policy-section" aria-labelledby="derechos-title">
            <PolicyHeading section={policySections[3]} />
            <div className="policy-copy">
              <p>La persona titular puede solicitar información sobre los datos personales que le conciernen, su procedencia y destinatario; además, puede pedir su modificación cuando sean erróneos, su eliminación cuando carezcan de fundamento legal o estén caducos, y el bloqueo temporal cuando corresponda.</p>
              <p>Para ejercer estos derechos, utiliza los canales de contacto oficiales publicados por AXESSIA e indica la solicitud con antecedentes suficientes para verificar la identidad de la persona titular o de su representante.</p>
              <p>Las solicitudes se atenderán conforme a los plazos y procedimientos establecidos en la Ley N.º 19.628. Si corresponde, la persona titular puede ejercer las acciones previstas en la normativa ante los tribunales competentes.</p>
            </div>
            <a className="policy-law-link" href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noreferrer">
              Consultar Ley N.º 19.628 en LeyChile <ChevronRight size={16} aria-hidden="true" />
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}

function PolicyHeading({ section }: { section: (typeof policySections)[number] }) {
  const Icon = section.icon;

  return (
    <div className="policy-heading">
      <span className="policy-number">{section.number}</span>
      <span className="policy-heading-icon"><Icon size={22} aria-hidden="true" /></span>
      <div>
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <p>{section.description}</p>
      </div>
    </div>
  );
}
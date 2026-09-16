function escapeHtml(text: string) {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function formatQuoteValidityLabel(validUntil: Date | null) {
  if (!validUntil) return "Sin fecha límite informada";
  return validUntil.toLocaleString("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

function renderCustomerEmail(input: {
  eyebrow: string;
  greeting: string;
  introHtml: string;
  infoRows?: Array<{ label: string; value: string; hint?: string }>;
  extraHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  closingHtml?: string;
}) {
  const rows = (input.infoRows ?? [])
    .map(
      (row) => `
          <div class="info-box" style="background-color:#F7F9FC;border-left:4px solid #087FD5;padding:20px;margin:16px 0;border-radius:8px;">
            <div class="info-label" style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4F5F73;margin-bottom:5px;">${escapeHtml(row.label)}</div>
            <div class="info-value" style="font-size:16px;font-weight:600;color:#071E41;">${escapeHtml(row.value)}</div>
            ${row.hint ? `<p style="font-size:12px;color:#4F5F73;margin:10px 0 0;">${escapeHtml(row.hint)}</p>` : ""}
          </div>`,
    )
    .join("");

  const cta =
    input.ctaLabel && input.ctaUrl
      ? `
          <div style="text-align:center;">
            <a href="${escapeHtml(input.ctaUrl)}" class="cta-button" style="display:inline-block;background:linear-gradient(90deg,#00A6D9 0%,#087FD5 100%);color:#FFFFFF;padding:12px 30px;border-radius:24px;text-decoration:none;font-weight:600;font-size:14px;margin:20px 0;">${escapeHtml(input.ctaLabel)}</a>
          </div>
          <p style="font-size:12px;color:#4F5F73;word-break:break-all;text-align:center;">Si el botón no funciona, copia y pega este enlace:<br /><a href="${escapeHtml(input.ctaUrl)}" style="color:#087FD5;text-decoration:none;">${escapeHtml(input.ctaUrl)}</a></p>`
      : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #071E41;
          background-color: #F7F9FC;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .header {
          background: linear-gradient(90deg, #00A6D9 0%, #087FD5 45%, #7A28D8 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          font-family: 'Montserrat', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 10px;
        }
        .content { padding: 40px 30px; }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .message {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 24px;
          color: #4F5F73;
        }
        .info-box {
          background-color: #F7F9FC;
          border-left: 4px solid #087FD5;
          padding: 20px;
          margin: 16px 0;
          border-radius: 8px;
        }
        .info-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #4F5F73;
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #071E41;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(90deg, #00A6D9 0%, #087FD5 100%);
          color: #FFFFFF;
          padding: 12px 30px;
          border-radius: 24px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          margin: 20px 0;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 30px;
          text-align: center;
          font-size: 12px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#F7F9FC;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#071E41;">
      <div class="container" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #DCE4ED;">
        <div class="header" style="background:linear-gradient(90deg,#00A6D9 0%,#087FD5 45%,#7A28D8 100%);padding:40px 20px;text-align:center;">
          <div class="logo" style="font-family:Montserrat,sans-serif;font-size:28px;font-weight:700;color:#FFFFFF;margin-bottom:10px;">AXESSIA</div>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">${escapeHtml(input.eyebrow)}</p>
        </div>
        <div class="content" style="padding:40px 30px;">
          <div class="greeting" style="font-size:18px;font-weight:600;margin-bottom:20px;color:#071E41;">Hola ${escapeHtml(input.greeting)},</div>
          <div class="message" style="font-size:14px;line-height:1.8;margin-bottom:24px;color:#4F5F73;">${input.introHtml}</div>
          ${rows}
          ${input.extraHtml ?? ""}
          ${cta}
          <div class="message" style="margin-top:24px;font-size:14px;line-height:1.8;color:#4F5F73;">
            ${input.closingHtml ?? "<p>Si ya respondiste esta propuesta, puedes ignorar este correo.</p>"}
          </div>
        </div>
        <div class="footer" style="background-color:#F7F9FC;padding:30px;text-align:center;font-size:12px;color:#4F5F73;border-top:1px solid #DCE4ED;">
          <p>© 2026 AXESSIA. Todos los derechos reservados.</p>
          <p style="font-size:11px;color:#8A96A8;margin-top:8px;">Este es un correo automatizado. No incluye información médica sensible.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function nextStepsBox(title: string, steps: string[]) {
  const items = steps
    .map(
      (step, index) =>
        `<p style="font-size:13px;color:#4F5F73;margin:0 0 8px;">${index + 1}. ${escapeHtml(step)}</p>`,
    )
    .join("");

  return `
          <div style="background-color:#F0F9FF;border-left:4px solid #087FD5;padding:20px;margin:16px 0;border-radius:8px;">
            <div style="font-size:14px;font-weight:600;color:#071E41;margin-bottom:10px;">${escapeHtml(title)}</div>
            ${items}
          </div>`;
}

export function renderQuoteRequestReceivedEmail(input: {
  customerName: string;
  requestNumber: string;
  trackingUrl: string;
  faqUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: `
      <p>Gracias por confiar en <strong>AXESSIA</strong>. Recibimos tu solicitud de cotización y nuestro equipo ya comenzó a revisarla.</p>
      <p><strong>¿Cuál es el siguiente paso?</strong> Nuestros especialistas revisarán tu solicitud y los productos requeridos. Te contactaremos en breve con una propuesta personalizada.</p>
    `,
    infoRows: [
      {
        label: "Número de solicitud",
        value: input.requestNumber,
        hint: "Guarda este número para hacer seguimiento de tu solicitud.",
      },
    ],
    ctaLabel: "Ver estado de mi solicitud",
    ctaUrl: input.trackingUrl,
    closingHtml: `<p>Si tienes dudas, visita nuestra sección de <a href="${escapeHtml(input.faqUrl)}" style="color:#087FD5;text-decoration:none;">Preguntas Frecuentes</a> o escríbenos a través de los canales habituales.</p>`,
  });
}

export function renderQuoteReadyEmail(input: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
  total: string | number | null;
  validUntil: string | null;
  trackingUrl: string;
  faqUrl: string;
}) {
  const totalLabel = input.total !== null ? `$${Number(input.total).toLocaleString("es-CL")}` : "Por confirmar";
  const validUntilLabel = input.validUntil
    ? new Date(input.validUntil).toLocaleDateString("es-CL", { dateStyle: "long" })
    : "Sin fecha límite";

  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: "<p>Tu cotización AXESSIA ya está lista para revisión.</p>",
    infoRows: [
      {
        label: "Número de cotización",
        value: input.quoteNumber,
        hint: `Solicitud asociada: ${input.requestNumber}`,
      },
      {
        label: "Total estimado",
        value: totalLabel,
        hint: `Vigente hasta: ${validUntilLabel}`,
      },
    ],
    ctaLabel: "Ver mi cotización",
    ctaUrl: input.trackingUrl,
    closingHtml: `<p>Si tienes dudas, visita nuestra sección de <a href="${escapeHtml(input.faqUrl)}" style="color:#087FD5;text-decoration:none;">Preguntas Frecuentes</a> o escríbenos a través de los canales habituales.</p>`,
  });
}

export function renderQuoteAcceptedEmail(input: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
  trackingUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: "<p>Registramos tu aceptación de la cotización. A continuación coordinaremos los siguientes pasos de tu proceso.</p>",
    infoRows: [
      { label: "Solicitud", value: input.requestNumber },
      { label: "Cotización", value: input.quoteNumber },
    ],
    extraHtml: nextStepsBox("¿Qué sucede ahora?", [
      "Procesaremos tu cotización aceptada",
      "Coordinaremos los detalles de entrega y pago",
      "Te contactaremos en breve para confirmar los siguientes pasos",
    ]),
    ctaLabel: "Ver estado de mi solicitud",
    ctaUrl: input.trackingUrl,
    closingHtml: "<p>Si tienes dudas sobre los próximos pasos, escríbenos a través de los canales habituales.</p>",
  });
}

export function renderQuoteRejectedEmail(input: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
  trackingUrl: string;
  rejectionReason?: string;
}) {
  const reasonHtml = input.rejectionReason
    ? `
          <div style="background-color:#F7F9FC;border-left:4px solid #087FD5;padding:20px;margin:16px 0;border-radius:8px;">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4F5F73;margin-bottom:8px;">Tu comentario</div>
            <div style="font-size:14px;color:#071E41;line-height:1.6;">${escapeHtml(input.rejectionReason)}</div>
          </div>`
    : "";

  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: "<p>Registramos tu decisión de no continuar con esta propuesta. Si lo necesitas, podemos revisar alternativas contigo.</p>",
    infoRows: [
      { label: "Solicitud", value: input.requestNumber },
      { label: "Cotización", value: input.quoteNumber },
    ],
    extraHtml: `${reasonHtml}${nextStepsBox("¿Qué hacer ahora?", [
      "Contactaremos para explorar otras opciones",
      "Podemos ajustar la propuesta según tus necesidades",
      "Estamos aquí para encontrar la mejor solución",
    ])}`,
    ctaLabel: "Ver estado de mi solicitud",
    ctaUrl: input.trackingUrl,
    closingHtml: "<p>Si quieres comentarnos algo más, escríbenos a través de los canales habituales.</p>",
  });
}

export function renderMandateEmail(input: {
  customerName: string;
  requestNumber: string;
  trackingUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: `
      <p>Adjuntamos el mandato AXESSIA asociado a tu solicitud. El documento PDF va incluido en este correo.</p>
      <p>Revísalo, fírmalo y realiza la gestión notarial que corresponda. Luego, devuélvelo a AXESSIA por los canales indicados.</p>
    `,
    infoRows: [{ label: "Número de solicitud", value: input.requestNumber }],
    ctaLabel: "Ver estado de mi solicitud",
    ctaUrl: input.trackingUrl,
    closingHtml: "<p>Si tienes dudas sobre este documento, responde este correo o escríbenos a través de los canales habituales.</p>",
  });
}

export function renderQuotePendingReminderEmail(input: {
  customerName: string;
  quoteNumber: string;
  validUntilLabel: string;
  quoteUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: `
      <p>Tu cotización AXESSIA continúa pendiente de respuesta.</p>
      <p>Sabemos que este medicamento o producto puede ser importante para ti. Aún no hemos recibido tu decisión y queremos recordarte que la propuesta tiene una fecha de vigencia.</p>
      <p>Puedes revisar la propuesta y aceptarla o rechazarla desde tu portal.</p>
    `,
    infoRows: [
      { label: "Número de cotización", value: input.quoteNumber },
      { label: "Vigente hasta", value: input.validUntilLabel },
    ],
    ctaLabel: "Ver propuesta",
    ctaUrl: input.quoteUrl,
  });
}

export function renderQuoteExpiringSoonEmail(input: {
  customerName: string;
  quoteNumber: string;
  validUntilLabel: string;
  quoteUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Aviso de vigencia",
    greeting: input.customerName,
    introHtml: `
      <p>Tu cotización AXESSIA vence mañana.</p>
      <p>Aún no hemos recibido tu respuesta. Te recomendamos revisar la propuesta antes de su vencimiento.</p>
    `,
    infoRows: [
      { label: "Número de cotización", value: input.quoteNumber },
      { label: "Vence", value: input.validUntilLabel },
    ],
    ctaLabel: "Ver propuesta",
    ctaUrl: input.quoteUrl,
  });
}

export function renderRequestCompletedEmail(input: {
  customerName: string;
  requestNumber: string;
  requestUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Soluciones de Farmacoterapia",
    greeting: input.customerName,
    introHtml: `
      <p>Tu solicitud AXESSIA ha sido finalizada.</p>
      <p>El proceso asociado a tu solicitud ya fue cerrado. Puedes revisar el detalle y el historial desde tu portal.</p>
    `,
    infoRows: [{ label: "Número de solicitud", value: input.requestNumber }],
    ctaLabel: "Ver solicitud",
    ctaUrl: input.requestUrl,
    closingHtml: "<p>Si tienes una consulta, responde este correo o escríbenos a través de los canales habituales.</p>",
  });
}

export function renderCustomerPasswordResetEmail(input: {
  customerName: string;
  resetUrl: string;
}) {
  return renderCustomerEmail({
    eyebrow: "Portal del cliente",
    greeting: input.customerName,
    introHtml: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta AXESSIA.</p>
      <p>Si fuiste tú, usa el botón para crear una nueva contraseña. El enlace es personal, de un solo uso y vence en 1 hora.</p>
    `,
    infoRows: [
      { label: "Vigencia del enlace", value: "1 hora · un solo uso" },
      { label: "Portal", value: "Mi cuenta AXESSIA" },
    ],
    ctaLabel: "Crear nueva contraseña",
    ctaUrl: input.resetUrl,
    closingHtml: "<p>Si no solicitaste este cambio, ignora este correo. Tu contraseña actual no se modifica.</p>",
  });
}

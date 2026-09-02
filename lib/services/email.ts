import { Resend } from "resend";

export const AXESSIA_EMAIL = "no-reply@axessia.cl";
export const EMAIL_FORM = process.env.EMAIL_FORM || process.env.ADMIN_EMAIL_ADDRESS || "administracion@axessia.cl";
export const EMAIL_NOTIFICATION = process.env.EMAIL_NOTIFICATION || process.env.ADMIN_EMAIL_ADDRESS || "administracion@axessia.cl";
export const ADMIN_EMAIL = EMAIL_NOTIFICATION;

// Initialize Resend only if API key is available
// If not configured, emails will be skipped gracefully
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export function isEmailDeliveryConfigured() {
  return resend !== null;
}

export type EmailType = "quote_request_received" | "quote_ready" | "quote_accepted" | "quote_rejected";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

/**
 * Send an email using Resend
 * Execution is fire-and-forget to avoid blocking request creation
 * Errors are logged but don't fail the parent operation
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  // Don't await this - it runs in the background
  // This ensures email failures don't fail the quote request creation
  sendEmailAsync(params).catch((error) => {
    console.error("[Email] Failed to send email:", {
      to: params.to,
      subject: params.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/**
 * Send an email and await the result, throwing if it fails.
 * Use only where the caller needs to react to a failed send (e.g. retry flows).
 */
export async function sendEmailAwaited(params: SendEmailParams): Promise<void> {
  await sendEmailAsync(params);
}

/**
 * Internal async email sender
 * Should not be called directly - use sendEmail() instead
 */
async function sendEmailAsync(params: SendEmailParams): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured. Email not sent to:", params.to);
    return;
  }

  try {
    await resend.emails.send({
      from: `AXESSIA <${AXESSIA_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      attachments: params.attachments,
    });

    console.log("[Email] Successfully sent email to:", params.to);
  } catch (error) {
    // Errors are already logged by sendEmail caller
    throw error;
  }
}

export async function sendMandateEmail(customerEmail: string, customerName: string, requestNumber: string, fileName: string, pdf: Uint8Array): Promise<void> {
  if (!isEmailDeliveryConfigured()) throw new Error("El envío de correo no está configurado.");
  await sendEmailAwaited({
    to: customerEmail,
    subject: `Mandato para firma y notarización - ${requestNumber}`,
    html: `<p>Hola ${customerName},</p><p>Adjuntamos el mandato AXESSIA asociado a tu solicitud ${requestNumber}. Revísalo, fírmalo y realiza la gestión notarial que corresponda. Luego, devuélvelo a AXESSIA por los canales indicados.</p><p>Saludos,<br />Equipo AXESSIA</p>`,
    attachments: [{ filename: fileName, content: Buffer.from(pdf) }],
  });
}

/**
 * Send quote request received confirmation email to customer
 */
export async function sendQuoteRequestReceivedEmail(
  customerEmail: string,
  customerName: string,
  requestNumber: string,
): Promise<void> {
  const html = generateQuoteRequestReceivedEmail({
    customerName,
    requestNumber,
  });

  await sendEmail({
    to: customerEmail,
    subject: "Solicitud de Cotización Recibida - AXESSIA",
    html,
  });
}

/**
 * Send quote-ready notification to the customer once a quote is created and sent.
 * Awaited (not fire-and-forget) so the caller can detect failures and offer a retry.
 */
export async function sendQuoteReadyEmail(
  customerEmail: string,
  customerName: string,
  requestNumber: string,
  quoteNumber: string,
  total: string | number | null,
  validUntil: string | null,
): Promise<void> {
  const html = generateQuoteReadyEmail({
    customerName,
    requestNumber,
    quoteNumber,
    total,
    validUntil,
  });

  await sendEmailAwaited({
    to: customerEmail,
    subject: `Tu cotización ${quoteNumber} está lista - AXESSIA`,
    html,
  });
}

/**
 * Send internal notification for new quote request
 */
export async function sendInternalQuoteRequestNotification(
  customerName: string,
  customerEmail: string,
  requestNumber: string,
  medicationCount: number,
): Promise<void> {
  const html = generateInternalQuoteRequestEmail({
    customerName,
    customerEmail,
    requestNumber,
    medicationCount,
  });

  await sendEmail({
    to: EMAIL_NOTIFICATION,
    subject: `Nueva Solicitud de Cotización: ${requestNumber}`,
    html,
    replyTo: customerEmail,
  });
}

/**
 * Send a public contact form message to the admin inbox.
 * Awaited so the contact API can report a real success/error to the user.
 */
export async function sendContactMessageEmail(params: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<void> {
  const html = generateContactMessageEmail(params);

  await sendEmailAwaited({
    to: EMAIL_FORM,
    subject: `Nuevo mensaje de contacto: ${params.subject}`,
    html,
    replyTo: params.email,
  });
}

/**
 * HTML template for customer confirmation email
 */
function generateQuoteRequestReceivedEmail({
  customerName,
  requestNumber,
}: {
  customerName: string;
  requestNumber: string;
}): string {
  const trackingUrl = `https://axessia.cl/seguimiento/${requestNumber}`;

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
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .message {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 30px;
          color: #4F5F73;
        }
        .info-box {
          background-color: #F7F9FC;
          border-left: 4px solid #087FD5;
          padding: 20px;
          margin: 30px 0;
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
        .footer-text {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AXESSIA</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Soluciones de Farmacoterapia</p>
        </div>

        <div class="content">
          <div class="greeting">¡Hola ${escapeHtml(customerName)}!</div>

          <div class="message">
            <p>Gracias por confiar en <strong>AXESSIA</strong>. Hemos recibido tu solicitud de cotización y nuestro equipo ha comenzado a revisarla.</p>
          </div>

          <div class="info-box">
            <div class="info-label">Número de Solicitud</div>
            <div class="info-value">${escapeHtml(requestNumber)}</div>
            <p style="font-size: 12px; color: #4F5F73; margin-top: 10px;">Guarda este número para hacer seguimiento de tu solicitud.</p>
          </div>

          <div class="message">
            <p><strong>¿Cuál es el siguiente paso?</strong></p>
            <p>Nuestro equipo de especialistas revisará tu solicitud y los medicamentos requeridos. Nos contactaremos contigo en breve con una cotización personalizada y las opciones disponibles.</p>
          </div>

          <div style="text-align: center;">
            <a href="${trackingUrl}" class="cta-button">Ver Estado de mi Solicitud</a>
          </div>

          <div class="message" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #DCE4ED;">
            <p><strong>¿Preguntas?</strong></p>
            <p>Si tienes dudas o necesitas contactarnos, responde a este correo o visita nuestra sección de <a href="https://axessia.cl/preguntas-frecuentes" style="color: #087FD5; text-decoration: none;">Preguntas Frecuentes</a>.</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">
            © 2026 AXESSIA. Todos los derechos reservados.
          </div>
          <div class="footer-text" style="font-size: 11px; color: #8A96A8;">
            <p>Este es un correo automatizado. Por favor no respondas con información sensible.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for the quote-ready customer notification
 */
function generateQuoteReadyEmail({
  customerName,
  requestNumber,
  quoteNumber,
  total,
  validUntil,
}: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
  total: string | number | null;
  validUntil: string | null;
}): string {
  const trackingUrl = `https://axessia.cl/seguimiento/${requestNumber}`;
  const totalLabel = total !== null ? `$${Number(total).toLocaleString("es-CL")}` : "Por confirmar";
  const validUntilLabel = validUntil ? new Date(validUntil).toLocaleDateString("es-CL", { dateStyle: "long" }) : "Sin fecha límite";

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
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .message {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 30px;
          color: #4F5F73;
        }
        .info-box {
          background-color: #F7F9FC;
          border-left: 4px solid #7A28D8;
          padding: 20px;
          margin: 30px 0;
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
        .footer-text {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AXESSIA</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Soluciones de Farmacoterapia</p>
        </div>

        <div class="content">
          <div class="greeting">¡Hola ${escapeHtml(customerName)}!</div>

          <div class="message">
            <p>Tenemos buenas noticias: tu cotización ya está lista para revisión.</p>
          </div>

          <div class="info-box">
            <div class="info-label">Número de Cotización</div>
            <div class="info-value">${escapeHtml(quoteNumber)}</div>
            <p style="font-size: 12px; color: #4F5F73; margin-top: 10px;">Solicitud asociada: ${escapeHtml(requestNumber)}</p>
          </div>

          <div class="info-box">
            <div class="info-label">Total estimado</div>
            <div class="info-value">${escapeHtml(totalLabel)}</div>
            <p style="font-size: 12px; color: #4F5F73; margin-top: 10px;">Vigente hasta: ${escapeHtml(validUntilLabel)}</p>
          </div>

          <div style="text-align: center;">
            <a href="${trackingUrl}" class="cta-button">Ver mi Cotización</a>
          </div>

          <div class="message" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #DCE4ED;">
            <p><strong>¿Preguntas?</strong></p>
            <p>Si tienes dudas o necesitas contactarnos, responde a este correo o visita nuestra sección de <a href="https://axessia.cl/preguntas-frecuentes" style="color: #087FD5; text-decoration: none;">Preguntas Frecuentes</a>.</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">
            © 2026 AXESSIA. Todos los derechos reservados.
          </div>
          <div class="footer-text" style="font-size: 11px; color: #8A96A8;">
            <p>Este es un correo automatizado. Por favor no respondas con información sensible.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for internal admin notification
 */
function generateInternalQuoteRequestEmail({
  customerName,
  customerEmail,
  requestNumber,
  medicationCount,
}: {
  customerName: string;
  customerEmail: string;
  requestNumber: string;
  medicationCount: number;
}): string {
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
          background: linear-gradient(90deg, #071E41 0%, #04152F 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-family: 'Montserrat', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }
        .content {
          padding: 30px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #DCE4ED;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          flex: 0 0 150px;
          font-weight: 600;
          color: #4F5F73;
          font-size: 13px;
        }
        .detail-value {
          flex: 1;
          color: #071E41;
          font-size: 13px;
        }
        .action-link {
          color: #087FD5;
          text-decoration: none;
          font-weight: 600;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">AXESSIA — Notificación Interna</h1>
        </div>

        <div class="content">
          <div class="title">Nueva Solicitud de Cotización Recibida</div>

          <div class="detail-row">
            <div class="detail-label">Número de Solicitud:</div>
            <div class="detail-value"><strong>${escapeHtml(requestNumber)}</strong></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${escapeHtml(customerName)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value"><a href="mailto:${escapeHtml(customerEmail)}" class="action-link">${escapeHtml(customerEmail)}</a></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Medicamentos:</div>
            <div class="detail-value">${medicationCount} medicamento(s)</div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DCE4ED;">
            <a href="https://axessia.cl/app/solicitudes/${requestNumber}" class="action-link" style="display: inline-block; padding: 8px 16px; background-color: #F7F9FC; border-radius: 8px; text-decoration: none;">Ver solicitud en el dashboard →</a>
          </div>
        </div>

        <div class="footer">
          <p>Este es un correo automatizado del sistema AXESSIA</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for the public contact form notification
 */
function generateContactMessageEmail({
  name,
  email,
  phone,
  subject,
  message,
}: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): string {
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
          background: linear-gradient(90deg, #071E41 0%, #04152F 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-family: 'Montserrat', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }
        .content {
          padding: 30px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #DCE4ED;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          flex: 0 0 150px;
          font-weight: 600;
          color: #4F5F73;
          font-size: 13px;
        }
        .detail-value {
          flex: 1;
          color: #071E41;
          font-size: 13px;
        }
        .message-box {
          background-color: #F7F9FC;
          border-left: 4px solid #087FD5;
          padding: 16px;
          margin-top: 20px;
          border-radius: 8px;
          font-size: 13px;
          color: #071E41;
          white-space: pre-wrap;
        }
        .action-link {
          color: #087FD5;
          text-decoration: none;
          font-weight: 600;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">AXESSIA — Nuevo Mensaje de Contacto</h1>
        </div>

        <div class="content">
          <div class="title">${escapeHtml(subject)}</div>

          <div class="detail-row">
            <div class="detail-label">Nombre:</div>
            <div class="detail-value">${escapeHtml(name)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value"><a href="mailto:${escapeHtml(email)}" class="action-link">${escapeHtml(email)}</a></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Teléfono:</div>
            <div class="detail-value">${escapeHtml(phone)}</div>
          </div>

          <div class="message-box">${escapeHtml(message)}</div>
        </div>

        <div class="footer">
          <p>Este mensaje fue enviado desde el formulario de contacto de axessia.cl</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send quote acceptance confirmation email to customer
 */
export async function sendQuoteAcceptedEmail(
  customerEmail: string,
  customerName: string,
  requestNumber: string,
  quoteNumber: string,
): Promise<void> {
  const html = generateQuoteAcceptedEmail({
    customerName,
    requestNumber,
    quoteNumber,
  });

  await sendEmail({
    to: customerEmail,
    subject: `Cotización Aceptada - ${quoteNumber} - AXESSIA`,
    html,
  });
}

/**
 * Send internal notification for quote acceptance
 */
export async function sendInternalQuoteAcceptedNotification(
  customerName: string,
  customerEmail: string,
  requestNumber: string,
  quoteNumber: string,
): Promise<void> {
  const html = generateInternalQuoteAcceptedEmail({
    customerName,
    customerEmail,
    requestNumber,
    quoteNumber,
  });

  await sendEmail({
    to: EMAIL_NOTIFICATION,
    subject: `Cotización Aceptada: ${quoteNumber} (${requestNumber})`,
    html,
    replyTo: customerEmail,
  });
}

/**
 * Send quote rejection confirmation email to customer
 */
export async function sendQuoteRejectedEmail(
  customerEmail: string,
  customerName: string,
  requestNumber: string,
  quoteNumber: string,
  rejectionReason?: string,
): Promise<void> {
  const html = generateQuoteRejectedEmail({
    customerName,
    requestNumber,
    quoteNumber,
    rejectionReason,
  });

  await sendEmail({
    to: customerEmail,
    subject: `Cotización Rechazada - ${quoteNumber} - AXESSIA`,
    html,
  });
}

/**
 * Send internal notification for quote rejection
 */
export async function sendInternalQuoteRejectedNotification(
  customerName: string,
  customerEmail: string,
  requestNumber: string,
  quoteNumber: string,
  rejectionReason?: string,
): Promise<void> {
  const html = generateInternalQuoteRejectedEmail({
    customerName,
    customerEmail,
    requestNumber,
    quoteNumber,
    rejectionReason,
  });

  await sendEmail({
    to: EMAIL_NOTIFICATION,
    subject: `Cotización Rechazada: ${quoteNumber} (${requestNumber})`,
    html,
    replyTo: customerEmail,
  });
}

/**
 * HTML template for quote acceptance customer email
 */
function generateQuoteAcceptedEmail({
  customerName,
  requestNumber,
  quoteNumber,
}: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
}): string {
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
        .content {
          padding: 40px 30px;
        }
        .success-icon {
          font-size: 48px;
          text-align: center;
          margin-bottom: 20px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
          text-align: center;
        }
        .message {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 30px;
          color: #4F5F73;
        }
        .info-box {
          background-color: #F7F9FC;
          border-left: 4px solid #00A6D9;
          padding: 20px;
          margin: 30px 0;
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
        .next-steps {
          background-color: #F0F9FF;
          border-left: 4px solid #087FD5;
          padding: 20px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .next-steps .title {
          font-size: 14px;
          font-weight: 600;
          color: #071E41;
          margin-bottom: 10px;
        }
        .next-steps .step {
          font-size: 13px;
          color: #4F5F73;
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
        }
        .next-steps .step:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #087FD5;
          font-weight: 600;
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
        .footer-text {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AXESSIA</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Soluciones de Farmacoterapia</p>
        </div>

        <div class="content">
          <div class="success-icon">✓</div>
          <div class="greeting">¡Cotización Aceptada!</div>

          <div class="message">
            <p>Excelente noticia, ${escapeHtml(customerName)}. Hemos recibido tu aceptación de la cotización y procederemos con los próximos pasos para procesarla.</p>
          </div>

          <div class="info-box">
            <div class="info-label">Solicitud</div>
            <div class="info-value">${escapeHtml(requestNumber)}</div>
          </div>

          <div class="info-box">
            <div class="info-label">Cotización</div>
            <div class="info-value">${escapeHtml(quoteNumber)}</div>
          </div>

          <div class="next-steps">
            <div class="title">¿Qué sucede ahora?</div>
            <div class="step">Procesaremos tu cotización aceptada</div>
            <div class="step">Coordinaremos los detalles de entrega y pago</div>
            <div class="step">Te contactaremos en breve para confirmar los siguientes pasos</div>
          </div>

          <div class="message">
            <p><strong>¿Preguntas?</strong></p>
            <p>Si tienes dudas sobre los próximos pasos, contáctanos directamente o responde a este correo.</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">
            © 2026 AXESSIA. Todos los derechos reservados.
          </div>
          <div class="footer-text" style="font-size: 11px; color: #8A96A8;">
            <p>Este es un correo automatizado. Por favor no respondas con información sensible.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for internal quote acceptance notification
 */
function generateInternalQuoteAcceptedEmail({
  customerName,
  customerEmail,
  requestNumber,
  quoteNumber,
}: {
  customerName: string;
  customerEmail: string;
  requestNumber: string;
  quoteNumber: string;
}): string {
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
          background: linear-gradient(90deg, #071E41 0%, #04152F 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-family: 'Montserrat', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }
        .badge {
          display: inline-block;
          background-color: #00A6D9;
          color: #FFFFFF;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 10px;
        }
        .content {
          padding: 30px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #DCE4ED;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          flex: 0 0 150px;
          font-weight: 600;
          color: #4F5F73;
          font-size: 13px;
        }
        .detail-value {
          flex: 1;
          color: #071E41;
          font-size: 13px;
        }
        .action-link {
          color: #087FD5;
          text-decoration: none;
          font-weight: 600;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">AXESSIA</h1>
          <div class="badge">COTIZACIÓN ACEPTADA</div>
        </div>

        <div class="content">
          <div class="title">Cliente Aceptó Cotización</div>

          <div class="detail-row">
            <div class="detail-label">Cotización:</div>
            <div class="detail-value"><strong>${escapeHtml(quoteNumber)}</strong></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Solicitud:</div>
            <div class="detail-value"><strong>${escapeHtml(requestNumber)}</strong></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${escapeHtml(customerName)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value"><a href="mailto:${escapeHtml(customerEmail)}" class="action-link">${escapeHtml(customerEmail)}</a></div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DCE4ED;">
            <a href="https://axessia.cl/app/solicitudes/${requestNumber}" class="action-link" style="display: inline-block; padding: 8px 16px; background-color: #F7F9FC; border-radius: 8px; text-decoration: none;">Ver solicitud en el dashboard →</a>
          </div>
        </div>

        <div class="footer">
          <p>Acción requerida: Procesar cotización aceptada</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for quote rejection customer email
 */
function generateQuoteRejectedEmail({
  customerName,
  requestNumber,
  quoteNumber,
  rejectionReason,
}: {
  customerName: string;
  requestNumber: string;
  quoteNumber: string;
  rejectionReason?: string;
}): string {
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
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .message {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 30px;
          color: #4F5F73;
        }
        .info-box {
          background-color: #FFF5F5;
          border-left: 4px solid #D32F2F;
          padding: 20px;
          margin: 30px 0;
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
        .reason-box {
          background-color: #F7F9FC;
          border-left: 4px solid #087FD5;
          padding: 20px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .reason-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #4F5F73;
          margin-bottom: 8px;
        }
        .reason-text {
          font-size: 14px;
          color: #071E41;
          line-height: 1.6;
        }
        .next-steps {
          background-color: #F0F9FF;
          border-left: 4px solid #087FD5;
          padding: 20px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .next-steps .title {
          font-size: 14px;
          font-weight: 600;
          color: #071E41;
          margin-bottom: 10px;
        }
        .next-steps .step {
          font-size: 13px;
          color: #4F5F73;
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
        }
        .next-steps .step:before {
          content: "→";
          position: absolute;
          left: 0;
          color: #087FD5;
          font-weight: 600;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 30px;
          text-align: center;
          font-size: 12px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
        .footer-text {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AXESSIA</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Soluciones de Farmacoterapia</p>
        </div>

        <div class="content">
          <div class="greeting">Hola ${escapeHtml(customerName)},</div>

          <div class="message">
            <p>Recibimos que has decidido no aceptar esta cotización. Nos gustaría poder ayudarte con opciones alternativas.</p>
          </div>

          <div class="info-box">
            <div class="info-label">Solicitud</div>
            <div class="info-value">${escapeHtml(requestNumber)}</div>
          </div>

          <div class="info-box">
            <div class="info-label">Cotización Rechazada</div>
            <div class="info-value">${escapeHtml(quoteNumber)}</div>
          </div>

          ${
            rejectionReason
              ? `
          <div class="reason-box">
            <div class="reason-label">Tu comentario</div>
            <div class="reason-text">${escapeHtml(rejectionReason)}</div>
          </div>
          `
              : ""
          }

          <div class="next-steps">
            <div class="title">¿Qué hacer ahora?</div>
            <div class="step">Contactaremos para explorar otras opciones</div>
            <div class="step">Podemos ajustar la propuesta según tus necesidades</div>
            <div class="step">Estamos aquí para encontrar la mejor solución</div>
          </div>

          <div class="message">
            <p><strong>¿Preguntas o comentarios?</strong></p>
            <p>Queremos entender tu decisión. Responde a este correo con cualquier retroalimentación que te ayude a otros clientes.</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">
            © 2026 AXESSIA. Todos los derechos reservados.
          </div>
          <div class="footer-text" style="font-size: 11px; color: #8A96A8;">
            <p>Este es un correo automatizado. Por favor no respondas con información sensible.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for internal quote rejection notification
 */
function generateInternalQuoteRejectedEmail({
  customerName,
  customerEmail,
  requestNumber,
  quoteNumber,
  rejectionReason,
}: {
  customerName: string;
  customerEmail: string;
  requestNumber: string;
  quoteNumber: string;
  rejectionReason?: string;
}): string {
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
          background: linear-gradient(90deg, #071E41 0%, #04152F 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-family: 'Montserrat', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }
        .badge {
          display: inline-block;
          background-color: #D32F2F;
          color: #FFFFFF;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 10px;
        }
        .content {
          padding: 30px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #071E41;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #DCE4ED;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          flex: 0 0 150px;
          font-weight: 600;
          color: #4F5F73;
          font-size: 13px;
        }
        .detail-value {
          flex: 1;
          color: #071E41;
          font-size: 13px;
        }
        .action-link {
          color: #087FD5;
          text-decoration: none;
          font-weight: 600;
        }
        .reason-box {
          background-color: #FFF5F5;
          border-left: 4px solid #D32F2F;
          padding: 15px;
          margin: 15px 0;
          border-radius: 6px;
        }
        .reason-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #4F5F73;
          margin-bottom: 6px;
        }
        .reason-text {
          font-size: 13px;
          color: #071E41;
          line-height: 1.5;
        }
        .footer {
          background-color: #F7F9FC;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #4F5F73;
          border-top: 1px solid #DCE4ED;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">AXESSIA</h1>
          <div class="badge">COTIZACIÓN RECHAZADA</div>
        </div>

        <div class="content">
          <div class="title">Cliente Rechazó Cotización</div>

          <div class="detail-row">
            <div class="detail-label">Cotización:</div>
            <div class="detail-value"><strong>${escapeHtml(quoteNumber)}</strong></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Solicitud:</div>
            <div class="detail-value"><strong>${escapeHtml(requestNumber)}</strong></div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${escapeHtml(customerName)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value"><a href="mailto:${escapeHtml(customerEmail)}" class="action-link">${escapeHtml(customerEmail)}</a></div>
          </div>

          ${
            rejectionReason
              ? `
          <div class="reason-box">
            <div class="reason-label">Motivo del cliente</div>
            <div class="reason-text">${escapeHtml(rejectionReason)}</div>
          </div>
          `
              : '<div class="reason-box"><div class="reason-label">Motivo</div><div class="reason-text">Sin comentario</div></div>'
          }

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DCE4ED;">
            <a href="https://axessia.cl/app/solicitudes/${requestNumber}" class="action-link" style="display: inline-block; padding: 8px 16px; background-color: #F7F9FC; border-radius: 8px; text-decoration: none;">Ver solicitud en el dashboard →</a>
          </div>
        </div>

        <div class="footer">
          <p>Acción recomendada: Contactar cliente para entender motivo y explorar alternativas</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notify AXESSIA when a customer needs help with a payment issue.
 * Fire-and-forget so the customer action is not blocked by email delivery.
 */
export async function sendPaymentHelpRequestEmail(params: {
  customerName: string;
  customerEmail: string;
  requestNumber: string;
  quoteNumber: string;
  paymentReference: string | null;
  message: string;
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><title>Ayuda con pago</title></head>
    <body style="font-family: 'Plus Jakarta Sans', sans-serif; color: #071E41; background: #F7F9FC; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #DCE4ED; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #071E41 0%, #04152F 100%); color: #fff; padding: 24px;">
          <h1 style="margin: 0; font-size: 20px;">Ayuda con pago solicitada</h1>
        </div>
        <div style="padding: 24px;">
          <p><strong>Cliente:</strong> ${escapeHtml(params.customerName)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(params.customerEmail)}</p>
          <p><strong>Solicitud:</strong> ${escapeHtml(params.requestNumber)}</p>
          <p><strong>Cotización:</strong> ${escapeHtml(params.quoteNumber)}</p>
          <p><strong>Referencia de pago:</strong> ${escapeHtml(params.paymentReference || "Sin referencia")}</p>
          <div style="margin-top: 16px; padding: 16px; border-radius: 12px; background: #F7F9FC; border-left: 4px solid #087FD5;">
            ${escapeHtml(params.message)}
          </div>
          <p style="margin-top: 16px; font-size: 13px; color: #4F5F73;">La cotización permanece aceptada. El cliente puede reintentar el pago mientras se gestiona la ayuda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: EMAIL_NOTIFICATION,
    subject: `Ayuda con pago: ${params.requestNumber} / ${params.quoteNumber}`,
    html,
    replyTo: params.customerEmail,
  });
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

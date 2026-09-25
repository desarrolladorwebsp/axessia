import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { portalQuotePath, portalQuoteUrl, portalRequestPath, portalRequestUrl } from "../../lib/customer-notifications/urls";
import {
  renderMandateEmail,
  renderQuoteAcceptedEmail,
  renderQuoteExpiringSoonEmail,
  renderQuotePendingReminderEmail,
  renderQuoteReadyEmail,
  renderQuoteRejectedEmail,
  renderQuoteRequestReceivedEmail,
  renderRequestCompletedEmail,
} from "../../lib/services/customer-notification-emails";

describe("URLs y contenido de correos al cliente", () => {
  it("genera URLs del portal privado sin dominios hardcodeados", () => {
    const previousApp = process.env.APP_URL;
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    process.env.APP_URL = "https://axessia.cl";
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      assert.equal(portalQuotePath("quote-a"), "/mi-cuenta/cotizaciones/quote-a");
      assert.equal(portalRequestPath("request-a"), "/mi-cuenta/solicitudes/request-a");
      assert.equal(portalQuoteUrl("quote-a"), "https://axessia.cl/mi-cuenta/cotizaciones/quote-a");
      assert.equal(portalRequestUrl("request-a"), "https://axessia.cl/mi-cuenta/solicitudes/request-a");
      assert.equal(portalQuoteUrl("id with space"), "https://axessia.cl/mi-cuenta/cotizaciones/id%20with%20space");
    } finally {
      if (previousApp === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousApp;
      if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previousPublic;
    }
  });

  it("el recordatorio periódico no incluye datos médicos sensibles ni de otro cliente", () => {
    const html = renderQuotePendingReminderEmail({
      customerName: "Ana Pérez",
      quoteNumber: "C-10001",
      validUntilLabel: "10 de septiembre de 2026, 12:00",
      quoteUrl: "https://axessia.cl/mi-cuenta/cotizaciones/quote-a",
    });
    assert.match(html, /C-10001/);
    assert.match(html, /Ver propuesta/);
    assert.match(html, /https:\/\/axessia\.cl\/mi-cuenta\/cotizaciones\/quote-a/);
    assert.doesNotMatch(html, /RUT/i);
    assert.doesNotMatch(html, /receta/i);
    assert.doesNotMatch(html, /diagnóst/i);
    assert.doesNotMatch(html, /bruno@correo\.cl/);
    assert.doesNotMatch(html, /C-BBB/);
  });

  it("el aviso de vencimiento se diferencia del recordatorio periódico", () => {
    const html = renderQuoteExpiringSoonEmail({
      customerName: "Ana Pérez",
      quoteNumber: "C-10001",
      validUntilLabel: "10 de septiembre de 2026, 15:30",
      quoteUrl: "https://axessia.cl/mi-cuenta/cotizaciones/quote-a",
    });
    assert.match(html, /vence mañana/i);
    assert.match(html, /Ver propuesta/);
    assert.doesNotMatch(html, /continúa pendiente de respuesta/);
    assert.doesNotMatch(html, /RUT/i);
  });

  it("el correo de solicitud finalizada apunta a la solicitud del cliente", () => {
    const html = renderRequestCompletedEmail({
      customerName: "Ana Pérez",
      requestNumber: "SOL-10001",
      requestUrl: "https://axessia.cl/mi-cuenta/solicitudes/request-a",
    });
    assert.match(html, /SOL-10001/);
    assert.match(html, /finalizada/i);
    assert.match(html, /https:\/\/axessia\.cl\/mi-cuenta\/solicitudes\/request-a/);
    assert.doesNotMatch(html, /RUT/i);
    assert.doesNotMatch(html, /receta/i);
  });

  it("los correos de cliente usan identidad corporativa AXESSIA y no datos médicos", () => {
    const received = renderQuoteRequestReceivedEmail({
      customerName: "Ana Pérez",
      requestNumber: "S-100001",
      trackingUrl: "https://axessia.cl/seguimiento/S-100001",
      faqUrl: "https://axessia.cl/preguntas-frecuentes",
    });
    const ready = renderQuoteReadyEmail({
      customerName: "Ana Pérez",
      requestNumber: "S-100001",
      quoteNumber: "C-10001",
      total: 150000,
      validUntil: "2026-10-01T00:00:00.000Z",
      trackingUrl: "https://axessia.cl/seguimiento/S-100001",
      faqUrl: "https://axessia.cl/preguntas-frecuentes",
    });
    const accepted = renderQuoteAcceptedEmail({
      customerName: "Ana Pérez",
      requestNumber: "S-100001",
      quoteNumber: "C-10001",
      trackingUrl: "https://axessia.cl/seguimiento/S-100001",
    });
    const rejected = renderQuoteRejectedEmail({
      customerName: "Ana Pérez",
      requestNumber: "S-100001",
      quoteNumber: "C-10001",
      trackingUrl: "https://axessia.cl/seguimiento/S-100001",
      rejectionReason: "Precio fuera de presupuesto",
    });
    const mandate = renderMandateEmail({
      customerName: "Ana Pérez",
      requestNumber: "S-100001",
      trackingUrl: "https://axessia.cl/seguimiento/S-100001",
    });

    for (const html of [received, ready, accepted, rejected, mandate]) {
      assert.match(html, /AXESSIA/);
      assert.match(html, /#00A6D9/);
      assert.match(html, /#087FD5/);
      assert.match(html, /#7A28D8/);
      assert.match(html, /Hola Ana Pérez,/);
      assert.match(html, /S-100001/);
      assert.doesNotMatch(html, /RUT/i);
      assert.doesNotMatch(html, /receta/i);
      assert.doesNotMatch(html, /diagnóst/i);
      assert.doesNotMatch(html, /#D32F2F/);
    }

    assert.match(received, /Ver estado de mi solicitud/);
    assert.match(ready, /C-10001/);
    assert.match(accepted, /aceptación de la cotización/);
    assert.match(rejected, /Precio fuera de presupuesto/);
    assert.match(mandate, /mandato AXESSIA/);
    assert.match(mandate, /PDF/);
  });
});

# Alertas y notificaciones de AXESSIA

Guía breve para explicar qué avisos recibe el cliente y cuáles usa solo el equipo interno.

El cliente y el panel administrativo no comparten avisos. Lo que aparece en el dashboard no se envía al cliente, y los correos del cliente no aparecen como alertas del equipo.

---

## 1. Cliente

El cliente sigue su caso en el sitio (seguimiento o Mi cuenta). Los avisos le llegan por correo.

### Correos que recibe el cliente

| Cuándo | Asunto del correo | Para qué sirve |
| --- | --- | --- |
| Envía una solicitud | Solicitud de Cotización Recibida - AXESSIA | Confirma que la solicitud llegó e incluye el enlace de seguimiento. |
| El equipo envía la cotización | Tu cotización [número] está lista - AXESSIA | Le informa que ya puede revisarla, con monto y fecha de vigencia. |
| La cotización sigue sin respuesta | Tu cotización [número] sigue pendiente - AXESSIA | Recordatorio cada 3 días, mientras la cotización esté enviada y la solicitud espere su decisión. |
| Falta 1 día para que venza | Tu cotización [número] vence mañana - AXESSIA | Un solo aviso el día anterior al vencimiento. |
| Acepta la cotización | Cotización Aceptada - [número] - AXESSIA | Confirma que su aceptación quedó registrada. |
| Rechaza la cotización | Cotización Rechazada - [número] - AXESSIA | Confirma el rechazo. Si dejó un comentario, el correo lo incluye. |
| El equipo envía el mandato | Mandato para firma y notarización - [solicitud] | Lleva el PDF del mandato y el enlace de seguimiento. |
| La solicitud se marca como finalizada | Tu solicitud [número] fue finalizada - AXESSIA | Avisa que el proceso terminó. Se envía una sola vez. |
| Olvida su contraseña | Restablece tu contraseña - AXESSIA | Enlace para crear una nueva clave de Mi cuenta. |

### Cómo se comportan los recordatorios

- Solo aplican a una cotización **ya enviada** al cliente, con la solicitud en espera de su respuesta.
- No se envían si la cotización ya fue aceptada, rechazada o está vencida.
- El recordatorio de “sigue pendiente” se repite cada 3 días.
- El aviso de “vence mañana” se envía una sola vez.
- Si ese día también correspondería el recordatorio de 3 días, el cliente recibe solo el aviso de vencimiento, para no mandarle dos correos iguales.
- Cada aviso automático se envía una sola vez. No se duplica si el sistema vuelve a revisarlo.

---

## 2. Panel administrativo

Estos avisos son solo para colaboradores. El cliente no los ve.

### Dentro del panel

**Campana de notificaciones** (arriba, en las pantallas del sistema):

| Aviso | Qué significa |
| --- | --- |
| Nueva solicitud de [nombre] | Llegó una solicitud nueva. |
| [Nombre] aceptó su cotización | El cliente aceptó. |
| [Nombre] rechazó su cotización | El cliente rechazó. |

Al abrir el aviso, el equipo entra a esa solicitud y el aviso deja de figurar como pendiente.

**Alertas del dashboard** (cápsulas en el inicio del panel):

| Cápsula | Cuándo suma | Al hacer clic |
| --- | --- | --- |
| Cotizaciones por vencer | Hay una cotización vigente a la que le quedan menos de 3 días. Incluye borrador, lista para enviar o ya enviada. No incluye aceptadas, rechazadas, vencidas ni anuladas. | Muestra número de solicitud, número de cotización, monto, fecha de creación y responsable. |
| Solicitudes sin avance | La solicitud tiene más de 1 día y nadie la ha tomado, o ya pasaron 3 días desde que se asignó a un ejecutivo y todavía no tiene cotización. | Muestra número de solicitud, la situación, fecha de recepción y responsable. |

No entran en “sin avance” las solicitudes rechazadas, canceladas o finalizadas.

**Etiqueta en la ficha de la solicitud:**

- **Cliente con solicitudes activas** aparece cuando el mismo RUT tiene más de 2 solicitudes activas.
- Una solicitud rechazada, cancelada o finalizada no se cuenta.
- Sirve para que el equipo note que esa persona tiene varios casos abiertos.

Si una alerta del dashboard no puede calcularse, esa cápsula muestra “No disponible”. El resto del panel sigue funcionando.

### Correos que recibe el equipo

La mayoría llega al correo de administración de AXESSIA, no a cada colaborador.

| Cuándo | Asunto del correo | Quién lo recibe |
| --- | --- | --- |
| Entra una solicitud nueva | Nueva Solicitud de Cotización: [número] | Correo de administración. |
| El cliente acepta | Cotización Aceptada: [cotización] ([solicitud]) | Correo de administración. |
| El cliente rechaza | Cotización Rechazada: [cotización] ([solicitud]) | Correo de administración. Incluye el motivo si el cliente lo escribió. |
| El cliente pide ayuda con un pago | Ayuda con pago: [solicitud] / [cotización] | Correo de administración. La cotización sigue aceptada y el cliente puede reintentar el pago. |
| Alguien escribe por el formulario de contacto del sitio | Nuevo mensaje de contacto ([motivo]): [asunto] | Correo de administración. Se puede responder directo a quien escribió. |
| Se invita a un colaborador nuevo | Invitación para completar tu registro en AXESSIA | El correo de esa persona. El enlace dura 7 días. |
| Un colaborador olvida su contraseña | Restablece tu contraseña - AXESSIA | El correo de ese colaborador. |

---

## Cómo explicarlo en una frase

El cliente recibe correos de su propio caso: recepción, cotización, recordatorios, decisión, mandato y cierre. El equipo ve en el panel lo que debe atender hoy, y además recibe en el correo de administración los hechos que requieren acción: una solicitud nueva, una decisión del cliente, un problema de pago o un mensaje del sitio.

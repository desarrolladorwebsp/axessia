# AXESSIA - Dominio funcional

## Alcance

Esta regla define el modelo funcional de solicitudes, cotizaciones, clientes, documentos y trazabilidad. Debe consultarse antes de modificar cualquiera de esas areas. No define el diseno visual del dashboard.

## Entidades y flujo

- **Solicitud** es el registro inicial de una persona que pide cotizar uno o mas medicamentos. Puede crearse sin cuenta.
- La solicitud conserva el contacto que la origino y puede asociarse posteriormente a un cliente formal.
- **Cotizacion** es una propuesta comercial creada despues de la gestion interna. Nunca se crea automaticamente al registrar una solicitud.
- El flujo es: `Solicitud -> gestion interna -> Cotizacion`.
- Una solicitud puede tener cero, una o varias cotizaciones, incluyendo versiones o reemplazos.
- Los medicamentos de la solicitud representan lo pedido. Los items de cotizacion representan lo ofrecido y sus valores. No deben mezclarse.

## Clientes y documentos

- Un cliente puede tener muchas solicitudes.
- El alta o asociacion de cliente debe buscar identificadores existentes, como correo y RUT, y evitar duplicados.
- Una persona puede permanecer como contacto solicitante sin convertirse en cliente.
- Recetas y documentos son registros relacionales asociados a solicitudes y opcionalmente a clientes. La base guarda metadatos y una referencia de almacenamiento (`storageKey`), no el archivo pesado.
- Una solicitud puede tener multiples documentos y un cliente puede tener documentos vinculados a distintas solicitudes.

## Estados independientes

Solicitud: `RECEIVED`, `REVIEWING`, `SOURCING`, `QUOTED`, `AWAITING_DECISION`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`.

Cotizacion: `DRAFT`, `READY`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `VOIDED`.

No usar un estado unico para representar ambos procesos. Los cambios de estado deben conservar el historial y no sobrescribir eventos relevantes.

## Trazabilidad e identificadores

- Cada solicitud tiene un ID interno y un `requestNumber` publico, amigable y unico. El codigo publico no reemplaza al ID interno.
- Cada cambio relevante debe poder registrar evento, estado resultante, fecha, nota opcional y usuario responsable cuando exista.
- Los eventos son historicos; las correcciones se registran como nuevos eventos.

## Reglas de implementacion

- Las APIs publicas de solicitud deben validar consentimiento, contacto, al menos un medicamento y los documentos requeridos por el formulario.
- Registrar una solicitud no debe crear un cliente ni una cotizacion automaticamente.
- Mantener separadas UI, servicios, reglas de negocio y persistencia.
- Consultar solo los campos necesarios, paginar listados y mantener indices para identificadores, relaciones, estados y fechas.
- Antes de cambiar el modelo por una instruccion que contradiga estas reglas, identificar explicitamente el conflicto.

## Preparacion futura

El modelo debe permitir agregar proveedores, compras, pagos, logistica, notificaciones, CRM, reportes, automatizaciones y permisos sin cambiar el nucleo de solicitud-cotizacion. No implementar esos modulos hasta que sean solicitados.

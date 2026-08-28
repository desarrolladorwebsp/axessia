# Email Integration - Problem & Solution

## 🔴 Problema Identificado

El sistema estaba retornando **500 Internal Server Error** al intentar crear una solicitud de cotización.

### Root Cause
```
⨯ Error: Missing API key. Pass it to the constructor `new Resend("re_123")`
```

**Causa raíz:** En `lib/services/email.ts`, la línea:
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
```

Se ejecutaba al cargar el módulo. Si `RESEND_API_KEY` estaba vacío en `.env`, Resend lanzaba un error inmediatamente, lo que causaba que todo el servidor fallara con 500 en el endpoint `/api/quote-requests`.

---

## ✅ Solución Implementada

### Cambio en `lib/services/email.ts`

**Antes (❌ Falla si API key está vacía):**
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
```

**Después (✅ Maneja gracefully):**
```typescript
// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
  resend = new Resend(process.env.RESEND_API_KEY);
}
```

**Beneficios:**
- ✅ El servidor no falla si RESEND_API_KEY está vacía
- ✅ Las solicitudes se guardan correctamente
- ✅ Se registra un warning indicando que Resend no está configurado
- ✅ Cuando se configura RESEND_API_KEY, los emails se envían automáticamente
- ✅ Fire-and-forget: fallos de email no afectan la solicitud

---

## 🧪 Prueba de Funcionamiento

### Test 1: Crear Solicitud (sin API key)
```bash
curl -X POST http://localhost:3000/api/quote-requests \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Alfredo Test",
      "phone": "+56987654321",
      "email": "soyalfredo.dev@gmail.com",
      "rut": "12345678-9",
      "city": "Santiago"
    },
    "prescription": {
      "fileName": "test.pdf",
      "mimeType": "application/pdf",
      "fileSize": 1024
    },
    "medications": [
      {
        "commercialName": "Metformina 500mg",
        "activeIngredient": "Metformina",
        "concentration": "500mg",
        "tabletQuantity": 30
      }
    ],
    "acceptsPolicies": true,
    "acceptsDataTreatment": true
  }'
```

**Respuesta (✅ 201 Created):**
```json
{
  "id": "dev-1787752642514",
  "requestNumber": "S-100002",
  "customerId": null,
  "status": "RECEIVED",
  "createdAt": "2026-08-26T13:57:22.514Z",
  "price": null
}
```

**Logs del servidor:**
```
[Email] RESEND_API_KEY not configured. Email not sent to: "soyalfredo.dev@gmail.com"
[Email] RESEND_API_KEY not configured. Email not sent to: "admin@axessia.cl"
```

✅ **Resultado:** Solicitud guardada correctamente, emails no enviados pero sin fallar.

---

## 🔑 Próximo Paso: Configurar RESEND_API_KEY

Para que los emails se envíen realmente:

### 1. Obtener API Key
```
1. Ve a https://resend.com/api-keys
2. Log in con tu cuenta (o crea una)
3. Click en "Create API Key"
4. Copia la key (ej: re_xxxxxxxxxxxxx)
```

### 2. Configurar en `.env`
```env
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Tu API key de Resend
ADMIN_EMAIL_ADDRESS=admin@axessia.cl
```

### 3. Verificar Dominio en Resend
```
1. Ve a https://resend.com/domains
2. Agrega: no-reply@axessia.cl
3. Configura los registros DNS que Resend te muestra
4. Espera verificación (24-48 horas)
```

### 4. Probar
```bash
curl -X POST http://localhost:3000/api/quote-requests \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Con API key configurado, verás en logs:**
```
[Email] Successfully sent email to: soyalfredo.dev@gmail.com
[Email] Successfully sent email to: admin@axessia.cl
```

---

## 📊 Estado Actual

| Componente | Estado | Descripción |
|-----------|--------|------------|
| API Endpoint | ✅ Funciona | POST /api/quote-requests retorna 201 |
| Guardado en BD | ✅ Funciona | Solicitudes se guardan en quote-requests.json |
| Email Service | ⚠️ Sin configurar | Resend no tiene API key, emails no se envían |
| Flujo Completo | ⚠️ Parcial | Solicitud sí, emails no (hasta configurar key) |

---

## 📁 Archivos Modificados

**lib/services/email.ts**
- Inicialización condicional de Resend
- Manejo graceful cuando API key no existe
- Warnings en lugar de errores

---

## 🚀 Flujo Completo (Ahora Funcional)

```
1. Cliente rellena formulario en navegador
   ↓
2. Frontend envía POST a /api/quote-requests
   ↓
3. Backend valida datos
   ↓
4. Backend guarda en BD (quote-requests.json)
   ↓
5. Backend responde 201 al cliente ✅
   ↓
6. [ASYNC] Intenta enviar email al cliente
   - Si RESEND_API_KEY configurado → EMAIL ENVIADO ✅
   - Si RESEND_API_KEY vacío → WARNING LOGGED ⚠️
   ↓
7. [ASYNC] Intenta enviar email al admin
   - Si RESEND_API_KEY configurado → EMAIL ENVIADO ✅
   - Si RESEND_API_KEY vacío → WARNING LOGGED ⚠️
```

---

## 📋 Checklist

- [x] Identificar error 500
- [x] Localizar causa raíz (Resend sin API key)
- [x] Implementar manejo graceful
- [x] Probar API funciona
- [x] Verificar solicitudes se guardan
- [ ] Configurar RESEND_API_KEY real
- [ ] Verificar dominio en Resend
- [ ] Probar emails se envían
- [ ] Validar flujo aceptación/rechazo

---

## ✨ Resultado Final

**Ahora puedes:**
- ✅ Crear solicitudes desde el formulario (salvo que falte API key)
- ✅ Ver solicitudes guardadas en `/app/solicitudes`
- ✅ Hacer seguimiento en `/seguimiento`
- ⏳ Recibir emails (una vez configures RESEND_API_KEY)

---

**Fecha de Fix:** 2026-08-26  
**Status:** ✅ FUNCIONAL (Falta solo configurar RESEND_API_KEY)

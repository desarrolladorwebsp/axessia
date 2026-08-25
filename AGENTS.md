<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AXESSIA brand system

Siempre respetar esta identidad visual global para cualquier nueva página o componente:

- Tecnología + salud + confianza + cercanía + profesionalismo.
- Paleta base:
  --navy: #071E41;
  --navy-dark: #04152F;
  --blue: #087FD5;
  --cyan: #00A6D9;
  --purple: #7A28D8;
  --violet: #9228E8;
  --white: #FFFFFF;
  --background: #F7F9FC;
  --text: #071E41;
  --text-secondary: #4F5F73;
  --border: #DCE4ED;
- Gradiente principal: linear-gradient(90deg, #00A6D9 0%, #087FD5 45%, #7A28D8 100%).
- Tipografía: Montserrat para titulares y Plus Jakarta Sans para UI, párrafos y botones.
- Títulos principales con peso 700–800, navy y line-height compacto, destacando fragmentos con degradado.
- Preferir cards blancas y limpias, radios 16–24px, bordes suaves, espacio amplio y pocas sombras.
- CTA primer nivel en pill con gradiente; botones secundarios con borde azul/violeta.
- Inputs modernos, iconografía lineal y secciones oscuras con navy.
- Animaciones sutiles con Framer Motion: fade/translate, stagger, hover, microinteracciones y scroll reveals. No exagerar.
- Mantener “premium but warm” y evitar un aspecto médico excesivamente frío.
- No inventar nuevas paletas, fuentes o estilos sin una razón explícita.
- Todo color y fuente debe estar centralizado en variables globales y tokens reutilizables.

# AXESSIA — Arquitectura del Proyecto

## Instrucción para esta etapa

En este paso NO comenzar a desarrollar la web ni el sistema. No crear páginas, vistas, secciones, dashboards, formularios ni componentes visuales o funcionales.

El objetivo de esta tarea es únicamente crear/guardar esta base de arquitectura del proyecto para orientar el desarrollo futuro. No implementar todavía las funcionalidades descritas más abajo; se mencionan solamente para que la arquitectura futura las contemple.

No generar código adicional salvo el estrictamente necesario para registrar/configurar esta base de arquitectura si el entorno lo requiere. Esperar instrucciones posteriores antes de construir cualquier vista, sección, componente, modelo de datos o funcionalidad.

Este proyecto incluye dos áreas dentro de una misma aplicación Next.js:

- Web pública: dominio principal.
- Sistema privado: disponible bajo /app.

Ejemplo:

```
axessia.cl/
axessia.cl/app
```

Actualmente el sistema será básico, pero debe construirse con buenas bases para crecer posteriormente hacia nuevos módulos, automatizaciones, CRM, reportes e integraciones sin tener que rehacer la arquitectura.

## Principio de arquitectura

Utilizar Next.js full-stack dentro de un único proyecto.

Priorizar:

Simplicidad + Escalabilidad + Rendimiento + Bajo costo operativo + Código mantenible

No crear microservicios, APIs independientes o arquitecturas complejas mientras no exista una necesidad real.

Separar claramente dentro del proyecto:

```
Web pública
Sistema /app
Componentes reutilizables
Lógica de negocio
Acceso a datos
Autenticación
Servicios
Tipos y validaciones
```

La lógica debe quedar modular para poder agregar nuevas funcionalidades en el futuro.

## Rendimiento y costos

El proyecto será desplegado principalmente en Vercel, por lo que debe diseñarse para minimizar ejecuciones, transferencia de datos y consultas innecesarias.

Aplicar siempre estas reglas:

- Evitar consultas repetidas a base de datos.
- Consultar únicamente los campos necesarios.
- Evitar SELECT * o equivalentes.
- Evitar múltiples consultas cuando una sola consulta optimizada pueda resolverlo.
- Utilizar paginación en listados grandes.
- No cargar información que el usuario todavía no necesita.
- Priorizar Server Components cuando no se necesite interactividad del cliente.
- Utilizar Client Components solamente cuando sean necesarios.
- Evitar useEffect para obtener datos que puedan cargarse desde servidor.
- Evitar polling constante salvo que sea realmente necesario.
- Utilizar caché cuando la información lo permita.
- Reutilizar resultados y evitar solicitudes duplicadas.
- Mantener bundles del cliente pequeños.
- Lazy load para componentes o recursos pesados cuando corresponda.
- Optimizar imágenes utilizando las herramientas de Next.js.
- No instalar dependencias innecesarias.

La optimización nunca debe eliminar ni limitar funcionalidades necesarias.

## Base de datos

Centralizar el acceso a base de datos mediante una capa claramente definida.

Los componentes visuales no deben contener lógica compleja de base de datos.

Mantener separación:

```
UI
↓
Acciones / Servicios
↓
Lógica de negocio
↓
Base de datos
```

Diseñar las relaciones y modelos pensando en crecimiento futuro, pero implementar solamente lo necesario para la versión actual.

Crear índices cuando sean necesarios para búsquedas frecuentes.

Evitar duplicar información innecesariamente.

## Sistema /app

El sistema debe estar preparado desde el inicio para manejar:

- autenticación
- usuarios
- roles
- clientes
- solicitudes
- estados
- documentos
- cotizaciones
- historial de actividad

No implementar módulos futuros hasta que sean solicitados.

Preparar la arquitectura para poder incorporar posteriormente:

```
CRM
Automatizaciones
Notificaciones
Reportes
Indicadores
Integraciones
Nuevos roles y permisos
```

## Reutilización

Antes de crear un nuevo componente, función, hook, servicio o utilidad:

1. Revisar si ya existe algo reutilizable.
2. Extender lo existente cuando sea razonable.
3. Evitar duplicar código.
4. Mantener componentes pequeños y con responsabilidades claras.

## Uso de IA y tokens

Cuando trabajes sobre este proyecto:

- Lee únicamente los archivos necesarios para la tarea.
- No analices todo el repositorio si no es necesario.
- No regeneres archivos completos por pequeños cambios.
- Modifica solamente las partes necesarias.
- Evita explicaciones largas después de realizar cambios.
- No repitas información que ya exista en los Skills.
- Consulta primero los Skills del proyecto antes de tomar decisiones de arquitectura o diseño.

## Regla principal

Construir solamente lo necesario para la etapa actual, pero hacerlo de manera que mañana pueda crecer.

En la etapa actual, “lo necesario” significa únicamente dejar definida esta base como Skill. No iniciar implementación funcional ni visual hasta recibir una instrucción explícita.

No sobrearquitecturar.
No duplicar.
No realizar consultas innecesarias.
No aumentar costos sin beneficio real.
No sacrificar funcionalidad por optimización.

Cada nueva implementación debe buscar el mejor equilibrio entre:

funcionalidad + rendimiento + mantenibilidad + escalabilidad + costo.

# AXESSIA — SKILL DE DESARROLLO Y CALIDAD DE CÓDIGO

IMPORTANTE:
En esta etapa únicamente crea y guarda este Skill.
NO crear páginas, vistas, secciones, componentes ni funcionalidades todavía.
Esperar instrucciones explícitas para comenzar el desarrollo.

OBJETIVO

Mantener todo el código de AXESSIA simple, consistente, reutilizable,
escalable y optimizado, evitando sobrearquitectura y código innecesario.

STACK BASE

- Next.js
- TypeScript
- Tailwind CSS
- Motion para animaciones
- Next.js Full-Stack
- Vercel como plataforma principal de despliegue

REGLAS DE DESARROLLO

1. Utilizar TypeScript correctamente.
   Evitar `any` salvo que exista una razón justificada.

2. Priorizar Server Components.
   Utilizar `"use client"` únicamente cuando el componente realmente
   necesite estado, eventos, APIs del navegador o interactividad del cliente.

3. No duplicar código.
   Antes de crear componentes, funciones, tipos, helpers o servicios,
   revisar si existe algo reutilizable.

4. Mantener componentes pequeños y con una responsabilidad clara.

5. Separar UI, lógica de negocio y acceso a datos.

6. No instalar librerías si Next.js, React, Tailwind o las dependencias
   existentes ya permiten resolver correctamente el problema.

7. Utilizar los tokens, colores, tipografías y estilos definidos
   en el Skill visual de AXESSIA.
   No escribir colores de marca repetidamente de forma manual.

8. Utilizar Motion para las animaciones e interacciones definidas
   por el sistema visual.

9. Mantener responsive desde el inicio:
   mobile, tablet y desktop.

10. Mantener accesibilidad básica:
    HTML semántico, labels, alt, estados focus y navegación adecuada.

RENDIMIENTO

- Evitar JavaScript innecesario en cliente.
- Evitar renders innecesarios.
- Evitar consultas y peticiones duplicadas.
- No cargar datos que la vista no necesita.
- Utilizar carga diferida cuando tenga sentido.
- Optimizar imágenes y recursos.
- Mantener dependencias y bundles pequeños.

ESTRUCTURA

Usar nombres claros y consistentes.

Ejemplos:

components/
features/
lib/
services/
types/
utils/

No crear carpetas o abstracciones simplemente para anticipar
necesidades futuras.

Crear una nueva capa solamente cuando exista una necesidad real.

SEGURIDAD

Nunca exponer:
- secretos
- API keys
- credenciales
- conexiones de base de datos
- información privada

Mantener operaciones sensibles exclusivamente del lado servidor.

VARIABLES DE ENTORNO

Centralizar configuraciones sensibles mediante variables de entorno
y nunca incluir secretos directamente en el código.

REGLA PARA LA IA

Antes de modificar código:

1. Revisar los Skills relevantes.
2. Leer solamente los archivos necesarios.
3. Entender la implementación existente.
4. Reutilizar antes de crear.
5. Modificar únicamente lo necesario.
6. No refactorizar código que no esté relacionado con la tarea.
7. No crear funcionalidades que no hayan sido solicitadas.
8. No anticipar módulos futuros mediante código innecesario.

Después de realizar una tarea, responder de forma breve indicando
qué se modificó y cualquier decisión importante.

PRINCIPIO GENERAL

Primero simplicidad.

Después abstracción cuando realmente sea necesaria.

Cada decisión debe buscar:

CALIDAD + SIMPLICIDAD + RENDIMIENTO + BAJO COSTO + ESCALABILIDAD.

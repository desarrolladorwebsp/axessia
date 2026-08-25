# AXESSIA — SKILL DE OPTIMIZACIÓN Y EXPERIENCIA DE CARGA

## Objetivo
Mantener el sistema AXESSIA con máxima eficiencia de recursos, bajo consumo de datos y BD, 
mientras se proporciona una excelente experiencia visual durante todas las operaciones de carga.

## Principios de Optimización de Datos

### 1. Consultas a Base de Datos
- **Consultar solo lo necesario**: Cada endpoint debe seleccionar únicamente los campos y relaciones requeridos
  - Usar `select` en Prisma en lugar de traer modelos completos
  - Ejemplo: `{ select: { id: true, name: true, email: true } }` en lugar de traer todas las columnas
- **Evitar N+1 queries**: Usar `include` y relaciones en una sola consulta, no iterativas
- **Limitar resultados**: Implementar paginación en todos los listados
  - Límites recomendados: 10-20 registros por página en tablas, 5-8 en listados
- **Índices**: Crear índices en campos frecuentemente filtrados (status, customerId, email, etc.)
- **Evitar consultas duplicadas**:
  - Cachear datos en el cliente cuando sea seguro
  - Reutilizar resultados en componentes relacionados
  - No refetch al navegar entre vistas del mismo módulo

### 2. Server vs Client Components
- **Prioridad en Server Components**:
  - Todas las páginas deben ser Server Components por defecto
  - Obtener datos directamente en el servidor
  - Renderizar listas y tablas en servidor
- **Client Components solo cuando sea necesario**:
  - Interactividad del usuario (formularios, botones, modales)
  - Manejo de estado local
  - Event listeners
- **Patrón recomendado**:
  ```
  Servidor: Obtiene datos → Página Server Component
           ↓
  Servidor: Renderiza estructura base + Skeletons
           ↓
  Cliente: <ClientComponent data={data} /> para interactividad
  ```

### 3. Lazy Loading y Paginación
- **Implementar en**: Tablas, listas de usuarios, cotizaciones, solicitudes
- **Paginación**:
  - Parámetro URL: `?page=1&limit=10`
  - API debe retornar: `{ data, pagination: { total, page, limit, pages } }`
- **Lazy Load de detalles**: Cargar información adicional solo cuando usuario hace click
- **Imágenes**: Usar Next.js Image con lazy loading automático

### 4. Caché y Reutilización
- **React Query / SWR**: No está en dependencias aún; usar fetch + estado local
- **Evitar refetch**:
  - Si datos no cambiaron, no refetch al navegar
  - Usar `useCallback` para funciones stables en dependencias
- **Revalidación**: Usar `revalidatePath()` en Server Actions cuando sea necesario

## Experiencia Visual Durante Cargas

### 1. Estados de Cada Vista
Toda vista que dependa de datos debe contemplar:
- ✅ **Loading**: Esqueleto que representa la estructura real
- ✅ **Contenido**: Datos cargados correctamente
- ✅ **Sin resultados**: Mensaje claro cuando no hay datos
- ✅ **Error**: Mensaje de error con opción de reintentar

### 2. Skeletons
- **No usar spinners genéricos**: Mostrar esqueleto de la estructura real
- **Ejemplos**:
  - Tabla: Filas con altura igual a las reales, sin contenido
  - Cards: Rectángulos representando títulos, descripciones, números
  - Listas: Líneas con altura variable simulando textos reales
- **Implementación**:
  - Usar Tailwind CSS con `animate-pulse` para efecto sutil
  - Colores: `bg-[var(--background)]` o `bg-gray-200` sobre fondo blanco
  - Altura/ancho: Coincidir con contenido real
- **Componentes reutilizables**: `<SkeletonTable />`, `<SkeletonCard />`, etc.

### 3. Transiciones con Motion
- **Smooth fade**: Skeleton → Contenido real
  ```
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
  ```
- **Stagger para múltiples elementos**: `staggerChildren: 0.05`
- **Cambio de páginas**: Fade suave sin retraso
- **Nunca bloquear**: Si data está lista, mostrar inmediatamente. Las animaciones acompañan, no ralentizan.

### 4. Indicadores de Estado
- **Loading**: Pequeño loader o esqueleto contextual
- **Procesando**: Badge o icono de reloj
- **Error**: Ícono rojo + texto claro + botón reintentar
- **Vacío**: Ícono descriptivo + mensaje amable

## Implementación por Módulo

### Sistema `/app` (Privado)
- ✅ **Dashboard**: 
  - Cargar resumen desde servidor
  - Skeletons de cards mientras carga
  - No cargar métricas hasta que se soliciten
  
- ✅ **Cotizaciones** (`/app/quotes`):
  - GET con paginación: `?page=1&limit=10`
  - Skeleton de tabla mientras carga
  - Filtros sin refetch si no cambian datos
  
- ✅ **Usuarios** (`/app/usuarios`):
  - GET con paginación: `?page=1&limit=15`
  - Skeleton de tabla mientras carga
  - Búsqueda debounced (no por cada keystroke)
  
- ✅ **Crear Usuarios** (`/app/usuarios/crear`):
  - Form optimizado sin peticiones previas innecesarias
  - Loading state en botón durante submit
  - Validaciones cliente antes de servidor

### Web Pública
- ✅ **Inicio**: Hero sin datos, carga rápido
- ✅ **Solicitar Cotización**: Form simple, petición única
- ✅ **Seguimiento** (`/app`): Lazy load de solicitudes si existieran

## Patrones de Código

### Server Component con Datos
```typescript
// app/app/quotes/page.tsx
export default async function QuotesPage({ searchParams }: Props) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const quotes = await getQuotes(page, 10); // Consulta optimizada
  
  return <QuotesContent initialQuotes={quotes} />;
}

// Componente cliente para interactividad
function QuotesContent({ initialQuotes }: Props) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <>
      {isLoading ? <SkeletonTable /> : <Table data={quotes} />}
    </>
  );
}
```

### Paginación Correcta
```typescript
// API
export async function GET(request: NextRequest) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.model.findMany({ skip, take: limit, select: { id, name, email } }),
    prisma.model.count(),
  ]);

  return NextResponse.json({
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
```

### Estados Visuales
```typescript
function DataComponent() {
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'empty'>('loading');

  if (state === 'loading') return <Skeleton />;
  if (state === 'error') return <ErrorState onRetry={retry} />;
  if (state === 'empty') return <EmptyState />;
  
  return <Content />;
}
```

## Herramientas Disponibles
- **Next.js 16+**: Server Components, Image optimization, dynamic imports
- **Prisma**: Select, include, optimización de queries
- **Framer Motion**: Transiciones suaves y stagger
- **Tailwind CSS v4**: Skeletons con `animate-pulse`
- **Lucide React**: Iconos para estados

## Checklist para Nuevas Vistas

- [ ] ¿Consulta solo campos necesarios en Prisma?
- [ ] ¿Implementó paginación si es listado?
- [ ] ¿Tiene estado de Loading con Skeleton?
- [ ] ¿Tiene estado de Error con reintentar?
- [ ] ¿Tiene estado Empty cuando no hay datos?
- [ ] ¿Evita N+1 queries?
- [ ] ¿Utiliza Server Components para obtener datos?
- [ ] ¿Tiene transiciones suaves con Motion?
- [ ] ¿No ralentiza artificialmente las animaciones?
- [ ] ¿Evita consultas innecesarias?

## Regla Principal
**RENDIMIENTO + BAJO CONSUMO + BUENA UX**

Priorizar siempre una solución simple, eficiente y rápida antes de añadir complejidad.

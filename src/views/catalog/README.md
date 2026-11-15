# CAT05 — Catálogo FD30

Una grilla con las 13 fichas, sin agrupación por disponibilidad. Título y bajada EN/ES en catalogText.ts; descripciones breves de consulta en catalogSummaries.ts; registro y destinos existentes en catalogModules.ts. El componente no lee datos personales ni amplía permisos. Conserva tokens heredados de THEME01 y estilos propios .mcat. Los detalles técnicos de cada ficha contienen fuentes y requisitos pendientes; nunca un enlace a una función inexistente.

A bordo: Ejercicio, muestras propias, evidencia pública Inspiration4 y Dinámica de tripulación. Tierra (ambos roles): evidencia pública y Dinámica de tripulación, sin enlaces al historial privado. Los destinos de evidencia y muestras se mantienen distintos; no se duplica el acceso general a Fuentes.

## Ajuste pendiente del integrador

En src/demo/Fd30Preview.tsx, rama `page === 'catalog'`, retirar únicamente el `div.fd-page-intro` que contiene `t.personal` y `h1#fd-view-h` con `t.catalog` (actualmente inmediatamente antes de ModuleCatalog). Conservar `<ModuleCatalog perspective="onboard" />`. El componente ya incluye «Catálogo de módulos» y la bajada pedida. Esto elimina el encabezado adicional «Tu espacio personal / Catálogo» que aún monta el host. No se editó el host en CAT05. Revisar el foco de navegación si el integrador elimina fd-view-h. No falta ninguna ruta para los cuatro accesos actuales.

## Pendientes funcionales por ficha

| Ficha | Falta para completar |
|---|---|
| Cardiovascular | Fuente verificada, protocolo y registros personales propios; el pulso sintético de Ejercicio no cubre este dominio. |
| Músculo, hueso y ejercicio | Mediciones y protocolos musculares/óseos; Ejercicio ya tiene su destino. |
| Nutrición e hidratación | Registros de ingesta e hidratación con unidades, cobertura y procedencia. |
| Inmunidad | Analitos y protocolo inmunológico personal; verificar el subconjunto de citoquinas antes de incorporarlo. |
| Visión y cerebro | Exámenes oculares, instrumentos e imágenes/informes autorizados. |
| Equilibrio y sensoriomotor | Protocolo de pruebas, instrumento y registros por persona y fase. |
| Atención y cognición | Prueba voluntaria validada y contrato de resultados sin veredictos. |
| Dinámica de tripulación | Cobertura de plan fuera de FD30 si se autoriza; no inferir convivencia, asistencia o cohesión. |
| EVA | Plan y protocolo de preparación, datos de traje/ambiente y permisos. |
| Microbios e higiene | Muestras ambientales con lugar, método, fecha y resultados verificados. |
| Lanzamiento y aterrizaje | Fuente de cargas del vehículo, fases y tiempos; asociación personal si corresponde. |
| Operaciones independientes | Contrato de edición autónoma, trazas y gestión de enlace; FD30 conserva consulta local. |
| Atención médica autónoma | Dispositivo, protocolo clínico, autoridad y consentimiento validados. |

Estas necesidades no incorporan propuestas MED02 como funciones aprobadas ni crean datos nuevos.

## Verificación

`npm test -- src/views/catalog/catalog.test.ts`: 8 pruebas aprobadas. `npm run check:i18n` y `git diff --check`: aprobados. Browser matrix: `PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs FD30_BASE_URL=http://127.0.0.1:5197/ node src/views/catalog/catalog.browser.mjs`. Chrome: 12 combinaciones EN/ES × 1440/390 px × A bordo/Operaciones/Medicina; 13 tarjetas visibles, sin desborde horizontal del Catálogo, enlaces únicos y recorridos reales sin errores de página. Se revisaron capturas de escritorio EN y móvil ES; el título extra del host permanece pendiente del ajuste indicado arriba.

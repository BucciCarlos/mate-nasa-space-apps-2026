# MATE-GND02 — Seguimiento de Tierra FD30

La portada `#/demo/fd30/ground` recupera las tres tarjetas con los retratos ilustrados de `e41c5e3`. Toda la tarjeta, incluida la imagen, abre la ficha correspondiente. Debajo quedan el cronograma operativo de 00:00–24:00 UTC y el cursor de misión. La ficha individual y Orbit permanecen en esa ruta: seleccionarlos no cambia el reloj ni la identidad de A bordo. Los bloques rayados y la leyenda identifican planificación; no se confirma asistencia, ejecución o uso de equipo.

Orbit recibe exclusivamente `OperationalCrew[]`, rol, selección local y cursor. Sus dos consultas son predefinidas y se construyen a partir de bloques proyectados, con intervalo UTC e ID consultable. La consulta de equipos filtra reservas vigentes/próximas por contexto; mantenimiento usa el ID compartido canónico y sus integrantes. No recibe sesión personal, chat, resultados ni la proyección de sueño.

La corrección de GND02 autoriza expresamente una proyección médica para los tres perfiles operativos. `groundMedicalView` recibe estado y cursor, devuelve `null` a Operaciones y nunca simula un espectador de A bordo ni depende del perfil activo. La ficha de Medicina muestra primero frecuencia cardíaca/SpO₂, sueño y últimos registros de laboratorio/ejercicio; la agenda queda después. Orbit sigue recibiendo exclusivamente planificación operativa.

Fuentes: `demo/wellbeing.ts` para los patrones ilustrativos de pulso y SpO₂; `exerciseSessionView` y la telemetría de ejercicio para el pulso de la sesión de Lucía; `SLEEP_RECORDS` para las noches FD24–FD30; `EXERCISE_RECORDS` y los eventos recibidos para ejercicio; y `state.laboratory` para los hitos de muestras. Todas las filas se filtran por propietario, ocurrencia y recepción; los eventos vinculados requieren sus recibos. No se proyectan chats, notas, check-ins, hidratación ni índices derivados de salud. No se agrega un canal de transmisión médica.

A las 11:00 UTC:

| Persona | Cardíaca / SpO₂ | Sueño | Laboratorio | Ejercicio |
|---|---|---|---|---|
| Lucía | 108 lpm, telemetría de ejercicio **simulada** / 95 %, patrón ilustrativo | FD30, 6 h 25 min; 7/7 noches | Sangre y orina en análisis; sangre FD29 almacenada; sin resultados recibidos | Sesión FD30 en curso, 30 min; última completada FD29, 60 min, 112 W, 72 rpm |
| Tomás | 77 lpm / 99 %; patrones ilustrativos del reloj | FD29, 7 h 10 min; 6/7 noches, sin FD30 | Sin muestras recibidas al cursor | Última completada FD29, 60 min, 182 W, 72 rpm; la reserva FD30 no confirma una sesión |
| Mei | 75 lpm / 97 %; patrones ilustrativos del reloj | FD29, 7 h 25 min; 5/7 noches, sin FD27 ni FD30 | Sin muestras recibidas al cursor | Última completada FD29, 60 min, 137 W, 72 rpm; reserva FD30 13:00–14:00 |

El gráfico de Lucía de GND03 se conserva: seis noches antes de las 06:00 y siete solo cuando ya ocurrió y se recibió su evento de despertar. Tomás y Mei no tienen evento de sueño FD30 y no reciben una noche inventada. Los huecos no son ceros. Los patrones de pulso/SpO₂ se identifican como ilustrativos, sin recepción; un hueco de pulso durante la sesión no se reemplaza con el patrón de reposo. Disponibilidad de resultado de laboratorio no equivale a valores utilizables: este escenario no aporta valores clínicos. Los detalles con IDs, fuentes y recepción se pueden desplegar sin ocupar la primera pantalla.

## Archivos

Todos los archivos de esta tarea están en `src/views/fd30-ops/`:

- Modificados: `GroundOverview.tsx`, `OpsPanel.tsx`, `ops.test.ts`, `CONTRACT.md` y la regresión `perspective.browser.mjs`.
- Nuevos GND02: `GroundPlanTimeline.tsx`, `GroundOrbit.tsx`, `groundTracking.ts`, `groundTrackingText.ts`, `groundTracking.css`, `groundTracking.test.ts`, `groundTracking.browser.mjs` y este documento. La corrección añade `GroundMedicalDashboard.tsx`, `groundMedical.ts`, `groundMedicalText.ts`, `groundMedical.css` y `groundMedical.test.ts`.
- Integrados del trabajo concurrente GND03: `GroundSleepChart.tsx`, `groundSleep.ts`, `groundSleepText.ts`, `groundSleep.css`, `groundSleep.test.ts`.

GND02 no edita `Fd30Preview.tsx`, `FloatingCompanion.tsx`, `fd30.ts`, `Fd30Timebar.tsx`, los avisos ni sus textos/CSS compartidos. Se conservan los cambios concurrentes de ALR01 y HYD02. No se modifica el esquema persistido, los selectores de M1 ni `opsSelectors.ts`.

## Repetir la toma (1440 × 900)

1. Ejecutar `npm run dev -- --host 127.0.0.1 --port 5186 --strictPort` y abrir `http://127.0.0.1:5186/#/demo/fd30/ground`.
2. Elegir ES o EN y tema. Abrir el control flotante de demo, pausar, fijar el cursor en 11:00 UTC y plegar el control. Elegir Equipo médico.
3. Mostrar las tres tarjetas (0–4 s). Seleccionar la imagen de Lucía (4–8 s): frecuencia cardíaca y SpO₂, sueño, laboratorio y ejercicio aparecen completos antes de la agenda.
4. Abrir «Consultar Orbit» (8–12 s). Consultar equipos y después mantenimiento compartido (12–18 s): Lucía/Tomás, 14:00–16:00, `iss:fd30:shared:maintenance`. La referencia destaca el bloque en el cronograma y muestra su detalle.
5. Volver a las tarjetas y abrir Tomás y Mei para comparar su cobertura real. Cambiar a Operaciones elimina el dashboard médico y deja solo planificación. Se conserva el rol al volver a las tarjetas.
6. «Volver a la tripulación» conserva las 11:00. Al cambiar persona con Orbit abierto, su contexto y respuesta se recalculan.

## Validación reproducible

```sh
npm run build
npm run check:i18n
npx vitest run src/views/fd30-ops/ops.test.ts src/views/fd30-ops/groundTracking.test.ts src/views/fd30-ops/groundSleep.test.ts src/views/fd30-ops/groundMedical.test.ts src/state/roles.test.ts src/app/publicRoutes.test.ts src/demo/companionNotices.test.ts src/demo/hydration.test.ts

PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs BROWSER_BIN=/ruta/a/chrome FD30_BASE_URL=http://127.0.0.1:5186/ node src/views/fd30-ops/groundTracking.browser.mjs
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs BROWSER_BIN=/ruta/a/chrome FD30_BASE_URL=http://127.0.0.1:5186/ node src/views/fd30-ops/perspective.browser.mjs
```

`groundTracking.browser.mjs` comprueba EN/ES y claro/oscuro a 1440 × 900, más ES claro y EN oscuro a 390 × 900 emulado. Verifica ambas consultas, referencias, contexto de persona/tripulación, ambos roles, datos de cada perfil, las coordenadas de los cuatro bloques médicos antes de la agenda, alcance médico y rewind, cursor pausado, ausencia de contenido médico en Operaciones/Orbit y de chats/notas en todas las proyecciones y regreso al chat/borrador de A bordo. `GND02_SCREENSHOTS=/tmp/mate-gnd02-health-screens` habilita capturas. No instala dependencias ni modifica fixtures de la aplicación.

## Resultado medido de la corrección

Verificación local a 1440 × 900, EN/ES y claro/oscuro: las cuatro áreas de salud de los tres perfiles se ven sin desplazamiento. El borde inferior más bajo fue 839,5 px para Lucía; la planificación comienza a 887,4 px. Tomás/Mei terminan sus bloques médicos a 809,8 px y su planificación comienza a 857,8 px. Se verificó `scrollTop = 0`, ausencia de desbordamiento del contenedor principal, clic en cada retrato y regreso con rol/cursor intactos. En teléfonos emulados de 390 × 900 la salud se apila verticalmente y no hay desbordamiento horizontal; los detalles de sueño abiertos tienen su propio desplazamiento horizontal. Las reservas y el cronograma conservan sus rótulos de planificación.

Controles finales: build (con advertencia no bloqueante de tamaño del bundle), `check:i18n`, 62 pruebas pertinentes en ocho archivos y `git diff --check` pasan. La regresión principal cubre seis configuraciones de navegador; los resultados y capturas de esta ejecución se guardaron fuera del repo en `/tmp/mate-gnd02-health-browser.json` y `/tmp/mate-gnd02-health-screens/`.

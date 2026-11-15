# MATE-HIST02 — Ejercicio FD01–FD30

Base verificada: rama `buccicarlos/mate-imp02-fd30`, HEAD `6c6dff86ab370efcf3e3069ab4629997a93770d4`, árbol limpio al comenzar. Implementación acotada a Ejercicio e integración con sus resúmenes existentes. Sin commit, push ni despliegue.

En el control final aparecieron cambios concurrentes ajenos en `src/views/catalog/catalogModules.ts` (11:40:41) y `catalog.test.ts` (11:41:16), posteriores al build probado (11:40:13, hora local). Se preservaron íntegros: HIST02 no escribió esos archivos. Los resultados de build/tests/navegador corresponden al snapshot anterior a esos cambios del Catálogo; no constituyen una validación de ese trabajo paralelo.

## Resultado

- Historial ficticio propio: Lucía 21, Tomás 13 y Mei 16 sesiones históricas. Últimos 7 días (FD24–FD30) por defecto, acceso a FD01–FD30 sin mover el reloj. Tipo, equipo, duración, medias disponibles, tendencia, detalle con foco y tabla accesible. Días y métricas ausentes no se rellenan con ceros.
- Cobertura histórica declarada solo para Ejercicio, con reservas y descansos explícitos. No se atribuye cobertura completa a la agenda FD29 heredada ni se implementa una agenda histórica. Lucía FD24: cinta, métricas No aplica. FD17: potencia Sin registro. Mei FD26: reserva Sin registro; FD27: Sin actividad.
- Tomás: mediana de cuatro sesiones comparables FD23/25/27/29 = 181 W frente a 200 W de sus nueve anteriores, diferencia −19 W / −9,5%, hasta FD29. Referencia calculada antes del filtro 7/30; muestra sus IDs/fechas/valores. Solo mismo dueño, ergómetro/protocolo, tiempos y cobertura válidos. La cinta reservada en FD30 queda fuera y no confirma asistencia.
- Lucía: panel en vivo y hueco de telemetría conservados. Al recibir el fin, se deriva una sola sesión histórica del mismo ID/inicio/fin/telemetría. 60 min transcurridos, 61 marcas inclusivas y 57/60 intervalos con potencia; las medias excluyen ausencias y extremo final. Retroceder oculta lo futuro y avanzar recupera sin avisos repetidos. Los nueve eventos DAY01 y sus IDs no cambian; no se agregan eventos FD30 a Tomás/Mei.
- Ejercicio, Hoy y nuevas respuestas de Mate consultan `exerciseHistory`. Las respuestas de Ejercicio posteriores al cursor se ocultan al retroceder y vuelven con su texto original. Fuentes y evidencia documenta procedencia sin filas privadas. Operaciones/Comandante conservan su proyección operacional; Medicina permanece sin resúmenes. D-9 y Catálogo no se modifican.

## Cómo probar manualmente

1. Ejecutar `npm run dev`, abrir la URL local y pausar el reloj. En Demo, elegir Lucía, Tomás o Mei y abrir Ejercicio desde navegación, Hoy o Mate. A 05:55 se ven las sesiones históricas propias, sin sesión FD30 terminada.
2. Alternar Últimos 7 días / FD01–FD30. El reloj no cambia. Seleccionar días, abrir el detalle, la tabla y las sesiones usadas en la comparación. Ver los ejemplos de ausencias indicados arriba. En Tomás, confirmar 181 frente a 200 W y −9,5% en ambos rangos; FD30 sigue siendo reserva.
3. Con Lucía, recorrer 10:29 → 10:41 → 10:54 → 11:30. Antes no hay panel en vivo; durante hay lecturas y tiempo transcurrido; a 10:54 hay hueco, no arrastre de valor; al cerrar aparece una sola sesión FD30 en el historial. Volver a 00:00 y avanzar: no quedan valores futuros ni se repiten avisos. Preguntar por Ejercicio a Mate y comprobar que coincide con Hoy; rebobinar antes de la respuesta y luego recuperarla.
4. Con Tomás y Mei, avanzar hasta 23:59: no se confirma sesión FD30. Alternar A bordo/Tierra y ambos roles; abrir una ficha de tripulación en Medicina: sin resúmenes. Volver conserva identidad, reloj y borrador privado.
5. Cambiar EN/ES y repetir en escritorio y pantalla de 390 px. Gráfico y tabla desplazan internamente, sin desbordamiento de página. Fuentes → historial ficticio de Ejercicio muestra documentación idéntica en ambas perspectivas, sin registros individuales.

## Validación ejecutada

- `npm run build`: correcto, TypeScript y Vite. Se repitió tras los ajustes finales de unidad/foco/validación temporal.
- `npm test`: resultado final **22 archivos / 201 pruebas correctas**, incluidas ocho nuevas HIST02 y las regresiones existentes. La primera ejecución detectó una expectativa nueva de mediana 180 frente al valor real 181; se corrigieron la expectativa y la documentación, sin alterar los valores del fixture.
- `npm run check:i18n`: correcto, sin literales visibles en TSX.
- Navegador: `src/demo/history/exercise.browser.mjs`, sobre el build local, Playwright externo y Chrome del sistema, EN/ES × 1440/390 px × tres perfiles. Matriz completa correcta, sin errores de página ni desbordamiento global. Incluye rangos, foco, ausencias, comparación, sesión antes/durante/después, retroceso, avisos, Hoy/Mate, privacidad y Fuentes. El primer intento encontró una precondición faltante del test (abrir la ficha para ver el estado vacío de Medicina); corregida y matriz repetida correctamente.
- Capturas de tendencia, detalle y comparación en `/tmp/mate-hist02-shots/`; se inspeccionaron visualmente comparación ES móvil, detalle ES móvil y tendencia EN escritorio. Son evidencia local temporal, no recursos del producto.
- Comprobación final de espacios: `git diff --check` y revisión de los archivos nuevos, sin errores.

Para repetir el navegador, servir el build con `npm run preview -- --host 127.0.0.1 --port 5173` y ejecutar `node src/demo/history/exercise.browser.mjs`. Si Playwright o Chromium no están instalados en el proyecto, indicar `PLAYWRIGHT_MODULE` (ruta al módulo externo) y `BROWSER_BIN` (ejecutable). `FD30_BASE_URL` cambia la URL; `FD30_SCREENSHOTS` habilita capturas. No se añadieron dependencias de aplicación.

## Límites y pendientes reales

- No hay equivalencia definida entre `demo-live-60.1` de Lucía y el histórico `demo-steady-60.1`: su sesión FD30 se muestra, pero permanece en otra cohorte, sin base suficiente. PLAN03 §7.7 proponía incluirla; HIST02 documenta esta diferencia y evita inventar equivalencias. Tampoco se equiparan cinta y ergómetro. PLAN03 §5.2 sí respalda el ergómetro histórico de Tomás; la cobertura limitada se declara explícitamente porque `fd30-plan.2` contiene solo FD30.
- Advertencia de build por bundle principal de aproximadamente 951 kB (208 kB gzip), superior al umbral de 500 kB. El build termina correctamente; dividir el bundle no forma parte de HIST02.
- No quedaron comprobaciones funcionales solicitadas sin ejecutar. Las medias son ficción/cálculos del escenario, no mediciones ni conclusiones clínicas. D-9, historiales de otros módulos y Catálogo siguen fuera de este alcance.

Contratos actualizados: specs 02 §12.12, 03 §8.14, 04 §11.9 y 05 §10.14. PLAN03 y AUD04 permanecen internos y sin modificar.

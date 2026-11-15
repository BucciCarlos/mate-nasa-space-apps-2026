# MATE-SLEEP03 — Puntaje de demostración

Implementación autorizada por la tarea SLEEP03 del plan SLEEP02 con los ajustes de SLEEP-AUD01. Fórmula propia de M.A.T.E., sin atribución a NASA ni Samsung, sin interpretación clínica, fases ni conexión a sensor.

## Contrato y procedencia

`src/demo/history/sleepScore.ts` contiene los parámetros versionados `mate-sleep-score.1`: referencia 480 min, banda de eficiencia 70–95 %. Son decisiones del escenario, no metas médicas. La duración también afecta al término de eficiencia; 70/30 son máximos nominales y no pesos efectivos independientes.

- `r = min(durationMinutes / 480, 1)`.
- `eff = 100 × durationMinutes / timeInBedMinutes`.
- `D = 70 × r`.
- `E = 30 × clamp((eff − 70) / 25, 0, 1) × r`.
- `raw = D + E`. Se muestra `floor(raw + 0.5)` (mitad hacia arriba).
- `delta = raw(FDn) − raw(FDn−1)`. Si `abs(delta) < 1`, se muestra «Sin cambio apreciable», sin flecha. En otro caso, flecha y magnitud redondeada mitad hacia arriba con signo. No se restan puntajes ya redondeados.

Los despertares no participan. No hay conteos inventados; el detalle dice «Sin registro de despertares». No se usan horarios de Agenda para ninguna entrada.

## Extensión parcial de datos ficticios

Se preserva íntegro `SLEEP_RECORDS` (85 registros y sus duraciones). `BED_EPISODES` es un suplemento enlazado por ID estable, perfil y FD; agrega únicamente seis episodios explícitos, FD28 y FD29 de cada perfil. Fuente `mate-scenario-bed`, versión `fd30-bed.1`, clase `fictional_fd30`, unidad `min`; cada episodio declara la fuente de duración con la que es compatible.

| Perfil | FD28 duración / cama (min) | FD29 duración / cama (min) |
|---|---|---|
| Lucía | 405 / 460 | 395 / 470 |
| Tomás | 435 / 480 | 430 / 490 |
| Mei | 443 / 470 | 445 / 465 |

Los extremos de cada episodio están escritos como timestamps UTC en el suplemento; los minutos de cama se derivan de esos extremos, sin almacenar una eficiencia duplicada. Ocurrencia y recepción coinciden con el fin de episodio del registro base. Solo se puntúa si ambas fuentes tienen datos compatibles y recibidos; se valida fin, orden temporal, unidad y `TIB ≥ TST`.

Lucía FD30 conserva 385 min (6:25) sin TIB y muestra «Puntaje no disponible · falta tiempo en cama registrado». El resto de las noches no enriquecidas sigue sin puntaje. No se convierten ausencias en cero.

## Integración y permisos

Solo el detalle de Sueño monta `SleepScore`. El selector usa `sleepHistory(..., 'all')` y sus permisos existentes de dueño activo, ocurrencia, recepción y evento de despertar. El cálculo se hace al leer y nunca escribe estado ni genera eventos.

La comparación busca exactamente FD n−1 en todo el historial recibido: no depende del rango 7/30, no salta huecos ni noches sin puntaje y no cruza versiones incompatibles. Un cambio de cursor vuelve a calcular elegibilidad; no elimina registros. Tierra no recibe este historial.

Se actualizaron de forma acotada `SleepDetail.tsx`, `SleepProvenance.tsx` y la frase de cálculo público de `sleepText.ts`. Textos del chat y Hoy, sus componentes y el audio no se editaron. La fórmula nueva usa archivos propios. Los cambios previos de CHAT02 y los archivos concurrentes de voz se conservaron.

## Verificación

`src/demo/history/sleepScore.test.ts` cubre los casos A/A2/A3/B/B2 y C/C2 de la auditoría con el gate nuevo, límites de eficiencia, cero válido, valores inválidos, mitad hacia arriba, comparaciones sin redondeo, umbral inclusivo de 1 punto, seis episodios, duraciones preservadas, ausencia de TIB, cursor antes/después de recepción, acceso por perfil y Tierra, fuente/unidad incompatibles y presentación EN/ES. Las pruebas HIST01 existentes verifican que el historial compartido con Hoy/chat conserva su comportamiento.

Resultados: suite completa de 264 pruebas aprobada; después se agregó y aprobó el caso de comparación FD24/FD23 fuera del rango visible (16 pruebas de SLEEP03 aprobadas). TypeScript, i18n, build y `git diff --check` aprobados. El build avisa de un chunk mayor a 500 kB. La presentación EN/ES se verificó por renderizado en pruebas; no se realizó revisión visual en navegador durante esta tarea.

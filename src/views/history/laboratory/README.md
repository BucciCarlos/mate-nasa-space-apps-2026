# HIST03 — integración de Laboratorio

INT01: montaje conectado en `Fd30Preview.tsx` con `time={missionTime}`. El acceso desde Hoy conserva la muestra resaltada; el historial prioriza esa muestra frente al último elemento de la lista. La nota de preparación que sigue documenta el contrato original de HIST03.

Implementación preparada en `LaboratoryDetail`: prop opcional `time` con el cursor compartido. Sin ella se conserva el detalle existente; el historial nuevo no se activa todavía. No se crea un reloj propio.

Cambio mínimo para el integrador en `Fd30Preview.tsx` (no editado por HIST03): agregar `time={missionTime}` a la llamada existente `<LaboratoryDetail state={state} owner={owner} highlight={showing} />`. No requiere rutas ni acciones nuevas. Hoy/Mate no se modificaron.

La proyección `laboratoryHistory` usa exclusivamente `state.laboratory` y los recibos procesados; permisos/dueño → ocurrencia y recepción de cada hito → ventana. No existe otra copia persistida de las muestras. El detalle recibe únicamente los hitos visibles, incluso con un snapshot futuro. Selección y rango son estado visual por dueño. Los antecedentes visibles de una muestra se conservan en detalle cuando un hito suyo cae dentro de la ventana.

Registros autorizados: sangre FD29 de Lucía almacenada sin análisis/resultado; sangre y orina FD30 y sus etapas existentes. Tomás/Mei no reciben copias ni nuevos hitos. El plan FD30 sin recolección de ellos permite «Sin actividad planificada» solo ese día. FD01–FD29 sin registros tienen cobertura desconocida («Sin registro»), no treinta días de descanso inferidos. D-4 no autoriza inventar recolecciones. No hay valores utilizables, rangos clínicos ni comparación numérica; Inspiration4 no se adapta a un perfil. Tierra conserva sus permisos.

Prueba manual tras integrar: pausar en 05:55, abrir Laboratorio, alternar 7/30 sin mover reloj; seleccionar detalle de sangre FD29. Avanzar 09:15/09:20/09:25/09:30/11:45/11:50: las muestras y sus etapas aparecen por recepción; resultado disponible sigue sin valores. Volver a 00:00 y avanzar: mismos IDs y ningún aviso nuevo. Repetir con Tomás/Mei: sin muestras propias, sin copia de Lucía. Repetir EN/ES y móvil. El historial tiene controles de 44 px, filas adaptables y foco explícito al abrir detalle.

Pruebas focalizadas: `npm exec vitest run src/demo/history/laboratory.test.ts src/demo/laboratory.test.ts`.

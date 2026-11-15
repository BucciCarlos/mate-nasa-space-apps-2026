# Monitoreo en vuelo

Con las dependencias instaladas, ejecutar `npm run dev` y abrir la URL local que imprime Vite. Para una demostración desde el build, ejecutar `npm run build` y luego `npm run preview`.

Abrir `#/` en **Mi bienestar en misión** y elegir Lucía Ferraro o Tomás Ibarra. Desde la portada se puede hacer un check-in voluntario, registrar o descartar una actividad y consultar el diario privado. La bandeja familiar contiene un mensaje ficticio por perfil con horas simuladas de envío y recepción.

Abrir **Monitoreo en vuelo** para consultar pulso en reposo (bpm), duración de sueño (h) y tiempo de reacción PVT (ms) del escenario simulado de la EEI. La línea de base usa tres muestras prevuelo del mismo perfil y registra las fechas en la vista. La diferencia es última muestra disponible menos media prevuelo. Las mediciones faltantes quedan vacías en la serie.

## Recorrido de demostración

1. En A Bordo, elegir un perfil, seleccionar una métrica y abrir las tablas de vuelo y línea de base. Usar **Explicame mis métricas en vuelo** para pedir una explicación guiada de la métrica seleccionada.
2. Personalizar a Mate, cambiar la etapa y registrar una pausa voluntaria o una nota privada. Cambiar de perfil y volver para ver la separación de historiales y preferencias.
3. Ir a **Tierra → EEI → Enlace** como operador y cortar el enlace. En A Bordo, solicitar revisión de una métrica, revisar el contenido y autorizar el envío. La solicitud queda en cola y el monitoreo sigue disponible. Una recarga conserva la sesión.
4. En Tierra, el enlace muestra el estado de la solicitud. Como médico, abrir **Tripulación** y verificar que aún no aparezca en revisiones recibidas. Volver al rol operador, reactivar el enlace y esperar la entrega. Cambiar al rol médico para ver la medición compartida. **Comandante** muestra la agenda operativa y el estado del enlace.
5. Abrir **Evidencia de investigación humana** en Monitoreo. Consultar las fuentes y seleccionar un analito. El build local incluye los datos y las fichas. Los enlaces a NASA son referencias externas opcionales.

Los perfiles y los permisos son parte de una simulación local por pestaña. El almacenamiento no está diseñado para datos clínicos reales. Las explicaciones usan plantillas, y los registros personales y conversaciones quedan fuera del envío. Los umbrales clínicos y protocolos automatizados propuestos en los documentos del equipo quedan fuera de las reglas activas.

## Evidencia y procedencia

| Estudio | Publicación | Variables incluidas | Cobertura y límites |
| --- | --- | --- | --- |
| [NASA OSDR OSD-575 / LSDS-8](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | 2024-05-14 | Glucosa y calcio séricos, mg/dL | Inspiration4, cuatro códigos de participante, tres mediciones prevuelo y cuatro posvuelo. El panel seleccionado carece de muestras en vuelo. |
| [NASA OSDR OSD-569 / LSDS-7](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) | 2024-05-14 | Hemoglobina (g/dL), eritrocitos (10⁶/µL) y leucocitos (10³/µL) | Misma tripulación y cobertura. El subconjunto usa el CSV SUBMITTED para preservar la unidad original de hemoglobina. |
| [HERA C1/C2, Nasrini et al.](https://doi.org/10.3389/fphys.2020.00394) | 2020-04-28 | PVT y otras pruebas de cognición | Resultado publicado de un análogo terrestre de confinamiento y restricción de sueño. Referencia metodológica. |
| [NASA Life Sciences Portal · Standard Measures, NTRS 20230014025](https://ntrs.nasa.gov/citations/20230014025) | Identificador público del programa ISS | Actigrafía, cognición, química sanguínea y medidas cardiovasculares, entre otras | Referencia de diseño. Las series individuales están sujetas a los procedimientos de acceso de NASA. |

Los datos son cortesía del NASA Open Science Data Repository. Los CSV SUBMITTED del panel metabólico y el hemograma se descargaron sin autenticación el 2026-11-14. La ficha OSD-575 declara CC0-1.0. La preparación del subconjunto de ambos archivos públicos se basa en los [términos públicos de OSDR](https://science.nasa.gov/reference/osdr-help-terms-and-conditions/) y la [política de datos BPS](https://science.nasa.gov/wp-content/uploads/2024/09/bps-scientific-data-management-policy-revision-a.pdf), consultados el 2026-11-14, con atribución y enlaces a cada estudio. Los archivos originales se mantienen fuera del repositorio. El JSON preserva sus nombres, URLs, SHA-256 y fecha de consulta.

Regenerar desde los dos CSV originales con `python scripts/import-i4-labs.py <carpeta-csv> <AAAA-MM-DD>`. El importador comprueba unidades y las 140 combinaciones esperadas, y conserva los faltantes como tales. La interfaz muestra los valores publicados por código, sin sexo, rangos de referencia ni promedios entre participantes.

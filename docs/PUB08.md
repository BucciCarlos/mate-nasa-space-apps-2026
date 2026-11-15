# PUB08 — Estado integrado FD30, paleta Océano

Un solo corte del producto: cambios de Carlos en Inicio, figura de Bienestar y círculos de pulso/SpO2 simulados; audios de Sueño y Ejercicio de los tres perfiles; tema Claro por defecto e interruptor Claro/Oscuro; Catálogo de 13 fichas en una grilla y CAT06 (título único y foco). Se conserva el JPEG del encabezado. No se inicia CAT07 ni se modifica M1.

Los audios de Sueño/Ejercicio son los clips individuales aprobados. docs/PUB08-voice-inventory.json registra texto, voz, duración, volumen y hash de los doce archivos. No se publican montajes completos, modelos ni informes privados. Su elegibilidad depende del perfil y de los registros recibidos al consultar. Fuera de esos casos, el chat conserva solo texto. Las preguntas y respuestas se reproducen en inglés opcionalmente; el texto escrito mantiene EN/ES. La navegación guiada utiliza el destino exacto del diálogo.

Bienestar es una demostración, no una interpretación clínica. Sus datos y fuente se describen en la sección MATE-WELL01 de spec 04. El índice requiere una noche con puntaje y muestra su FD, además del componente de ejercicio cuando existe. Pulso de reposo y SpO2 son patrones ficticios; no se presentan como sensores conectados ni amplían permisos de Tierra.

MED02 se incluye como documentación de propuestas, trazabilidad pendiente y preguntas para revisión. No aprueba umbrales, alertas, tratamientos ni nuevos accesos. Las tablas médicas no se convierten en lógica del producto.

El Catálogo conserva accesos reales por perspectiva y documentación dentro de cada ficha. CAT06 elimina el encabezado externo duplicado; al entrar por teclado el foco llega a mcat-h. El README de CAT05 describe el ajuste como pendiente en su informe histórico; en este corte ya está aplicado.

Verificación de publicación: build, suite completa, check:i18n y git diff --cached --check en el árbol exacto del índice. Pasada breve de navegador por Inicio, tema en A bordo/Tierra, Catálogo y diálogo de Mate. Los resultados efectivos se reportan al publicar; la existencia de otros scripts de navegador no implica que se hayan ejecutado en PUB08.

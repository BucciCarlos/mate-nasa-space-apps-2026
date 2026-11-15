# PUB07 — Corte FD30 publicado

Incluye SLEEP03, el logo suministrado montado en el encabezado de A bordo y Tierra, CHAT02 y los recorridos de Laboratorio con voz para Lucía, Tomás y Mei. No incorpora propuestas clínicas de MED02. El puntaje se explica en SLEEP03.md y no amplía permisos de Tierra.

## Laboratorio y audio

Lucía conserva sus dos muestras FD30 y la muestra guardada FD29. Los pares compatibles para audio son espera/espera, análisis/análisis, resultado sangre/análisis orina y resultado/resultado. Tomás tiene una muestra propia de sangre, toma 13:15, análisis 13:20 y disponibilidad de resultado 15:45 sin valores. Mei tiene una muestra propia de orina, toma 16:15 y análisis 16:20; no llega resultado en el guion. Su audio está disponible en esos estados respectivos. No se copian muestras ni se infiere una toma desde una reserva. El día contiene 14 eventos, nueve de Lucía y cinco propios de Tomás/Mei.

El botón reproduce pregunta y luego resumen, siempre en inglés; la respuesta escrita completa sigue en EN/ES. No hay micrófono ni reproducción automática. Cerrar el chat, cambiar perfil/perspectiva/página o retroceder antes de la consulta cancela. Una falla conserva el texto. En modo guiado solo un diálogo terminado correctamente que nombre una única muestra con resultado puede abrir ese detalle una vez. El diálogo de ambos resultados no elige muestra. CHAT02 oculta las respuestas de Laboratorio posteriores al cursor y las restaura sin duplicarlas al avanzar.

## Procedencia de los nueve MP3

Audio original generado localmente mediante Piper 1.8.0, modelos en_US-ljspeech-medium (Lucía/Mei), en_US-bryce-medium (Tomás) y en_US-norman-medium (Mate). Las fichas originales de los modelos están en https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US. Las fichas declaran sus datasets como dominio público; no se extiende esa declaración a todo el software o modelos. Piper declara GPL-3.0-or-later; no se distribuye Piper ni sus modelos en este corte.

Configuración: pausa de 0,2 s entre frases; compresión FFmpeg `acompressor=threshold=0.04:ratio=6:attack=5:release=80:makeup=1`; loudnorm de dos pasadas I=-16 LUFS, TP=-1 dBTP, LRA=11, linear=true. MP3 mono, 44100 Hz, 192 kb/s. `voice-inventory.json` registra texto, voz, duración, sonoridad final, pico verdadero y SHA-256 de cada audio integrado. Las medidas corresponden a los archivos codificados y no implican coincidencia exacta con el objetivo. La evaluación perceptual humana de pronunciación y naturalidad sigue pendiente.

## Cómo revisar

Abrir `#/demo/fd30`, consultar Laboratorio como Lucía antes de 09:15, a 09:30, 11:45 y 11:50; Tomás a 15:45 y Mei a 16:20. Probar reproducción, detener, cambio de perfil y retroceso antes de la consulta; texto y audio deben corresponder al dueño. Tierra conserva únicamente plan operativo neutro. En Sueño seleccionar FD28/FD29 para el puntaje propio y FD30 para el estado sin TIB; alternar 7/30 no modifica el reloj. Revisar el logo en ambas perspectivas, en EN/ES y móvil/escritorio.

Pruebas focalizadas: sleepScore.test.ts, laboratoryCrew.test.ts, fd30Chat.test.ts, dialoguePlayer.test.ts y labDialogue.test.ts. La matriz de navegador de voz está en src/demo/voice/labDialogue.browser.mjs. El build puede advertir un chunk mayor de 500 kB; no es un error de compilación.

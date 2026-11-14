# M.A.T.E. — Specifications / Especificaciones

**M.A.T.E. — Medical & Astronaut Therapeutic Environment** · Team Sora · NASA Space Apps Challenge 2026
Challenge / Desafío: *Create Health Monitoring Software for Astronauts on Space Missions*

Status / Estado: **draft for team review / borrador para revisión del equipo** · 2026-11-14

The specs are written once, in English (canonical version). The product itself is fully bilingual (English/Spanish). This index is bilingual.
Las specs se escriben una sola vez, en inglés (versión canónica). El producto es íntegramente bilingüe (inglés/español). Este índice es bilingüe.

## Documents / Documentos

| # | File / Archivo | English | Español |
|---|---|---|---|
| 01 | [01-product-scope.md](01-product-scope.md) | Purpose, principles, roles, mission profiles, module catalog (interactive / evidence / concept), what is required, an enhancement or future, challenge alignment. | Propósito, principios, roles, perfiles de misión, catálogo de módulos (interactivo / evidencia / concepto), qué es requisito, mejora o futuro, alineación con el desafío. |
| 02 | [02-architecture-contracts.md](02-architecture-contracts.md) | Stack, folder structure, state, routes, persistence, mission isolation, event engine, simulated link, companion contract, sharing and role filters, link-down and missing-data behaviour. | Stack, estructura, estado, rutas, persistencia, aislamiento de misiones, motor de eventos, enlace simulado, contrato del compañero, permisos por rol y comportamiento sin enlace o sin datos. |
| 03 | [03-experience-i18n.md](03-experience-i18n.md) | Screens for Ground and Onboard, companion UX, visual identity, provenance badges, accessibility, bilingual architecture, glossary and reference strings. | Pantallas de Tierra y A Bordo, experiencia del compañero, identidad visual, insignias de procedencia, accesibilidad, arquitectura bilingüe, glosario y textos de referencia. |
| 04 | [04-data-traceability.md](04-data-traceability.md) | Data policy, provenance model, source registry, dataset contracts (Inspiration4 labs, cabin CO₂, radiation), simulated scenario, attribution. | Política de datos, modelo de procedencia, registro de fuentes, contratos de datasets (laboratorio Inspiration4, CO₂ de cabina, radiación), escenario simulado, atribución. |
| 05 | [05-acceptance-build-order.md](05-acceptance-build-order.md) | Milestones, requirements, acceptance scripts observable in English and Spanish, unit tests, build order, definition of done. | Hitos, requisitos, guiones de aceptación observables en inglés y español, pruebas unitarias, orden de construcción, definición de terminado. |

## Labels / Etiquetas

| Label | English | Español |
|---|---|---|
| **MUST** | Requirement of the milestone where it is listed. | Requisito del hito donde figura. |
| **SHOULD** | Enhancement: built only after all MUST items of its milestone pass. | Mejora: se construye solo después de cumplir todos los MUST de su hito. |
| **FUTURE** | Documented vision; not implemented in the prototype. | Visión documentada; no se implementa en el prototipo. |
| Interactive / Evidence / Concept | Module tiers, defined in 01 §5. | Niveles de módulo, definidos en 01 §5. |

## Milestones / Hitos

| Milestone | English | Español |
|---|---|---|
| M1 | Integration journey: an ISS schedule change travels Ground → crew → Ground, in both languages. It is the first integration milestone, not the limit of the app. | Recorrido de integración: un cambio de agenda de la EEI viaja Tierra → tripulación → Tierra, en ambos idiomas. Es el primer hito de integración, no el límite de la app. |
| M2 | Evidence layer: real, traceable NASA and partner content. | Capa de evidencia: contenido real y trazable de NASA y agencias asociadas. |
| M3 | Breadth and continuity: module catalog, body map, three-phase journey, companion customization, in-app guide. | Amplitud y continuidad: catálogo de módulos, mapa corporal, viaje en tres fases, personalización del compañero, guía en la app. |
| M4 | Enhancements (SHOULD). | Mejoras (SHOULD). |

## License / Licencia

Original M.A.T.E. material is licensed under the Apache License 2.0 ([LICENSE](../../LICENSE)). Third-party data and materials keep their own terms (04 §9).
El material original de M.A.T.E. se publica bajo la Apache License 2.0 ([LICENSE](../../LICENSE)). Los datos y materiales de terceros conservan sus propias condiciones (04 §9).

## Reading order / Orden de lectura

- Implementers / Implementación: 01 → 02 → 05 (M1) → 03 → 04 (§1, §2, §8 for M1).
- Reviewers / Revisión: 01 → 04 → 05.

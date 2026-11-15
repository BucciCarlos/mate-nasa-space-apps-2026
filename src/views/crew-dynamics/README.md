# MATE-CAT04 — MOD-CREW

INT01: integrado en la aplicación mediante `#/onboard/personal/m/crew` y `#/demo/fd30/ground/m/crew`, accesibles desde MOD-CREW en el Catálogo. A bordo valida el perfil activo; ambos roles de Tierra reciben solo el mismo plan operacional. El ejemplo independiente se conserva. Las notas siguientes describen la entrega aislada original.

Vista aislada EN/ES. No agrega rutas, capacidades del Catálogo ni cambios de specs.

## Ejemplo renderizable

Desde `mate/`:

```sh
npm run dev -- --host 127.0.0.1 --port 5184
```

Abrir `http://127.0.0.1:5184/examples/crew-dynamics.html`. Incluye controles de idioma, perfil a bordo y roles de Tierra. Es una entrada independiente de desarrollo; no forma parte del build principal ni monta una ruta de la aplicación.

## Integración mínima (responsabilidad del integrador)

1. Importar `CrewDynamics` desde `src/views/crew-dynamics/CrewDynamics.tsx` en el contenedor FD30, dentro del `I18nProvider` existente. El componente importa sus estilos.
2. A bordo: `<CrewDynamics state={state} viewer={{ perspective: 'onboard', owner: state.activeCrewId }} />`.
3. Tierra: `<CrewDynamics state={state} viewer={{ perspective: 'ground', role }} />`, con el `GroundRole` existente. Ambos roles reciben la misma tabla del plan.
4. Agregar las uniones de página y las rutas `#/onboard/personal/m/crew` y `#/demo/fd30/ground/m/crew` en los archivos del integrador. Después, habilitar los enlaces correspondientes en MOD-CREW en el registro del Catálogo. Esos archivos no se editaron en CAT04.

No necesita dispatch, reloj, suscripciones, persistencia ni permisos nuevos. El estado entrante se usa para validar el perfil a bordo; Tierra reutiliza el control de rol de `groundView`. La tabla usa `operationalPlan` para todos los perfiles y elimina títulos, equipos y tipos de actividad salvo la distinción de descanso.

## Semántica y cobertura

- **Actividad compartida**: el mismo ID canónico de bloque aparece para varios participantes en `operationalPlan` (la proyección de `planFor` conserva ese ID). No se deduce de títulos, clases o franjas iguales.
- **Programados al mismo tiempo**: hay otro bloque independiente que se solapa. Un tercer tripulante puede coincidir con una actividad compartida sin pertenecer a ella; se distinguen ambas relaciones.
- **Descanso planificado**: solo bloques de descanso del plan. No lee historiales de sueño, eventos, telemetría ni solicitudes privadas.
- Intervalos semiabiertos, unión por persona; un solapamiento triple se cuenta una vez. Los huecos no se consideran actividad en soledad. Los totales de descanso pueden cruzarse con los de coincidencia: no se suman como categorías excluyentes.
- Las ventanas FD24–FD30 y FD01–FD30 solo disponen de FD30. Los días restantes figuran sin plan; no se inventa una serie histórica. No son ventanas relativas al reloj de simulación.
- Los bloques que cruzan medianoche se recortan a 00:00–24:00 de FD30 para calcular minutos. Se informa la continuación del descanso nocturno.
- Mi parte filtra las filas y los totales del perfil activo, conservando sus relaciones con la tabla de misión. No cambia el reloj ni escribe estado.

## Verificación

```sh
npm test -- src/views/crew-dynamics/crewDynamics.test.ts
npm test
npm run check:i18n
npm run typecheck
```

Prueba de navegador opcional con Playwright instalado en el entorno, contra el servidor anterior:

```sh
node src/views/crew-dynamics/crewDynamics.browser.mjs
```

Acepta `PLAYWRIGHT_MODULE` (ruta al módulo), `BROWSER_BIN`, `CREW_BASE_URL` y `CREW_SCREENSHOTS` (directorio existente). Verifica EN/ES a 1440 y 390 px, rangos, tres perfiles, filtro propio, igualdad Ops/Med, ausencia de escrituras en storage y desborde contenido de las tablas.

Verificado durante CAT04: 220 pruebas en 24 archivos; las 8 pruebas nuevas también se repitieron tras el ajuste visual. `check:i18n`, `typecheck`, `build` y `git diff --check` pasaron. Navegador: cuatro combinaciones EN/ES × 1440/390 px, con capturas revisadas. La compilación principal emite una advertencia de tamaño de chunk; no incluye esta entrada independiente. Sin commit, push ni despliegue.

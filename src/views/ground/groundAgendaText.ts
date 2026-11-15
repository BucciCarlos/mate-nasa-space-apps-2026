import type { Locale } from '../../state/types';

// Strings used only by the Ground agenda views (wide timeline and crew cards). Kept here, not in the global catalogs.
export const groundAgendaText = {
  en: {
    views: 'Agenda view',
    viewTimeline: 'Timeline',
    viewCards: 'Cards',
    timelineRegion: 'Agenda timeline. Scrolls horizontally; crew names stay on the left.',
    scrollHint: 'Scroll sideways to see all 48 hours.',
    centerNow: 'Center on now',
    nowAt: (p: { time: string }) => `Now · ${p.time}`,
    nowOutside: 'Now is outside this period',
    cardsLabel: 'Agenda by crew member',
    selectBlock: (p: { title: string }) => `Select ${p.title} to advance it`,
    closeDetail: 'Close details',
    noBlocks: 'No blocks in this period',
    duration: 'Duration',
  },
  es: {
    views: 'Vista de la agenda',
    viewTimeline: 'Línea de tiempo',
    viewCards: 'Tarjetas',
    timelineRegion: 'Línea de tiempo de la agenda. Se desplaza en horizontal; los nombres quedan a la izquierda.',
    scrollHint: 'Desplazá hacia los costados para ver las 48 horas.',
    centerNow: 'Centrar en ahora',
    nowAt: (p: { time: string }) => `Ahora · ${p.time}`,
    nowOutside: 'Ahora queda fuera de este período',
    cardsLabel: 'Agenda por astronauta',
    selectBlock: (p: { title: string }) => `Seleccionar ${p.title} para adelantarla`,
    closeDetail: 'Cerrar detalle',
    noBlocks: 'No hay bloques en este período',
    duration: 'Duración',
  },
} satisfies Record<Locale, unknown>;

export const useGroundAgendaText = (locale: Locale) => groundAgendaText[locale];

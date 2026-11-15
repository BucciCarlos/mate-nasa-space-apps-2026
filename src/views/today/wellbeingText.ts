import type { Locale } from '../../state/types';

/** MATE-WELL01 texts. Stress and health are deliberately absent from the index. */
export const WELLBEING_TEXT: Record<Locale, {
  figure: string; sleep: string; exercise: string; noData: string; partsNote: string;
  heartNow: string; unit: string; spo2Label: string; spo2Unit: string; figureHint: string;
}> = {
  en: {
    figure: 'Wellbeing (sleep and exercise, demonstration)', sleep: 'Sleep score', exercise: 'Exercise: session completed',
    noData: 'Not enough data for the index yet', partsNote: 'Index out of 100. Stress and health are not included.',
    heartNow: 'Heart rate', unit: 'bpm', spo2Label: 'SpO2', spo2Unit: '%',
    figureHint: 'Filled in proportion to the wellbeing index.',
  },
  es: {
    figure: 'Bienestar (sueño y ejercicio, demostración)', sleep: 'Puntaje de sueño', exercise: 'Ejercicio: sesión completada',
    noData: 'Aún no hay datos suficientes para el índice', partsNote: 'Índice sobre 100. No incluye estrés ni salud.',
    heartNow: 'Frecuencia cardíaca', unit: 'lpm', spo2Label: 'SpO2', spo2Unit: '%',
    figureHint: 'Relleno proporcional al índice de bienestar.',
  },
};

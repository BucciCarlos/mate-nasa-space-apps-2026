import type { Locale } from '../../state/types';

/** MATE-HYD02 texts. A count of simulated detections: no volume, target, hydration status or real camera. */
export const HYDRATION_TEXT: Record<Locale, {
  label: string; count: (n: number) => string; info: string; infoClose: string; help: string;
  noticeReminder: string; noticeConfirm: string; noticeAction: string;
}> = {
  en: {
    label: 'Water intakes', count: n => `Water intakes logged today: ${n} (simulated)`,
    info: 'More about water intakes', infoClose: 'Close help',
    help: 'This demo simulates cameras automatically detecting your water intakes. It uses no real camera and never accesses yours. The glass rises with each simulated intake logged up to the chosen mission time. It does not measure volume, set a target or show your hydration status.',
    noticeReminder: 'I haven’t logged a water intake in a while. Shall we take a break for some water?',
    noticeConfirm: 'Well done! I logged your water intake.',
    noticeAction: 'Open Home',
  },
  es: {
    label: 'Tomas de agua', count: n => `Tomas de agua registradas hoy: ${n} (simulado)`,
    info: 'Más información sobre las tomas de agua', infoClose: 'Cerrar ayuda',
    help: 'Esta demostración simula que unas cámaras detectan automáticamente tus tomas de agua. No usa ninguna cámara real ni accede a la tuya. El vaso sube con cada toma simulada registrada hasta la hora de misión elegida. No mide volumen, no es una meta ni muestra tu estado de hidratación.',
    noticeReminder: 'Hace rato que no registro una toma de agua. ¿Hacemos una pausa para tomar agua?',
    noticeConfirm: '¡Bien hecho! Registré tu toma de agua',
    noticeAction: 'Abrir Inicio',
  },
};

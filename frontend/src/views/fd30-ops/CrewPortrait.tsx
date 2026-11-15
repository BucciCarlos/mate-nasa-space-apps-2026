import { useLocale } from '../../i18n/I18nProvider';
import { CREW } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { OPS_TEXT } from './opsText';

/** Original code-native illustrations of fictional people, with no real astronaut likeness or insignia. */
export function CrewPortrait({ owner }: { owner: CrewId }) {
  const t = OPS_TEXT[useLocale()], person = CREW.find(c => c.id === owner)!;
  const lucia = owner === 'iss:crew-lf', mei = owner === 'iss:crew-mo';
  const skin = lucia ? '#d8a77c' : mei ? '#d9b28f' : '#bc8f6e';
  return <svg className="ops-portrait" viewBox="0 0 180 180" role="img" aria-label={t.portrait(person.name)}>
    <circle cx="90" cy="90" r="88" fill={lucia ? '#dedcce' : mei ? '#d8e3dd' : '#e5ded0'} />
    <path d="M23 173Q27 124 70 123H110Q153 124 157 173" fill={lucia ? '#5e777a' : mei ? '#777b8a' : '#637563'} />
    <path d="M72 111V131Q90 150 108 131V111" fill={skin} stroke="#4d4843" strokeWidth="2" />
    <path d="M51 69Q49 24 91 24Q135 25 132 73L126 109H56Z" fill={lucia ? '#5b4034' : '#343d3b'} />
    <ellipse cx="90" cy="82" rx="36" ry="43" fill={skin} stroke="#4d4843" strokeWidth="2" />
    {mei ? <path d="M53 70Q51 28 90 29Q131 29 128 66L103 48Q87 66 53 70M128 67Q143 85 126 114" fill="#343d3b" />
      : lucia ? <path d="M50 75Q44 31 87 27Q127 23 133 62Q98 62 81 43Q70 68 50 75M53 67L48 113L61 125L57 78" fill="#5b4034" />
        : <path d="M52 64Q52 27 91 27Q128 28 131 63L112 53L72 49Z" fill="#343d3b" />}
    <path d="M69 76H78M102 76H111" stroke="#49453e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="74" cy="83" r="2.4" fill="#303b38" /><circle cx="107" cy="83" r="2.4" fill="#303b38" />
    <path d="M88 83L85 96H92M78 106Q90 112 102 105" fill="none" stroke="#745a4a" strokeWidth="2" strokeLinecap="round" />
    <path d="M59 132L76 148L90 139L104 148L122 132M90 140V174" fill="none" stroke="#e4e9df" strokeWidth="2" />
  </svg>;
}

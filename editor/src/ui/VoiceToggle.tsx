import { useEffect, useState } from 'react';
import { playSound } from '../audio/player';
import { autoSound, storyVoice, ttsInstalled } from '../audio/tts';
import { t } from '../i18n';
import { useStore } from '../store';

/** Réglage « Voix automatique » d'une histoire (désactivé par défaut). */
export function VoiceToggle() {
  const on = useStore((s) => s.project.autoVoice);
  const storyLang = useStore((s) => s.project.lang);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [trying, setTrying] = useState(false);
  useEffect(() => { ttsInstalled().then(setInstalled); }, [storyLang]);
  const voice = storyVoice();

  const tryVoice = async () => {
    setTrying(true);
    try { playSound(await autoSound(storyLang === 'en' ? 'Hello! I am the voice that will read your story.' : 'Bonjour ! Je suis la voix qui va lire ton histoire.'), 'voice-test'); }
    finally { setTrying(false); }
  };

  return (
    <div className={'voice-card' + (on ? ' on' : '')}>
      <label className="check voice-switch">
        <input type="checkbox" checked={on} disabled={!installed}
          onChange={(e) => useStore.getState().update((p) => { p.autoVoice = e.target.checked; })} />
        🗣️ {t('Voix automatique')}
      </label>
      <p className="hint">
        {installed === false
          ? t('La voix n’est pas installée sur cet ordinateur.')
          : t('Une voix de synthèse lit à voix haute les textes qui n’ont pas encore d’enregistrement : scènes, questions et réponses. Ta propre voix reste toujours prioritaire.')}
      </p>
      {installed && (
        <div className="row">
          <button className="btn" onClick={tryVoice} disabled={trying}>{trying ? t('⏳ Un instant…') : t('▶ Écouter la voix')}</button>
          <span className="hint" title={voice.credit}>{voice.name} {t('(Piper, synthèse vocale libre)')}</span>
        </div>
      )}
    </div>
  );
}

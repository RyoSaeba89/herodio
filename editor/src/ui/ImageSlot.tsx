import { useState } from 'react';
import { addImage, IMAGE_ACCEPT, imageUrl } from '../audio/images';
import { pickFiles } from '../io/files';
import { t } from '../i18n';
import { useStore } from '../store';

/** Choisir une illustration : importer un fichier, prendre une image de la bibliothèque ou glisser-déposer. */
export function ImageSlot({ value, onChange, label = t('Illustration') }: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const media = useStore((s) => s.project.media);
  const images = media.filter((m) => m.category === 'image');
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const [picking, setPicking] = useState(false);

  const importFile = async () => {
    setError('');
    const [f] = await pickFiles(IMAGE_ACCEPT);
    if (!f) return;
    try { onChange((await addImage(f, f.name.replace(/\.\w+$/, ''))).id); } catch (e) { setError((e as Error).message); }
  };

  const onDrop = (e: React.DragEvent) => {
    setOver(false);
    const id = e.dataTransfer.getData('application/herodio-media');
    if (images.some((m) => m.id === id)) { e.preventDefault(); onChange(id); }
  };

  return (
    <div className={'image-slot' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      {value && imageUrl(value) ? <img src={imageUrl(value)} alt={label} /> : <div className="image-empty">🖼️ {t('Pas encore d’image')}</div>}
      <div className="slot-row">
        <button className="btn" onClick={importFile}>📁 {t('Importer')}</button>
        {images.length > 0 && <button className="btn ghost" onClick={() => setPicking(!picking)}>🗂️ {t('Bibliothèque')}</button>}
        {value && <button className="btn ghost" onClick={() => onChange(null)} title={t('Retirer l’image')}>🗑️</button>}
      </div>
      {picking && (
        <div className="image-pick">
          {images.map((m) => (
            <button key={m.id} className={m.id === value ? 'on' : ''} onClick={() => { onChange(m.id); setPicking(false); }} title={m.name}>
              <img src={imageUrl(m.id)} alt={m.name} />
            </button>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

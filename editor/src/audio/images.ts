// Illustrations : import (PNG, JPEG, WebP, SVG…), vignettes, et conversion en JPEG à la taille de l'appareil pour l'export.
import { t } from '../i18n';
import { uid, type Media } from '../model/project';
import { useStore } from '../store';
import { extOf, getBlob, putBlob } from './media';

const urls = new Map<string, string>();

/** URL affichable d'une image du projet (créée une fois, gardée en mémoire). */
export function imageUrl(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  let u = urls.get(id);
  if (!u) {
    const b = getBlob(id);
    if (!b) return undefined;
    u = URL.createObjectURL(b);
    urls.set(id, u);
  }
  return u;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('Image illisible'))); };
    img.src = url;
  });
}

export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg,image/*';

export async function addImage(blob: Blob, name: string): Promise<Media> {
  if (blob.type === '' && /\.svg$/i.test(name)) blob = new Blob([blob], { type: 'image/svg+xml' });
  try { await loadImage(blob); } catch { throw new Error(t('Le fichier « {name} » n’est pas une image que je sais lire.', { name })); }
  const id = uid();
  await putBlob(id, blob);
  const m: Media = { id, name, category: 'image', ext: blob.type === 'image/svg+xml' ? 'svg' : extOf(blob, name), duration: 0 };
  useStore.getState().update((p) => { p.media.push(m); });
  return m;
}

/**
 * Convertit une image en JPEG de base (lisible partout, y compris par le décodeur de l'ESP32).
 * `fit` : l'image tient dans w×h ; `cover` : elle remplit exactement w×h (recadrée au centre).
 */
export async function rasterize(blob: Blob, w: number, h: number, mode: 'fit' | 'cover', quality = 0.85): Promise<Uint8Array> {
  const img = await loadImage(blob);
  const iw = img.naturalWidth || w, ih = img.naturalHeight || h;
  let cw = w, ch = h, sx = 0, sy = 0, sw = iw, sh = ih;
  if (mode === 'fit') {
    const k = Math.min(1, w / iw, h / ih);
    cw = Math.round(iw * k); ch = Math.round(ih * k);
  } else {
    const k = Math.max(w / iw, h / ih);
    sw = w / k; sh = h / k; sx = (iw - sw) / 2; sy = (ih - sh) / 2;
  }
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; // pas de transparence en JPEG
  g.fillRect(0, 0, cw, ch);
  g.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  const out = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error(t('Conversion impossible')))), 'image/jpeg', quality));
  return new Uint8Array(await out.arrayBuffer());
}

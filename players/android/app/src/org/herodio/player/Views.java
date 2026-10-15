package org.herodio.player;

import java.io.File;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;
import android.view.View;

/** Petites vues dessinées à la main (compatibles Android 2.3) : image arrondie, confettis, égaliseur. */
final class Views {
    private Views() {}

    /** Charge une image en la réduisant à peu près à la largeur voulue (économise la mémoire des vieux téléphones). */
    static Bitmap load(File f, int maxWidth) {
        if (f == null || !f.isFile()) return null;
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(f.getAbsolutePath(), o);
            int sample = 1;
            while (o.outWidth / (sample * 2) >= maxWidth) sample *= 2;
            BitmapFactory.Options o2 = new BitmapFactory.Options();
            o2.inSampleSize = sample;
            return BitmapFactory.decodeFile(f.getAbsolutePath(), o2);
        } catch (OutOfMemoryError e) {
            return null;
        }
    }

    /** Image aux coins arrondis, à la largeur de son parent et dans ses proportions. */
    static final class RoundImage extends View {
        private final Bitmap bitmap;
        private final float radius;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF rect = new RectF();
        private final boolean topOnly;

        RoundImage(Context c, Bitmap b, float radius, boolean topOnly) {
            super(c);
            this.bitmap = b;
            this.radius = radius;
            this.topOnly = topOnly;
            paint.setShader(new BitmapShader(b, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        }

        @Override
        protected void onMeasure(int w, int h) {
            int width = MeasureSpec.getSize(w);
            setMeasuredDimension(width, width * bitmap.getHeight() / Math.max(1, bitmap.getWidth()));
        }

        @Override
        protected void onDraw(Canvas canvas) {
            Matrix m = new Matrix();
            float k = (float) getWidth() / bitmap.getWidth();
            m.setScale(k, k);
            paint.getShader().setLocalMatrix(m);
            rect.set(0, 0, getWidth(), getHeight());
            canvas.drawRoundRect(rect, radius, radius, paint);
            if (topOnly) { // coins du bas carrés : la carte continue en dessous
                canvas.drawRect(0, getHeight() - radius, getWidth(), getHeight(), paint);
            }
        }
    }

    /** Confettis (fins heureuses) ou étoiles (fins secrètes) qui tombent pendant quelques secondes. */
    static final class Confetti extends View {
        private static final int[] COLORS = { 0xFFF28A1C, 0xFF14B0A6, 0xFFE64AA0, 0xFF8B5CF6, 0xFF3B7FF5, 0xFF22A559 };
        private final long start = SystemClock.uptimeMillis();
        private final boolean stars;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();

        Confetti(Context c, boolean stars) {
            super(c);
            this.stars = stars;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float age = (SystemClock.uptimeMillis() - start) / 1000f;
            if (age > 5.5f) return;
            float d = getResources().getDisplayMetrics().density;
            int alpha = (int) (Math.min(1f, 5.5f - age) * 255);
            for (int i = 0; i < 60; i++) {
                float x0 = getWidth() * ((i * 0.6180339f) % 1f);
                float fall = (90 + (i * 13.7f) % 140) * d;
                float y = -30 * d + age * fall + ((i * 23) % 120) * d - 120 * d;
                if (y > getHeight()) continue;
                float x = x0 + (float) Math.sin(age * 2 + i) * 30 * d;
                if (stars) {
                    paint.setColor(Color.argb(alpha, 255, 216, 77));
                    star(canvas, x, y, (6 + i % 4 * 2) * d, age * 2 + i);
                } else {
                    paint.setColor((COLORS[i % COLORS.length] & 0x00FFFFFF) | (alpha << 24));
                    canvas.save();
                    canvas.rotate((age * 220 + i * 40) % 360, x, y);
                    canvas.drawRect(x - 6 * d, y - 3 * d, x + 6 * d, y + 3 * d, paint);
                    canvas.restore();
                }
            }
            postInvalidateDelayed(33);
        }

        private void star(Canvas c, float cx, float cy, float r, float rot) {
            path.reset();
            for (int k = 0; k < 10; k++) {
                double a = rot + k * Math.PI / 5;
                float rr = k % 2 == 0 ? r : r * 0.45f;
                float x = cx + (float) Math.cos(a) * rr, y = cy + (float) Math.sin(a) * rr;
                if (k == 0) path.moveTo(x, y); else path.lineTo(x, y);
            }
            path.close();
            c.drawPath(path, paint);
        }
    }

    /** Petit égaliseur animé : le son est en cours de lecture. */
    static final class Equalizer extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        Equalizer(Context c, int color) {
            super(c);
            paint.setColor(color);
        }

        @Override
        protected void onMeasure(int w, int h) {
            float d = getResources().getDisplayMetrics().density;
            setMeasuredDimension((int) (34 * d), (int) (26 * d));
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float d = getResources().getDisplayMetrics().density;
            double t = SystemClock.uptimeMillis() / 1000.0;
            for (int i = 0; i < 4; i++) {
                float h = (6 + (float) Math.abs(Math.sin(t * 7 + i * 1.3)) * 20) * d;
                float x = i * 9 * d;
                canvas.drawRect(x, getHeight() - h, x + 6 * d, getHeight(), paint);
            }
            postInvalidateDelayed(50);
        }
    }
}

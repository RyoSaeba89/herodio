# File formats

*[Version française](format.md)*

Herodio keeps three things clearly apart:

| | File | Contents | Who reads it |
|---|---|---|---|
| Editable project | `my-story.herodio` | `project.json` + original sounds (`media/`) | the editor |
| Playback pack | `my-story.aistory` | `story.json` + `metadata.json` + premixed sounds (`assets/audio/`) | the players |

Both files are ordinary ZIP archives: you can open them with any archive tool.

## Editable project `.herodio`

```
project.json        format "herodio-project", version 1
media/<id>.<ext>    original sounds and images (webm/opus, wav, mp3, ogg… ; png, jpeg, webp, svg…), never modified
```

`project.json` keeps **all** the editing information:

- the position of the blocks;
- the story language (`lang`: `fr` or `en`), which picks the automatic voice; missing in files made before 0.2.1, which are in French;
- the interface level (`decouverte` = beginner, or `avance` = advanced);
- the items (with their icon) and the counters;
- the sound library (name, category, duration, take linked to a block);
- for every sound slot, the **multitrack mix**: tracks (`voix` = voice, `ambiance`, `bruitage` = sound effect), volume, mute or solo, clips (`media`, `start`, `offset`, `duration`, `gain`, `fadeIn`, `fadeOut`) and ducking.

Editing is non-destructive: cutting, trimming or moving only changes the clip windows. The original files stay untouched.

Sounds are always referenced by a **stable identifier**, never by a file path. The reference type is in `editor/src/model/project.ts`.

### Migration

`editor/src/io/projectFile.ts → migrate()` upgrades older files when they are opened. A file from a **newer** version is refused with a clear message. To change the format:

1. increment `PROJECT_VERSION`;
2. add an `if (v < N) { … }` step to `migrate()`;
3. add a test.

## Playback pack `.aistory`

```
story.json              executable story (schema: spec/story.schema.json)
metadata.json           format "herodio-pack", version, title, author, platform, audio format, duration, cover, colour, credits…
assets/audio/001.wav    one file per sound, already mixed: 16-bit mono PCM WAV
assets/images/001.jpg   pictures and cover: baseline (non-progressive) JPEG, at the device's size
```

- `story.json` is **identical for all platforms**. Only the audio changes, depending on the export profile:

  | Platform | Sample rate |
  |---|---|
  | Windows, Android, Raspberry Pi | 44.1 kHz |
  | Android 2.3 | 22.05 kHz |

- Optional fields, ignored by a player that does not know them (the format stays at version 1):
  - `image` on scenes, choices and endings;
  - `cover` and `color` (a "#rrggbb" theme colour) on the story.
- Picture size by device:

  | Platform | Size |
  |---|---|
  | Windows and Android | 1280 × 960 at most |
  | Raspberry Pi | 1024 × 768 |
  | Android 2.3 | 640 × 480 |

- The block identifiers in `story.json` are the editor's. Play traces can therefore be compared from one platform to another.
- Two slots with exactly the same mix share the same file.
- The players refuse any path that would leave the pack (`..`, absolute path): a pack is data coming from elsewhere.
- The story's texts are in its own language; the players translate only their own interface (buttons, endings, messages).

### Why premixed WAV?

- Every target device can play it, including Android 2.3's Stagefright, with no decoder.
- Only one stream at a time: old devices do not have to mix several streams.
- What the child hears in the preview matches the pack exactly, because the same mixing code (`editor/src/audio/mixer.ts`) is used for both.

The downside is bigger files. The editor shows a size estimate before exporting.

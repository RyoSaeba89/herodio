# Installing and using the players

*[Version française](lecteurs.md)*

In Herodio Studio, click **📦 Export my story** and choose the device. Every player reads the same format, described in [format.en.md](format.en.md).

**Language**: on first launch, every player asks for the interface language, French or English. You can change it later with the 🌐 button in the library (PC), the "English" / "Français" button (Android) or the `L` key (console mode). A story keeps its own language: the English versions of the 8 included stories are in the `stories-en-….zip` files of the release.

## Windows

- **Portable version**: `herodio-player.exe` with a `histoires` folder next to it. Copy the `.aistory` files into that folder; nothing is installed on the PC.
- Without a `histoires` folder next to the program, the library is `%USERPROFILE%\Herodio\histoires`.
- The chosen language is kept in `langue.txt`, in the library folder.
- At each step, the text and then each answer are read one after the other, and what is being read is highlighted; as soon as you pick an answer yourself, the chained reading stops. The player never turns the page on its own: you press "Next". The window adapts to its size (everything grows or shrinks with it).
- You can also **drop a `.aistory` file into the window** (it is copied into the library) or pass it as an argument (`herodio-player.exe story.aistory`, or "Open with…").

| Key | Action |
|---|---|
| ↑ ↓ | choose (the highlighted answer is read aloud if it has a sound) |
| Enter / Space | confirm |
| 1 to 9 | pick an answer directly |
| E | listen to the current moment again (also the 🔊 Listen again button) |
| R | start again |
| Esc | back to the library |
| F11 | full screen |

`herodio-player --fullscreen` starts straight in full screen.

Building: `cd players/desktop && cargo build --release` → `target/release/herodio-player.exe`.

## Raspberry Pi (Raspberry Pi OS)

The same program works on a Raspberry Pi, in two ways:

- **with a desktop**: a graphical window, as on Windows;
- **without a desktop** (Raspberry Pi OS Lite, small screen, Pi Zero 2): `herodio-player --console`. The interface is then shown as text in the console, with no browser or graphical server. On first launch, `1` chooses French and `2` English (or ↑ ↓ then Enter); `L` changes the language from the library, `E` replays the current moment.

### Building on the Pi

```sh
sudo apt install -y build-essential pkg-config libasound2-dev
curl https://sh.rustup.rs -sSf | sh            # installs Rust
cd players/desktop && cargo build --release
sudo cp target/release/herodio-player /usr/local/bin/
mkdir -p ~/Herodio/histoires                    # copy the .aistory files here
```

### Cross-compiling from a PC (Ubuntu or WSL)

Faster than on a Pi Zero; the resulting binary works on the Pi 3, 4, 5 and Zero 2 with a 64-bit system.

```sh
sudo dpkg --add-architecture arm64   # then add ports.ubuntu.com for arm64 to the apt sources
sudo apt install -y gcc-aarch64-linux-gnu libasound2-dev:arm64
rustup target add aarch64-unknown-linux-gnu
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc \
       PKG_CONFIG_ALLOW_CROSS=1 PKG_CONFIG_PATH=/usr/lib/aarch64-linux-gnu/pkgconfig
cd players/desktop && cargo build --release --target aarch64-unknown-linux-gnu
# → target/aarch64-unknown-linux-gnu/release/herodio-player, to copy into /usr/local/bin/ on the Pi
```

With `qemu-user` installed, `CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_RUNNER="qemu-aarch64 -L /usr/aarch64-linux-gnu" cargo test --target aarch64-unknown-linux-gnu` runs the tests on the PC.

The library is `~/Herodio/histoires`. You can change it with the `HERODIO_HISTOIRES` variable.

### Starting automatically (optional)

- **Without a desktop**:
  1. adjust `User=` and the folder in `players/desktop/raspberry-pi/herodio.service`;
  2. `sudo cp players/desktop/raspberry-pi/herodio.service /etc/systemd/system/`;
  3. `sudo systemctl disable getty@tty1`;
  4. `sudo systemctl enable --now herodio`.
- **With a desktop**: copy `players/desktop/raspberry-pi/herodio.desktop` into `~/.config/autostart/`.

### GPIO buttons

No code is needed: the Linux kernel turns buttons into keyboard keys. In `/boot/firmware/config.txt`:

```
# "up" button on GPIO 17, "down" on GPIO 27, "confirm" on GPIO 22, "back" on GPIO 23
dtoverlay=gpio-key,gpio=17,keycode=103,label="up"
dtoverlay=gpio-key,gpio=27,keycode=108,label="down"
dtoverlay=gpio-key,gpio=22,keycode=28,label="confirm"
dtoverlay=gpio-key,gpio=23,keycode=1,label="back"
```

Each button is wired between the GPIO pin and ground. The codes used are 103 = ↑, 108 = ↓, 28 = Enter and 1 = Esc.

## Android (2.3 to 14) — a single APK

`players/android/build/herodio.apk` (about 75 KB) installs on an Xperia Play running Android 2.3 as well as on a recent phone. No account and no Google service are needed.

- **Android 4.4 and later**: **"+ Add a story"** button, then choose the `.aistory` file (Downloads, SD card, USB stick…). You can also use "Open with Herodio" from a file manager.
- **Android 2.3 to 4.3**: copy the `.aistory` files into the **`Herodio`** folder at the root of the SD card, then start the app. New files are imported automatically. "Open with" also works.
- **Controls**:
  - touch the screen;
  - D-pad ↑ ↓ and confirm (the Xperia Play cross, the A or X button of a gamepad);
  - Back (the Xperia Play circle);
  - listen again to the current moment: the “♪ Listen again” button at the top right, the Xperia Play triangle (Y on a gamepad) or the E key;
  - digits 1 to 9 on devices with a keyboard.
- The screen stays on while listening, and the page adapts when the device is rotated or the Xperia Play slider is opened.
- **Deleting a story**: long-press the story.
- **Language**: asked on first launch (touch, D-pad or keys 1 and 2), then the "English" / "Français" button at the top of the library.

You need to allow installing apps from unknown sources ("Unknown sources" in the Android 2.3 settings).

Building: `cd players/android && python build.py`. You need a JDK and the Android SDK (`platforms;android-9`, `platforms;android-34` and build-tools 30 or later); Gradle is not needed. The code is compiled against API 9, which guarantees at build time that no newer API is used.

By default, the APK is signed with a test key created on the spot (`herodio-debug.keystore`, never published). To sign a published version, set `HERODIO_KEYSTORE` (path to the key, alias `herodio`) and `HERODIO_KEYSTORE_PASS` before `python build.py`. Every version of the same app must be signed with the same key, otherwise Android refuses the update.

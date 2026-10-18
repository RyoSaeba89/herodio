# Installer et utiliser les lecteurs

*[English version](lecteurs.en.md)*

Dans Herodio Studio, **📦 Exporter mon histoire** puis choisir l'appareil. Chaque lecteur lit le même format, décrit dans [format.md](format.md).

**Langue** : au premier démarrage, chaque lecteur demande la langue de l'interface, français ou anglais. On la change ensuite avec le bouton 🌐 de la bibliothèque (PC), le bouton « English » / « Français » (Android) ou la touche `L` (mode console). Une histoire garde sa propre langue : les versions anglaises des 8 histoires fournies sont dans les fichiers `stories-en-….zip` de la release.

## Windows

- **Version portable** : `herodio-player.exe` accompagné d'un dossier `histoires` placé à côté. Copier les `.aistory` dans ce dossier ; rien n'est installé sur le PC.
- Sans dossier `histoires` à côté du programme, la bibliothèque est `%USERPROFILE%\Herodio\histoires`.
- La langue choisie est gardée dans `langue.txt`, dans le dossier de la bibliothèque.
- À chaque étape, le texte puis chaque réponse sont lus à la suite, et ce qui est lu est surligné ; dès qu'on choisit soi-même une réponse, la lecture enchaînée s'arrête. Le lecteur ne tourne jamais la page tout seul : on appuie sur « Suivant ». À la souris, une réponse se fait entendre quand on s'y arrête un instant, une fois la lecture finie ; passer dessus ne coupe rien. La fenêtre s'adapte à sa taille (tout s'agrandit ou rétrécit avec elle).
- On peut aussi **glisser un `.aistory` dans la fenêtre** (il est copié dans la bibliothèque) ou le passer en argument (`herodio-player.exe histoire.aistory`, ou « Ouvrir avec… »).

| Touche | Action |
|---|---|
| ↑ ↓ | choisir (la réponse surlignée est lue à voix haute si elle a un son) |
| Entrée / Espace | valider |
| 1 à 9 | réponse directe |
| E | réécouter le moment en cours (aussi le bouton 🔊 Réécouter) |
| R | recommencer |
| Échap | revenir à la bibliothèque |
| F11 | plein écran |

`herodio-player --fullscreen` démarre directement en plein écran.

Compilation : `cd players/desktop && cargo build --release` → `target/release/herodio-player.exe`.

## Raspberry Pi (Raspberry Pi OS)

Le même programme fonctionne sur Raspberry Pi, de deux façons :

- **avec bureau** : fenêtre graphique, comme sous Windows ;
- **sans bureau** (Raspberry Pi OS Lite, petit écran, Pi Zero 2) : `herodio-player --console`. L'interface s'affiche alors en mode texte dans la console, sans navigateur ni serveur graphique. Au premier démarrage, `1` choisit le français et `2` l'anglais (ou ↑ ↓ puis Entrée) ; `L` change de langue depuis la bibliothèque, `E` réécoute le moment en cours.

### Compilation sur le Pi

```sh
sudo apt install -y build-essential pkg-config libasound2-dev
curl https://sh.rustup.rs -sSf | sh            # installe Rust
cd players/desktop && cargo build --release
sudo cp target/release/herodio-player /usr/local/bin/
mkdir -p ~/Herodio/histoires                    # copier ici les fichiers .aistory
```

### Compilation croisée depuis un PC (Ubuntu ou WSL)

Plus rapide que sur un Pi Zero ; le binaire obtenu sert aux Pi 3, 4, 5 et Zero 2 en système 64 bits.

```sh
sudo dpkg --add-architecture arm64   # puis ajouter ports.ubuntu.com pour arm64 aux sources apt
sudo apt install -y gcc-aarch64-linux-gnu libasound2-dev:arm64
rustup target add aarch64-unknown-linux-gnu
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc \
       PKG_CONFIG_ALLOW_CROSS=1 PKG_CONFIG_PATH=/usr/lib/aarch64-linux-gnu/pkgconfig
cd players/desktop && cargo build --release --target aarch64-unknown-linux-gnu
# → target/aarch64-unknown-linux-gnu/release/herodio-player, à copier dans /usr/local/bin/ du Pi
```

Avec `qemu-user` installé, `CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_RUNNER="qemu-aarch64 -L /usr/aarch64-linux-gnu" cargo test --target aarch64-unknown-linux-gnu` lance les tests sur PC.

La bibliothèque est `~/Herodio/histoires`. On peut la changer avec la variable `HERODIO_HISTOIRES`.

### Démarrage automatique (facultatif)

- **Sans bureau** :
  1. adapter `User=` et le dossier dans `players/desktop/raspberry-pi/herodio.service` ;
  2. `sudo cp players/desktop/raspberry-pi/herodio.service /etc/systemd/system/` ;
  3. `sudo systemctl disable getty@tty1` ;
  4. `sudo systemctl enable --now herodio`.
- **Avec bureau** : copier `players/desktop/raspberry-pi/herodio.desktop` dans `~/.config/autostart/`.

### Boutons GPIO

Aucune ligne de code n'est nécessaire : le noyau Linux transforme des boutons en touches de clavier. Dans `/boot/firmware/config.txt` :

```
# bouton « haut » sur GPIO 17, « bas » sur GPIO 27, « valider » sur GPIO 22, « retour » sur GPIO 23
dtoverlay=gpio-key,gpio=17,keycode=103,label="haut"
dtoverlay=gpio-key,gpio=27,keycode=108,label="bas"
dtoverlay=gpio-key,gpio=22,keycode=28,label="valider"
dtoverlay=gpio-key,gpio=23,keycode=1,label="retour"
```

Chaque bouton se branche entre la broche GPIO et la masse. Les codes utilisés sont 103 = ↑, 108 = ↓, 28 = Entrée et 1 = Échap.

## Android (de 2.3 à 14) — un seul APK

`players/android/build/herodio.apk` (environ 75 Ko) s'installe aussi bien sur un Xperia Play sous Android 2.3 que sur un téléphone récent. Aucun compte et aucun service Google ne sont nécessaires.

- **Android 4.4 et plus** : bouton **« + Ajouter une histoire »**, puis choisir le `.aistory` (Téléchargements, carte SD, clé USB…). On peut aussi utiliser « Ouvrir avec Herodio » depuis un gestionnaire de fichiers.
- **Android 2.3 à 4.3** : copier les `.aistory` dans le dossier **`Herodio`** à la racine de la carte SD, puis lancer l'application. Les nouveaux fichiers sont importés automatiquement. « Ouvrir avec » fonctionne aussi.
- **Commandes** :
  - toucher l'écran ;
  - D-pad ↑ ↓ et validation (croix du Xperia Play, bouton A ou X d'une manette) ;
  - Retour (rond du Xperia Play) ;
  - réécouter le moment en cours : bouton « ♪ Réécouter » en haut à droite, triangle du Xperia Play (bouton Y d'une manette) ou touche E ;
  - chiffres 1 à 9 sur les appareils qui ont un clavier.
- L'écran reste allumé pendant l'écoute et la page s'adapte quand on tourne l'appareil ou qu'on ouvre le clapet du Xperia Play.
- **Supprimer une histoire** : appui long sur l'histoire.
- **Langue** : demandée au premier lancement (toucher, D-pad ou touches 1 et 2), puis bouton « English » / « Français » en haut de la bibliothèque.

Il faut autoriser l'installation d'applications de sources inconnues (« Sources inconnues » dans les paramètres d'Android 2.3).

Compilation : `cd players/android && python build.py`. Il faut un JDK et le SDK Android (`platforms;android-9`, `platforms;android-34` et build-tools 30 ou plus) ; Gradle n'est pas nécessaire. Le code est compilé contre l'API 9, ce qui garantit à la compilation qu'aucune API plus récente n'est utilisée.

Sans réglage, l'APK est signé avec une clé de test créée sur place (`herodio-debug.keystore`, jamais publiée). Pour signer une version publiée, définir `HERODIO_KEYSTORE` (chemin de la clé, alias `herodio`) et `HERODIO_KEYSTORE_PASS` avant `python build.py`. Toutes les versions d'une même application doivent être signées avec la même clé, sinon Android refuse la mise à jour.

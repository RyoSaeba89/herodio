# Installer et utiliser les lecteurs

Dans Herodio Studio, **📦 Exporter mon histoire** puis choisir l'appareil. Chaque lecteur lit le même format, décrit dans [format.md](format.md).

## Windows

- **Version portable** : `herodio-player.exe` accompagné d'un dossier `histoires` placé à côté. Copier les `.aistory` dans ce dossier ; rien n'est installé sur le PC.
- Sans dossier `histoires` à côté du programme, la bibliothèque est `%USERPROFILE%\Herodio\histoires`.
- On peut aussi **glisser un `.aistory` dans la fenêtre** (il est copié dans la bibliothèque) ou le passer en argument (`herodio-player.exe histoire.aistory`, ou « Ouvrir avec… »).

| Touche | Action |
|---|---|
| ↑ ↓ | choisir (la réponse surlignée est lue à voix haute si elle a un son) |
| Entrée / Espace | valider |
| 1 à 9 | réponse directe |
| R | recommencer |
| Échap | revenir à la bibliothèque |
| F11 | plein écran |

`herodio-player --fullscreen` démarre directement en plein écran.

Compilation : `cd players/desktop && cargo build --release` → `target/release/herodio-player.exe`.

## Raspberry Pi (Raspberry Pi OS)

Le même programme fonctionne sur Raspberry Pi, de deux façons :

- **avec bureau** : fenêtre graphique, comme sous Windows ;
- **sans bureau** (Raspberry Pi OS Lite, petit écran, Pi Zero 2) : `herodio-player --console`. L'interface s'affiche alors en mode texte dans la console, sans navigateur ni serveur graphique.

### Compilation sur le Pi

```sh
sudo apt install -y build-essential pkg-config libasound2-dev
curl https://sh.rustup.rs -sSf | sh            # installe Rust
cd players/desktop && cargo build --release
sudo cp target/release/herodio-player /usr/local/bin/
mkdir -p ~/Herodio/histoires                    # copier ici les fichiers .aistory
```

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

`players/android/build/herodio.apk` (60 Ko) s'installe aussi bien sur un Xperia Play sous Android 2.3 que sur un téléphone récent. Aucun compte et aucun service Google ne sont nécessaires.

- **Android 4.4 et plus** : bouton **« + Ajouter une histoire »**, puis choisir le `.aistory` (Téléchargements, carte SD, clé USB…). On peut aussi utiliser « Ouvrir avec Herodio » depuis un gestionnaire de fichiers.
- **Android 2.3 à 4.3** : copier les `.aistory` dans le dossier **`Herodio`** à la racine de la carte SD, puis lancer l'application. Les nouveaux fichiers sont importés automatiquement. « Ouvrir avec » fonctionne aussi.
- **Commandes** :
  - toucher l'écran ;
  - D-pad ↑ ↓ et validation (croix du Xperia Play, bouton A ou X d'une manette) ;
  - Retour (rond du Xperia Play) ;
  - chiffres 1 à 9 sur les appareils qui ont un clavier.
- **Supprimer une histoire** : appui long sur l'histoire.

Il faut autoriser l'installation d'applications de sources inconnues (« Sources inconnues » dans les paramètres d'Android 2.3).

Compilation : `cd players/android && python build.py`. Il faut un JDK et le SDK Android (`platforms;android-9`, `platforms;android-34` et build-tools 30 ou plus) ; Gradle n'est pas nécessaire. Le code est compilé contre l'API 9, ce qui garantit à la compilation qu'aucune API plus récente n'est utilisée.

## M5Stack Cardputer / Cardputer ADV

1. Exporter pour **Cardputer ADV**, puis décompresser l'archive à la **racine** de la carte microSD (FAT32). Un dossier `herodio/` apparaît, avec un sous-dossier par histoire.
2. Installer le firmware (une seule fois) :

   ```sh
   pip install platformio
   cd players/cardputer
   pio run -t upload      # Cardputer branché en USB-C
   ```

   Si le téléversement ne démarre pas, maintenir le bouton **G0** en branchant le câble.
3. Insérer la carte et allumer. La bibliothèque affiche la couverture de chaque histoire ; on change d'histoire avec `;` `.` et on l'écoute avec `OK`.

| Touche | Action |
|---|---|
| `;` `.` (flèches haut / bas) | choisir (la réponse est lue) |
| `OK` (Entrée) ou le bouton G0 | valider |
| `1`–`9` | réponse directe |
| `Del` | revenir à la bibliothèque |
| `r` | recommencer |
| `i` | afficher le sac |
| `t` | basculer entre l'illustration et le texte |
| `-` `=` | volume |

Le son sort par le haut-parleur, ou par la prise casque sur l'ADV.

# Freebox Ultra Card (FR)

Carte Home Assistant pour Freebox Ultra (V9) : état de la box, débits montant et descendant, températures (carte et CPU), ventilateur, appels manqués, interrupteur Wi-Fi et redémarrage. Style verre, optimisée pour iPhone, iPad et kiosque en mode portrait.

Elle utilise les entités de l'intégration officielle **Freebox** de Home Assistant. Aucune dépendance externe.

## Installation via HACS (dépôt personnalisé)

1. HACS → ⋮ (en haut à droite) → **Dépôts personnalisés**.
2. Collez l'URL de ce dépôt, choisissez la catégorie **Tableau de bord** (Dashboard), puis **Ajouter**.
3. Recherchez « Freebox Ultra Card (FR) » et cliquez sur **Télécharger**.
4. Rechargez le navigateur (Ctrl+Maj+R).

## Utilisation

```yaml
type: custom:freebox-ultra-card
name: Freebox Ultra
device_tracker_entity: device_tracker.freebox_v9_r1
wifi_entity: switch.freebox_v9_r1_wi_fi
download_entity: sensor.freebox_v9_r1_vitesse_de_telechargement
upload_entity: sensor.freebox_v9_r1_vitesse_d_envoi
temperature_entity: sensor.freebox_v9_r1_temperature_1
cpu_entities:
  - sensor.freebox_v9_r1_temperature_cpu_0
  - sensor.freebox_v9_r1_temperature_cpu_1
  - sensor.freebox_v9_r1_temperature_cpu_2
  - sensor.freebox_v9_r1_temperature_cpu_3
fan_entity: sensor.freebox_v9_r1_ventilateur_1
missed_calls_entity: sensor.freebox_v9_r1_appels_manques
mark_calls_button: button.freebox_v9_r1_marquer_les_appels_comme_lus
reboot_button: button.freebox_v9_r1_redemarrer
show_cpu: true
show_calls: true
show_actions: true
temp_warn: 65
temp_alert: 80
scale: 1
image_mode: background
image: /local/image/freebox.webp   # facultatif
```

Les valeurs par défaut correspondent à une Freebox Ultra nommée `freebox_v9_r1` : adaptez-les aux vôtres dans l'éditeur visuel si besoin.

## Options

| Option | Défaut | Description |
|---|---|---|
| `name` | `Freebox Ultra` | Titre de la carte |
| `device_tracker_entity` | `device_tracker.freebox_v9_r1` | État en ligne / hors ligne |
| `wifi_entity` | `switch.freebox_v9_r1_wi_fi` | Interrupteur Wi-Fi (appui = bascule) |
| `download_entity` / `upload_entity` | voir exemple | Débits (convertis automatiquement en kb/s, Mb/s ou Gb/s) |
| `temperature_entity` | `sensor.freebox_v9_r1_temperature_1` | Température carte |
| `cpu_entities` | 4 capteurs CPU | Liste des températures CPU |
| `fan_entity` | `sensor.freebox_v9_r1_ventilateur_1` | Vitesse du ventilateur |
| `missed_calls_entity` | voir exemple | Nombre d'appels manqués |
| `mark_calls_button` | voir exemple | Bouton « Marquer comme lus » |
| `reboot_button` | voir exemple | Bouton de redémarrage (avec confirmation) |
| `show_cpu` / `show_calls` / `show_actions` | `true` | Affiche ou masque les blocs |
| `temp_warn` / `temp_alert` | `65` / `80` | Seuils de couleur des températures (°C) |
| `scale` | `1` | Échelle globale de la carte |
| `image_mode` | `background` | `background` (arrière-plan) ou `banner` (bandeau) |
| `image` | vide | Image facultative |

Un appui sur un débit, une température ou le ventilateur ouvre la fiche de l'entité.

## Licence

MIT. Ajoutez le fichier `LICENSE` correspondant à votre dépôt.

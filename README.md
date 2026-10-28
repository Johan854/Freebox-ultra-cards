# Freebox Ultra Card (FR)

Carte Home Assistant pour Freebox Ultra (V9) : état de la box, état du réseau étendu (WAN), IP externe, temps de fonctionnement, débits montant et descendant, températures (carte et CPU), ventilateur, appels manqués, interrupteur Wi-Fi et redémarrage. Style verre, thème clair/sombre automatique, optimisée pour iPhone, iPad et kiosque en mode portrait.

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
wan_entity: binary_sensor.freebox_server_etat_du_reseau_etendu_wan
external_ip_entity: sensor.freebox_server_ip_externe
uptime_entity: sensor.freebox_server_temps_de_fonctionnement
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
show_network: true
show_cpu: true
show_calls: true
show_actions: true
temp_warn: 65
temp_alert: 80
scale: 1
theme: auto   # auto, light ou dark
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
| `wan_entity` | `binary_sensor.freebox_server_etat_du_reseau_etendu_wan` | État de la connexion Internet (connecté / déconnecté) |
| `external_ip_entity` | `sensor.freebox_server_ip_externe` | IP publique |
| `uptime_entity` | `sensor.freebox_server_temps_de_fonctionnement` | Temps de fonctionnement (secondes ou date de démarrage, formaté en j / h / min) |
| `temperature_entity` | `sensor.freebox_v9_r1_temperature_1` | Température carte |
| `cpu_entities` | 4 capteurs CPU | Liste des températures CPU |
| `fan_entity` | `sensor.freebox_v9_r1_ventilateur_1` | Vitesse du ventilateur |
| `missed_calls_entity` | voir exemple | Nombre d'appels manqués |
| `mark_calls_button` | voir exemple | Bouton « Marquer comme lus » |
| `reboot_button` | voir exemple | Bouton de redémarrage (avec confirmation) |
| `show_network` / `show_cpu` / `show_calls` / `show_actions` | `true` | Affiche ou masque les blocs |
| `temp_warn` / `temp_alert` | `65` / `80` | Seuils de couleur des températures (°C) |
| `scale` | `1` | Échelle globale de la carte |
| `theme` | `auto` | `auto` suit le thème clair/sombre de Home Assistant, ou forcez `light` / `dark` |
| `image_mode` | `background` | `background` (arrière-plan) ou `banner` (bandeau) |
| `image` | vide | Image facultative |

## Apparence : nuance de couleur

Dans l'éditeur visuel, à côté du thème :

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

La nuance teinte le dégradé de fond (et la couleur d'accent quand la carte en a une). Les couleurs d'état (vert, orange, rouge…) ne changent pas.

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème Home Assistant :

```yaml
carte-nuance: "#2f8fd8"
```

Sans cette ligne, `nuance: theme` garde les couleurs d'origine de la carte.

## Historique des versions

- **1.2.0** : nuance de couleur au choix (8 nuances, couleur personnalisée, intensité, ou nuance commune via `carte-nuance` dans le thème).
- **1.1.0** : ajout du bloc réseau (WAN, IP externe, temps de fonctionnement) et thème clair/sombre automatique.
- **1.0.0** : version initiale.

Un appui sur un débit, une température ou le ventilateur ouvre la fiche de l'entité.

## Licence

MIT. Ajoutez le fichier `LICENSE` correspondant à votre dépôt.

# Compteurs Grist (DSFR)

Widget Grist hébergé sur **github.io**.

- **Indicateur** = nom (un compteur par ligne de table)
- **Valeur** = 0 à 100, affichée en %
- **titre_tdb** = titre du tableau de bord (valeur de la **1re ligne**)
- **fix_largeur** = largeur de chaque boîte, 1re ligne (nombre = pixels, ou `320px`, `45%`…). Si la largeur le permet, **deux compteurs** s’affichent sur la même ligne
- rouge à gauche, vert à droite, habillage DSFR

## Utilisation

1. Publiez le dépôt sur GitHub Pages (`main`, dossier `/`).
2. Dans Grist, ajoutez une vue **Custom / Personnalisé**.
3. Collez l’URL github.io.
4. Mappez **Nom de l’indicateur**, **Valeur (0-100)**, **titre_tdb** et **fix_largeur**.

Hors Grist, la page charge `data/exemple.csv` pour l’aperçu.

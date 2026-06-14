# P6 Weekly Progress Updater

Application locale pour consolider des avancements hebdomadaires dans un export
Primavera P6 au format Excel.

L'outil compare un classeur maitre P6 avec un ou deux classeurs de mise a jour
externes, applique la regle du pourcentage physique le plus eleve, puis genere :

- un classeur de revue ;
- une copie prete pour import P6 ;
- un journal Excel des lignes traitees.

L'application tourne uniquement en local sur `127.0.0.1`. Aucun fichier n'est
envoye vers un serveur distant.

## Lancement rapide

### Option 1 - Script Python

Double-cliquer sur `Lancer_P6_Updater.bat`, ou lancer :

```powershell
python server.py
```

Le script installe automatiquement `flask` et `openpyxl` si ces dependances
manquent.

### Option 2 - Fenetre native

```powershell
pip install pywebview
python desktop.py
```

Cette variante ouvre l'interface dans une fenetre Windows native via WebView2.

### Option 3 - Executable Windows

Les executables generes ne sont pas versionnes dans Git (`dist/` est ignore).
Pour distribuer une version compilee, generer l'EXE localement puis l'ajouter a
une GitHub Release.

## Utilisation

1. Selectionner le classeur maitre Primavera P6.
2. Selectionner au moins un classeur de mise a jour : Source A et/ou Source B.
3. Verifier les dates de debut et de fin de semaine.
4. Choisir le dossier de sortie.
5. Cliquer sur `Run Update`.

Le bouton `Parcourir` detecte automatiquement des classeurs situes pres de
l'application avec les motifs usuels `UP*.xlsx`, `SPIE*.xlsx`, `SPIE*.xlsm`,
`*GCC*.xlsx`, `*GCC*.xlsm` et `*avancement*.xlsx/.xlsm`. Ces motifs sont des
heuristiques de confort ; les fichiers peuvent aussi etre importes manuellement.

## Architecture

| Element | Role |
| --- | --- |
| `server.py` | Serveur local Flask : sert l'interface et expose les routes API. |
| `backend/updater_p6_engine.py` | Moteur Python de reconciliation des classeurs Excel. |
| `static/` | Frontend React compile servi par Flask. |
| `frontend/` | Sources React/Vite de l'interface. |
| `desktop.py` | Lanceur fenetre native avec pywebview. |
| `Lancer_P6_Updater.bat` | Lanceur Windows pour la version navigateur locale. |

## Developpement frontend

Depuis le dossier `frontend/` :

```powershell
npm install
npm run build
```

Puis copier le contenu de `frontend/dist/` vers `static/`.

En developpement, lancer le serveur Python puis Vite :

```powershell
python server.py
cd frontend
npm run dev
```

Le proxy `/api` pointe vers `http://127.0.0.1:8746`.

## Generer un executable Windows

Depuis le dossier de l'application :

```powershell
python -m pip install pyinstaller pywebview flask openpyxl
python -m PyInstaller --onefile --windowed --name P6_Updater --add-data "static;static" --add-data "backend;backend" --collect-submodules openpyxl --collect-all webview desktop.py
python -m PyInstaller --onefile --name P6_Updater_Web --add-data "static;static" --add-data "backend;backend" --collect-submodules openpyxl server.py
```

Les fichiers produits seront dans `dist/`.

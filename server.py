"""P6 Weekly Progress Updater - serveur local pour l'interface web.

Sert le frontend React compile (static/) et expose le moteur Python
backend/updater_p6_engine.py.

Lancement : python server.py  (ouvre le navigateur sur http://127.0.0.1:8746)
"""

from __future__ import annotations

import importlib.util
import sys
import tempfile
import threading
import traceback
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

PORT = 8746
SOURCE_A_LABEL = "Source A"
SOURCE_B_LABEL = "Source B"


def resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent


def app_run_dir() -> Path:
    """Dossier de travail visible par l'utilisateur (a cote de l'exe / du script)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _load_engine():
    engine_path = resource_dir() / "backend" / "updater_p6_engine.py"
    spec = importlib.util.spec_from_file_location("updater_p6_engine", engine_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load engine: {engine_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


ENGINE = _load_engine()
STATIC_DIR = resource_dir() / "static"
UPLOAD_DIR = Path(tempfile.gettempdir()) / "p6_updater_uploads"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

STATE = {"last_output_dir": None}


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def this_week_bounds(offset_weeks: int = 0) -> tuple[str, str]:
    today = datetime.today() + timedelta(days=offset_weeks * 7)
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    start = monday.replace(hour=9, minute=0, second=0, microsecond=0)
    finish = friday.replace(hour=18, minute=0, second=0, microsecond=0)
    return start.strftime("%d/%m/%Y %H:%M"), finish.strftime("%d/%m/%Y %H:%M")


def _file_info(path: Path) -> dict:
    try:
        size_mb = round(path.stat().st_size / (1024 * 1024), 2)
    except OSError:
        size_mb = 0
    return {"name": path.name, "path": str(path), "sizeMB": size_mb}


def scan_suggestions() -> dict:
    """Cherche les classeurs usuels autour de l'application."""
    base = app_run_dir()
    search_dirs: list[Path] = []
    for candidate in (base, base.parent, base.parent.parent):
        if candidate not in search_dirs and candidate.exists():
            search_dirs.append(candidate)

    found: dict[str, list[Path]] = {"P6": [], "SPIE": [], "GCC": []}
    for folder in search_dirs:
        found["P6"].extend(sorted(folder.glob("UP*.xlsx")))
        found["SPIE"].extend(sorted(folder.glob("SPIE*.xlsx")))
        found["SPIE"].extend(sorted(folder.glob("SPIE*.xlsm")))
        found["GCC"].extend(sorted(folder.glob("*GCC*.xlsm")))
        found["GCC"].extend(sorted(folder.glob("*GCC*.xlsx")))
        found["GCC"].extend(sorted(folder.glob("*avancement*.xlsm")))
        found["GCC"].extend(sorted(folder.glob("*avancement*.xlsx")))

    # Dedoublonne en gardant l'ordre, exclut les sorties generees par l'outil
    def clean(paths: list[Path]) -> list[dict]:
        seen, out = set(), []
        for p in paths:
            key = str(p).lower()
            if key in seen:
                continue
            if any(tag in p.name for tag in ("_REVIEW_", "_P6_IMPORT_", "_UPDATED_TASKS_LOG_")):
                continue
            seen.add(key)
            out.append(_file_info(p))
        return out[:8]

    return {"P6": clean(found["P6"]), "SPIE": clean(found["SPIE"]), "GCC": clean(found["GCC"])}


@app.get("/")
def index():
    return send_from_directory(str(STATIC_DIR), "index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/suggestions")
def suggestions():
    sugg = scan_suggestions()
    week_start, week_finish = this_week_bounds()
    defaults = {
        "p6": sugg["P6"][0]["path"] if sugg["P6"] else "",
        "spie": sugg["SPIE"][0]["path"] if sugg["SPIE"] else "",
        "gcc": sugg["GCC"][0]["path"] if sugg["GCC"] else "",
        "outputDir": str(app_run_dir()),
        "weekStart": week_start,
        "weekFinish": week_finish,
    }
    return jsonify({"suggestions": sugg, "defaults": defaults})


@app.post("/api/week-bounds")
def week_bounds():
    data = request.get_json(silent=True) or {}
    offset = int(data.get("offset", 0))
    start, finish = this_week_bounds(offset)
    return jsonify({"weekStart": start, "weekFinish": finish})


@app.post("/api/browse")
def browse():
    data = request.get_json(silent=True) or {}
    raw_path = (data.get("path") or "").strip()
    path = Path(raw_path) if raw_path else app_run_dir()
    if not path.exists() or not path.is_dir():
        return jsonify({"error": f"Dossier introuvable : {path}"}), 400
    try:
        subfolders = sorted(
            [p.name for p in path.iterdir() if p.is_dir() and not p.name.startswith((".", "$", "__"))],
            key=str.lower,
        )
    except PermissionError:
        return jsonify({"error": f"Acces refuse : {path}"}), 403
    parent = str(path.parent) if path.parent != path else None
    return jsonify({"path": str(path), "parent": parent, "subfolders": subfolders})


@app.post("/api/mkdir")
def mkdir():
    data = request.get_json(silent=True) or {}
    base = Path((data.get("path") or "").strip())
    name = (data.get("name") or "").strip()
    if not base.is_dir() or not name:
        return jsonify({"error": "Chemin ou nom de dossier invalide."}), 400
    target = base / name
    target.mkdir(exist_ok=True)
    return jsonify({"path": str(target)})


def _resolve_input(field: str, path_field: str, required: bool):
    """Fichier uploade (prioritaire) ou chemin local existant."""
    uploaded = request.files.get(field)
    if uploaded and uploaded.filename:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        dest = UPLOAD_DIR / f"{field}_{Path(uploaded.filename).name}"
        uploaded.save(dest)
        return dest
    raw = (request.form.get(path_field) or "").strip()
    if raw:
        p = Path(raw)
        if not p.exists():
            raise ValueError(f"Fichier introuvable : {raw}")
        return p
    if required:
        raise ValueError("Selectionnez un classeur master P6 valide.")
    return None


@app.post("/api/run-update")
def run_update():
    logs: list[str] = []
    try:
        master = _resolve_input("p6File", "p6Path", required=True)
        spie = _resolve_input("spieFile", "spiePath", required=False)
        gcc = _resolve_input("gccFile", "gccPath", required=False)
        if spie is None and gcc is None:
            raise ValueError("Selectionnez au moins un classeur de mise a jour : Source A ou Source B.")

        week_start = ENGINE.parse_dt((request.form.get("startDate") or "").strip())
        week_finish = ENGINE.parse_dt((request.form.get("finishDate") or "").strip())
        if week_finish < week_start:
            raise ValueError("La fin de semaine doit etre apres le debut.")

        output_dir = Path((request.form.get("outputFolder") or "").strip() or str(app_run_dir()))
        output_dir.mkdir(parents=True, exist_ok=True)

        logs.append(f"[{_ts()}] === DEMARRAGE P6 WEEKLY PROGRESS UPDATER ===")
        logs.append(f"[{_ts()}] Master P6 : {master}")
        logs.append(f"[{_ts()}] {SOURCE_A_LABEL} : {spie or 'non fourni'}")
        logs.append(f"[{_ts()}] {SOURCE_B_LABEL} : {gcc or 'non fourni'}")
        logs.append(f"[{_ts()}] Semaine : {week_start:%d/%m/%Y %H:%M} -> {week_finish:%d/%m/%Y %H:%M}")
        logs.append(f"[{_ts()}] Dossier de sortie : {output_dir}")

        review_d, import_d, log_d = ENGINE.choose_output_paths(master, week_finish)
        review_out = output_dir / review_d.name
        import_out = output_dir / import_d.name
        log_out = output_dir / log_d.name

        logs.append(f"[{_ts()}] Regle active : pourcentage le plus haut gagne, master conserve s'il est superieur.")
        summary = ENGINE.apply_updates(
            master, spie, gcc, week_start, week_finish, review_out, import_out, log_out
        )
        STATE["last_output_dir"] = str(output_dir)

        # --- Conflits structures pour l'UI ---
        conflicts_ui = []
        next_id = 1
        for c in summary.get("conflicts_detail", []):
            first_pct = str(c.get("First %", ""))
            source = SOURCE_A_LABEL if SOURCE_A_LABEL in first_pct else SOURCE_B_LABEL
            conflicts_ui.append({
                "id": str(next_id),
                "activityId": c.get("Activity ID", ""),
                "activityName": c.get("Activity Description", "") or "",
                "field": "% physique",
                "p6Value": f"{c.get('Winning Source', '')} = {c.get('Winning %', '')}",
                "importedValue": first_pct,
                "source": source,
                "severity": "warning",
            })
            next_id += 1
        for m in summary.get("missing_ids_detail", []):
            conflicts_ui.append({
                "id": str(next_id),
                "activityId": m.get("id", ""),
                "activityName": "ID introuvable dans le master P6",
                "field": "Activity ID",
                "p6Value": "Inexistant dans le master",
                "importedValue": f"{m.get('pct', '')}%",
                "source": m.get("source", SOURCE_A_LABEL),
                "severity": "critical",
            })
            next_id += 1

        # --- Fichiers generes ---
        files_ui = []
        log_rows_count = len(summary.get("log_rows", []))
        for fid, p, ftype, records in (
            ("out-1", review_out, "review", log_rows_count),
            ("out-2", import_out, "import", summary.get("updated_tasks_logged", 0) + summary.get("master_syncs", 0)),
            ("out-3", log_out, "log", log_rows_count),
        ):
            if p.exists():
                files_ui.append({
                    "id": fid,
                    "name": p.name,
                    "path": str(p),
                    "sizeKB": max(1, round(p.stat().st_size / 1024)),
                    "type": ftype,
                    "recordsCount": records,
                })

        applied = int(summary.get("updated_tasks_logged", 0))
        logs.append(f"[{_ts()}] Mises a jour appliquees : {applied} ({SOURCE_A_LABEL} {summary.get('spie_updates', 0)}, {SOURCE_B_LABEL} {summary.get('gcc_updates', 0)})")
        logs.append(f"[{_ts()}] Actual starts ajoutes : {summary.get('actual_starts_added', 0)} | Actual finishes ajoutes : {summary.get('actual_finishes_added', 0)}")
        logs.append(f"[{_ts()}] Master conserve (superieur) : {summary.get('master_kept_higher', 0)} | Synchronisations P6 import : {summary.get('master_syncs', 0)}")
        logs.append(f"[{_ts()}] Conflits : {summary.get('conflicts', 0)} | IDs introuvables : {summary.get('missing_ids', 0)}")
        logs.append(f"[{_ts()}] Cellules non rouges prises en compte : {summary.get('non_red_changes', 0)}")
        for f in files_ui:
            logs.append(f"[{_ts()}] [GENERATION] {f['path']}")
        logs.append(f"[{_ts()}] Reconciliation terminee.")

        return jsonify({
            "success": True,
            "summary": {
                "appliedCount": applied,
                "conflictsCount": len(conflicts_ui),
                "outputFilesCount": len(files_ui),
                "conflictsList": conflicts_ui,
                "outputFilesList": files_ui,
                "executionLogs": logs,
            },
        })
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc), "logs": logs}), 400
    except Exception as exc:
        traceback.print_exc()
        logs.append(f"[ERREUR FATALE] {exc}")
        return jsonify({"success": False, "error": f"{type(exc).__name__}: {exc}", "logs": logs}), 500


@app.get("/api/download")
def download():
    file_name = request.args.get("file", "")
    out_dir = STATE.get("last_output_dir")
    if not file_name or not out_dir:
        return "Aucun fichier disponible.", 404
    safe = Path(file_name).name
    target = Path(out_dir) / safe
    if not target.exists():
        return "Fichier introuvable ou expire.", 404
    return send_from_directory(out_dir, safe, as_attachment=True)


def main() -> None:
    url = f"http://127.0.0.1:{PORT}"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"P6 Weekly Progress Updater - interface disponible sur {url}")
    app.run(host="127.0.0.1", port=PORT, debug=False)


if __name__ == "__main__":
    main()

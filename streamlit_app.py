from __future__ import annotations

import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import streamlit as st

from backend import updater_p6_engine as engine


def this_week_bounds() -> tuple[datetime, datetime]:
    today = datetime.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return (
        monday.replace(hour=9, minute=0, second=0, microsecond=0),
        friday.replace(hour=18, minute=0, second=0, microsecond=0),
    )


def format_fr_datetime(value: datetime) -> str:
    return value.strftime("%d/%m/%Y %H:%M")


def parse_fr_datetime(value: str) -> datetime:
    for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%y %H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            pass
    raise ValueError("Format attendu : JJ/MM/AAAA HH:MM.")


def week_bounds_for(offset_weeks: int) -> tuple[datetime, datetime]:
    start, finish = this_week_bounds()
    delta = timedelta(days=7 * offset_weeks)
    return start + delta, finish + delta


def save_upload(uploaded_file, folder: Path) -> Path | None:
    if uploaded_file is None:
        return None
    safe_name = Path(uploaded_file.name).name
    target = folder / safe_name
    target.write_bytes(uploaded_file.getbuffer())
    return target


def download_button(label: str, path: Path) -> None:
    st.download_button(
        label=label,
        data=path.read_bytes(),
        file_name=path.name,
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )


def apply_theme() -> None:
    st.markdown(
        """
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

          :root {
            --app-bg: #f9f9fb;
            --text: #1d1d1f;
            --muted: #86868b;
            --line: #e5e5e7;
            --soft: #f5f5f7;
            --black: #050506;
          }

          html, body, [class*="css"] {
            font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
          }

          .stApp {
            background: var(--app-bg);
            color: var(--text);
          }

          header[data-testid="stHeader"],
          div[data-testid="stToolbar"],
          div[data-testid="stDecoration"],
          div[data-testid="stStatusWidget"] {
            display: none;
          }

          .block-container {
            max-width: 1280px;
            padding-top: 2.5rem;
            padding-bottom: 4rem;
          }

          h1, h2, h3, p {
            letter-spacing: 0;
          }

          .top-line {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #000;
            z-index: 999;
          }

          .hero-card {
            background: white;
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.01);
            margin-bottom: 1rem;
          }

          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 18px;
            align-items: center;
          }

          .badge-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }

          .mode-badge {
            display: inline-flex;
            align-items: center;
            height: 22px;
            padding: 0 9px;
            border: 1px solid var(--line);
            border-radius: 6px;
            background: var(--soft);
            color: var(--text);
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .version-label,
          .engine-note {
            color: var(--muted);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 10px;
          }

          .hero-title {
            margin: 0 0 6px;
            color: var(--text);
            font-size: 20px;
            line-height: 1.12;
            font-weight: 600;
            letter-spacing: -0.02em;
          }

          .hero-copy {
            max-width: 580px;
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.55;
          }

          .run-stack {
            min-width: 185px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
          }

          .run-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            min-width: 168px;
            height: 52px;
            padding: 0 24px;
            border-radius: 999px;
            background: #000;
            color: white;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12);
          }

          .section-card {
            background: white;
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.01);
            margin-bottom: 1.5rem;
          }

          .section-title {
            margin: 0 0 10px;
            color: var(--text);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .section-copy {
            margin: 0 0 18px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.55;
          }

          .divider {
            height: 1px;
            background: #f0f0f2;
            margin: 18px 0 22px;
          }

          .field-label {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 22px 0 8px;
            color: var(--text);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.035em;
          }

          .field-badge {
            border: 1px solid var(--line);
            border-radius: 6px;
            background: var(--soft);
            padding: 2px 8px;
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 9px;
            font-weight: 700;
            color: var(--text);
          }

          .field-help {
            margin: 0 0 10px;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.55;
          }

          div[data-testid="stFileUploader"] {
            border: 1px dashed var(--line);
            border-radius: 16px;
            background: white;
            padding: 10px;
            margin-bottom: 1.25rem;
          }

          div[data-testid="stFileUploader"] section {
            border: 0;
            padding: 12px 8px;
          }

          div[data-testid="stFileUploader"] button {
            border-radius: 999px !important;
            border: 1px solid var(--line) !important;
            background: white !important;
            color: var(--text) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
            font-weight: 700;
          }

          div[data-testid="stFileUploader"] small {
            color: var(--muted) !important;
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 10px !important;
          }

          div[data-testid="stFileUploaderDropzone"] {
            background: white !important;
          }

          div[data-testid="stDateInput"] input,
          div[data-testid="stTimeInput"] input,
          div[data-testid="stTextInput"] input,
          div[data-baseweb="select"] > div {
            border-radius: 13px !important;
            border-color: var(--line) !important;
            background: white !important;
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
            opacity: 1 !important;
            caret-color: var(--text) !important;
          }

          div[data-testid="stDateInput"] input::placeholder,
          div[data-testid="stTimeInput"] input::placeholder,
          div[data-testid="stTextInput"] input::placeholder {
            color: #9a9aa0 !important;
            -webkit-text-fill-color: #9a9aa0 !important;
            opacity: 1 !important;
          }

          div[data-baseweb="select"] span,
          div[data-baseweb="select"] input {
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
            opacity: 1 !important;
          }

          .stButton > button,
          .stDownloadButton > button {
            border-radius: 999px;
            min-height: 38px;
            font-weight: 800;
            border: 1px solid var(--line);
            background: white;
            color: var(--text);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          }

          .stButton > button:hover,
          .stDownloadButton > button:hover {
            border-color: #000;
            background: #f5f5f7;
            color: var(--text);
          }

          .stButton > button[kind="primary"],
          .stDownloadButton > button[kind="primary"] {
            border-color: #000;
            background: #000;
            color: white;
          }

          .stButton > button[kind="primary"]:hover,
          .stDownloadButton > button[kind="primary"]:hover {
            border-color: #000;
            background: #111;
            color: white;
          }

          .metric-card {
            min-height: 140px;
            background: white;
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.01);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .metric-label {
            color: var(--muted);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .metric-value {
            color: var(--text);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 30px;
            font-weight: 300;
            line-height: 1;
            margin-top: 10px;
          }

          .metric-chip {
            width: max-content;
            border: 1px solid var(--line);
            border-radius: 7px;
            background: var(--soft);
            padding: 5px 10px;
            color: var(--text);
            font-size: 10px;
            font-weight: 700;
          }

          .results-card {
            min-height: 0;
            background: white;
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.01);
            margin-top: 1.5rem;
          }

          .empty-state {
            min-height: 190px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 18px;
          }

          .empty-icon {
            width: 100%;
            max-width: 390px;
            height: auto;
            min-height: 90px;
            border-radius: 16px;
            border: 1px solid var(--line);
            background: var(--soft);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: center;
            color: #000;
            font-size: 12px;
            padding: 16px;
            gap: 10px;
          }

          .empty-title {
            margin: 0;
            font-size: 16px;
            font-weight: 800;
            color: var(--text);
          }

          .empty-copy {
            max-width: 440px;
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.65;
          }

          .guide-card {
            width: min(100%, 390px);
            border: 1px solid var(--line);
            border-radius: 16px;
            background: var(--soft);
            padding: 18px;
            text-align: left;
            color: var(--text);
            font-size: 12px;
          }

          .guide-card strong {
            font-weight: 800;
          }

          .success-card {
            border: 1px solid #d8ecd7;
            border-radius: 18px;
            background: #f3fbf2;
            padding: 18px 20px;
            color: #1c5f1f;
            font-weight: 700;
            margin-bottom: 22px;
          }

          .mini-progress-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: var(--text);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .mini-progress-track {
            height: 8px;
            width: 100%;
            border-radius: 999px;
            background: white;
            border: 1px solid var(--line);
            padding: 2px;
          }

          .mini-progress-fill {
            height: 100%;
            width: 2%;
            border-radius: 999px;
            background: rgba(29, 29, 31, 0.12);
          }

          .result-title {
            margin: 0 0 4px;
            font-size: 16px;
            font-weight: 800;
            color: var(--text);
          }

          .result-subtitle {
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.5;
          }

          .output-path {
            padding: 13px 14px;
            border-radius: 12px;
            border: 1px solid var(--line);
            background: var(--soft);
            color: var(--text);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 11px;
            overflow-wrap: anywhere;
          }

          div[data-testid="stDataFrame"] {
            border: 1px solid var(--line);
            border-radius: 16px;
            overflow: hidden;
          }

          @media (max-width: 900px) {
            .block-container {
              padding-left: 1rem;
              padding-right: 1rem;
            }

            .hero-card,
            .section-card,
            .results-card {
              border-radius: 22px;
              padding: 24px;
            }

            .hero-grid {
              grid-template-columns: 1fr;
            }

            .run-stack {
              align-items: flex-start;
              min-width: 0;
            }
          }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_header() -> None:
    st.markdown(
        """
        <div class="top-line"></div>
        <div class="hero-card">
          <div class="hero-grid">
            <div>
              <div class="badge-row">
                <span class="mode-badge">Mode securise actif</span>
                <span class="version-label">v5.0 Web UI</span>
              </div>
              <h1 class="hero-title">P6 Weekly Progress Updater</h1>
              <p class="hero-copy">
                Reconciliation et consolidation des avancements physiques externes avec Primavera P6.
                Regle active : le pourcentage le plus haut gagne, et le master est conserve s'il est deja au-dessus.
              </p>
            </div>
            <div class="run-stack">
              <span class="engine-note">Moteur Python reel - sorties REVIEW / P6_IMPORT / LOG</span>
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_metric_cards(summary: dict[str, Any] | None = None) -> None:
    summary = summary or {}
    applied = int(summary.get("updated_tasks_logged", 0))
    conflicts = int(summary.get("conflicts", 0))
    files = 3 if summary else 0

    cards = [
        ("APPLIQUEES", applied, "Lignes calculees"),
        ("CONFLITS", conflicts, "Incoherences"),
        ("FICHIERS", files, "Livrables"),
    ]

    cols = st.columns(3)
    for col, (label, value, chip) in zip(cols, cards):
        with col:
            st.markdown(
                f"""
                <div class="metric-card">
                  <div>
                    <div class="metric-label">{label}</div>
                    <div class="metric-value">{value}</div>
                  </div>
                  <div class="metric-chip">{chip}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )


def render_empty_state() -> None:
    st.markdown(
        """
        <div class="results-card">
          <div class="empty-state">
            <div class="empty-icon">
              <div class="mini-progress-row">
                <span>MOTEUR PRET</span>
                <span>Attente d'execution (0%)</span>
              </div>
              <div class="mini-progress-track">
                <div class="mini-progress-fill"></div>
              </div>
            </div>
            <p class="empty-copy">
              Associez vos fichiers sources facultatifs a gauche, puis cliquez sur <strong>Run Update</strong>
              pour lancer la consolidation.
            </p>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_processing_state() -> None:
    st.markdown(
        """
        <div class="results-card">
          <div class="result-title">Execution de la mise a jour...</div>
          <p class="result-subtitle">
            Le moteur Python consolide les classeurs et genere les fichiers REVIEW, P6_IMPORT et LOG.
          </p>
          <div style="margin-top: 18px;" class="mini-progress-track">
            <div style="width: 72%; background: #000;" class="mini-progress-fill"></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_file_field(label: str, badge: str, help_text: str, key: str):
    st.markdown(
        f"""
        <div class="field-label">
          <span>{label}</span>
          <span class="field-badge">{badge}</span>
        </div>
        <p class="field-help">{help_text}</p>
        """,
        unsafe_allow_html=True,
    )
    return st.file_uploader(
        label,
        type=["xlsx", "xlsm"],
        key=key,
        label_visibility="collapsed",
    )


def render_week_destination_card() -> None:
    st.markdown(
        """
        <div class="section-card">
          <p class="section-title">Week & Destination</p>
          <p class="section-copy">
            Definissez la fenetre de date et gardez les rapports de revue, fichiers d'importation Primavera
            et logs disponibles en telechargement apres execution.
          </p>
        """,
        unsafe_allow_html=True,
    )
    date_cols = st.columns(2)
    with date_cols[0]:
        st.text_input(
            "Date & Heure Debut",
            key="start_text",
            placeholder="JJ/MM/AAAA HH:MM",
        )
    with date_cols[1]:
        st.text_input(
            "Date & Heure Fin",
            key="finish_text",
            placeholder="JJ/MM/AAAA HH:MM",
        )

    preset_cols = st.columns([0.25, 0.25, 0.25, 0.25])
    with preset_cols[0]:
        st.caption("Raccourcis")
    with preset_cols[1]:
        if st.button("Semaine derniere", use_container_width=True):
            start, finish = week_bounds_for(-1)
            st.session_state.start_text = format_fr_datetime(start)
            st.session_state.finish_text = format_fr_datetime(finish)
            st.rerun()
    with preset_cols[2]:
        if st.button("Cette semaine", use_container_width=True):
            start, finish = week_bounds_for(0)
            st.session_state.start_text = format_fr_datetime(start)
            st.session_state.finish_text = format_fr_datetime(finish)
            st.rerun()
    with preset_cols[3]:
        if st.button("Semaine prochaine", use_container_width=True):
            start, finish = week_bounds_for(1)
            st.session_state.start_text = format_fr_datetime(start)
            st.session_state.finish_text = format_fr_datetime(finish)
            st.rerun()

    st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
    st.text_input("Dossier de Sortie", key="output_folder")
    st.markdown("</div>", unsafe_allow_html=True)


def run_update(
    p6_file,
    source_a_file,
    source_b_file,
    start_dt: datetime,
    finish_dt: datetime,
) -> tuple[dict[str, Any], Path, Path, Path, tempfile.TemporaryDirectory]:
    tmp_context = tempfile.TemporaryDirectory()
    work_dir = Path(tmp_context.name)
    master_path = save_upload(p6_file, work_dir)
    source_a_path = save_upload(source_a_file, work_dir)
    source_b_path = save_upload(source_b_file, work_dir)

    assert master_path is not None
    review_out, import_out, log_out = engine.choose_output_paths(master_path, finish_dt)
    summary = engine.apply_updates(
        master_path,
        source_a_path,
        source_b_path,
        start_dt,
        finish_dt,
        review_out,
        import_out,
        log_out,
    )
    return summary, review_out, import_out, log_out, tmp_context


st.set_page_config(
    page_title="P6 Weekly Progress Updater",
    layout="wide",
    initial_sidebar_state="collapsed",
)
apply_theme()
render_header()

if "last_run" not in st.session_state:
    st.session_state.last_run = None
if "last_tmp" not in st.session_state:
    st.session_state.last_tmp = None

default_start, default_finish = this_week_bounds()

if "start_text" not in st.session_state:
    st.session_state.start_text = format_fr_datetime(default_start)
if "finish_text" not in st.session_state:
    st.session_state.finish_text = format_fr_datetime(default_finish)
if "output_folder" not in st.session_state:
    st.session_state.output_folder = "Session Streamlit - fichiers telechargeables apres traitement"

action_spacer, action_col = st.columns([0.78, 0.22], gap="large")
with action_col:
    run = st.button("Run Update", type="primary", use_container_width=True, key="run_update_top")

left, right = st.columns([0.42, 0.58], gap="large")

with left:
    st.markdown(
        """
        <div class="section-card">
          <p class="section-title">Source Workbooks</p>
          <p class="section-copy">
            Associez le fichier maitre export Primavera P6 avec les rapports chantiers de mise a jour sous-traitants.
          </p>
          <div class="divider"></div>
        """,
        unsafe_allow_html=True,
    )

    p6_file = render_file_field(
        "Primavera Master Workbook *",
        "P6 ENGINE",
        "Modele d'activite et planification de reference exporte de Primavera.",
        "p6_file",
    )
    source_a_file = render_file_field(
        "SPIE Contractor Workbook (Optionnel)",
        "SPIE ENGINE",
        "Suivi d'avancement du sous-traitant electricite / tuyauterie.",
        "source_a_file",
    )
    source_b_file = render_file_field(
        "GCC Contractor Workbook (Optionnel)",
        "GCC ENGINE",
        "Avancement de genie civil et gros oeuvre du chantier GCC.",
        "source_b_file",
    )

    st.markdown("</div>", unsafe_allow_html=True)

with right:
    last_run = st.session_state.last_run
    render_metric_cards(last_run["summary"] if last_run else None)

    parse_error = None
    try:
        start_dt = parse_fr_datetime(st.session_state.start_text)
        finish_dt = parse_fr_datetime(st.session_state.finish_text)
    except ValueError as exc:
        start_dt = default_start
        finish_dt = default_finish
        parse_error = str(exc)

    if run:
        if parse_error:
            st.error(parse_error)
        elif p6_file is None:
            st.error("Selectionne d'abord le classeur maitre Primavera P6.")
        elif source_a_file is None and source_b_file is None:
            st.error("Selectionne au moins une source de mise a jour.")
        elif finish_dt < start_dt:
            st.error("La date de fin doit etre apres la date de debut.")
        else:
            with st.spinner("Traitement des classeurs en cours..."):
                try:
                    if st.session_state.last_tmp is not None:
                        st.session_state.last_tmp.cleanup()
                    summary, review_out, import_out, log_out, tmp_context = run_update(
                        p6_file,
                        source_a_file,
                        source_b_file,
                        start_dt,
                        finish_dt,
                    )
                    st.session_state.last_tmp = tmp_context
                    st.session_state.last_run = {
                        "summary": summary,
                        "review_out": review_out,
                        "import_out": import_out,
                        "log_out": log_out,
                    }
                    st.rerun()
                except Exception as exc:
                    st.exception(exc)

    last_run = st.session_state.last_run
    if not last_run:
        render_empty_state()
    else:
        summary = last_run["summary"]
        st.markdown('<div class="results-card">', unsafe_allow_html=True)
        st.markdown(
            """
            <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; border-bottom:1px solid #f0f0f2; padding-bottom:18px; margin-bottom:18px;">
              <div>
                <div class="result-title">Tableau de Reconciliation / Apercu</div>
                <p class="result-subtitle">Execution terminee. Les fichiers generes sont disponibles ci-dessous.</p>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        d1, d2, d3 = st.columns(3)
        with d1:
            download_button("Telecharger REVIEW", last_run["review_out"])
        with d2:
            download_button("Telecharger P6 IMPORT", last_run["import_out"])
        with d3:
            download_button("Telecharger LOG", last_run["log_out"])

        tab_conflicts, tab_files, tab_logs = st.tabs(["Conflits", "Fichiers generes", "Logs"])
        with tab_conflicts:
            if summary.get("conflicts_detail"):
                st.dataframe(summary["conflicts_detail"], use_container_width=True)
            else:
                st.caption("Aucun conflit detecte sur cette execution.")

            if summary.get("missing_ids_detail"):
                st.markdown("**Activity IDs introuvables**")
                st.dataframe(summary["missing_ids_detail"], use_container_width=True)

        with tab_files:
            for label, path in (
                ("REVIEW", last_run["review_out"]),
                ("P6 IMPORT", last_run["import_out"]),
                ("LOG", last_run["log_out"]),
            ):
                st.markdown(f"**{label}**")
                st.markdown(f'<div class="output-path">{path.name}</div>', unsafe_allow_html=True)

        with tab_logs:
            log_rows = summary.get("log_rows", [])
            if log_rows:
                st.dataframe(log_rows, use_container_width=True)
            else:
                st.caption("Aucun log detaille disponible.")

        st.markdown("</div>", unsafe_allow_html=True)

    render_week_destination_card()

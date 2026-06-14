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
            max-width: 1220px;
            padding-top: 3.25rem;
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
            border-radius: 32px;
            padding: 38px 40px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.025);
            margin-bottom: 2rem;
          }

          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 28px;
            align-items: center;
          }

          .badge-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
          }

          .mode-badge {
            display: inline-flex;
            align-items: center;
            height: 26px;
            padding: 0 12px;
            border: 1px solid var(--line);
            border-radius: 6px;
            background: var(--soft);
            color: var(--text);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .version-label,
          .engine-note {
            color: var(--muted);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
            font-size: 11px;
          }

          .hero-title {
            margin: 0 0 14px;
            color: var(--text);
            font-size: 30px;
            line-height: 1.12;
            font-weight: 700;
            letter-spacing: -0.035em;
          }

          .hero-copy {
            max-width: 720px;
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.65;
          }

          .run-stack {
            min-width: 245px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 16px;
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
            border-radius: 28px;
            padding: 30px 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.018);
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
            margin: 0 0 24px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.55;
          }

          .divider {
            height: 1px;
            background: #f0f0f2;
            margin: 22px 0 26px;
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
            border-radius: 20px;
            background: white;
            padding: 10px;
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
          div[data-baseweb="select"] > div {
            border-radius: 13px !important;
            border-color: var(--line) !important;
            background: white !important;
          }

          .stButton > button,
          .stDownloadButton > button {
            border-radius: 999px;
            min-height: 46px;
            font-weight: 800;
            border: 1px solid #000;
            background: #000;
            color: white;
          }

          .stButton > button:hover,
          .stDownloadButton > button:hover {
            border-color: #000;
            background: #111;
            color: white;
          }

          .metric-card {
            min-height: 140px;
            background: white;
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.012);
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
            font-weight: 600;
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
            min-height: 430px;
            background: white;
            border: 1px solid var(--line);
            border-radius: 28px;
            padding: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.018);
            margin-top: 2rem;
          }

          .empty-state {
            min-height: 350px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 18px;
          }

          .empty-icon {
            width: 74px;
            height: 74px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--soft);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000;
            font-size: 32px;
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
              <div class="run-pill">▶ Run Update</div>
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
        ("↗ APPLIQUEES", applied, "Lignes calculees"),
        ("⚠ CONFLITS", conflicts, "Incoherences"),
        ("▣ FICHIERS", files, "Livrables"),
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
            <div class="empty-icon">▰</div>
            <h3 class="empty-title">Aucune mise a jour executee</h3>
            <p class="empty-copy">
              Utilisez le panneau de gauche pour configurer vos classeurs sources, puis cliquez sur
              <strong>Run Update</strong> pour lancer la reconciliation Primavera P6.
            </p>
            <div class="guide-card">
              <strong>ⓘ Guide de traitement</strong>
              <ul>
                <li><strong>Calcul comparatif:</strong> compare les avancements externes et l'etat Primavera.</li>
                <li><strong>Resolution des conflits:</strong> isole les incoherences de dates ou de pourcentages.</li>
                <li><strong>Staging Primavera:</strong> structure le fichier d'import .xlsx pret a charger.</li>
              </ul>
            </div>
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

left, right = st.columns([0.42, 0.58], gap="large")

with left:
    st.markdown(
        """
        <div class="section-card">
          <p class="section-title">Source Workbooks</p>
          <p class="section-copy">
            Associez le fichier maitre export Primavera P6 avec un ou deux classeurs de mise a jour externes.
          </p>
          <div class="divider"></div>
        """,
        unsafe_allow_html=True,
    )

    p6_file = render_file_field(
        "Primavera Master Workbook *",
        "P6 ENGINE",
        "Export Primavera P6 (feuille TASK, en-tetes internes task_code / user_field_212).",
        "p6_file",
    )
    source_a_file = render_file_field(
        "Source A Workbook (optionnel)",
        "SOURCE A",
        "Premier classeur d'avancement - colonnes Activity ID et This Week's % Complete.",
        "source_a_file",
    )
    source_b_file = render_file_field(
        "Source B Workbook (optionnel)",
        "SOURCE B",
        "Deuxieme classeur d'avancement - memes colonnes attendues.",
        "source_b_file",
    )

    st.markdown('<div class="divider"></div><p class="section-title">Semaine</p>', unsafe_allow_html=True)

    date_cols = st.columns(2)
    with date_cols[0]:
        start_date = st.date_input("Date debut", value=default_start.date())
        finish_date = st.date_input("Date fin", value=default_finish.date())
    with date_cols[1]:
        start_time = st.time_input("Heure debut", value=default_start.time())
        finish_time = st.time_input("Heure fin", value=default_finish.time())

    run = st.button("▶ Run Update", type="primary", use_container_width=True)
    st.markdown("</div>", unsafe_allow_html=True)

start_dt = datetime.combine(start_date, start_time)
finish_dt = datetime.combine(finish_date, finish_time)

with right:
    last_run = st.session_state.last_run
    render_metric_cards(last_run["summary"] if last_run else None)

    if run:
        if p6_file is None:
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
        st.markdown('<div class="success-card">Mise a jour terminee. Les fichiers sont prets au telechargement.</div>', unsafe_allow_html=True)

        d1, d2, d3 = st.columns(3)
        with d1:
            download_button("Telecharger REVIEW", last_run["review_out"])
        with d2:
            download_button("Telecharger P6 IMPORT", last_run["import_out"])
        with d3:
            download_button("Telecharger LOG", last_run["log_out"])

        if summary.get("conflicts_detail"):
            st.subheader("Conflits")
            st.dataframe(summary["conflicts_detail"], use_container_width=True)

        if summary.get("missing_ids_detail"):
            st.subheader("Activity IDs introuvables")
            st.dataframe(summary["missing_ids_detail"], use_container_width=True)

        st.markdown("</div>", unsafe_allow_html=True)

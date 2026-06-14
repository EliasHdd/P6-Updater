from __future__ import annotations

import tempfile
from datetime import datetime, timedelta
from pathlib import Path

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


st.set_page_config(page_title="P6 Weekly Progress Updater", layout="wide")

st.title("P6 Weekly Progress Updater")
st.caption(
    "Consolide des avancements hebdomadaires dans un export Primavera P6. "
    "Tout le traitement se fait dans la session Streamlit."
)

with st.sidebar:
    st.header("Fichiers")
    p6_file = st.file_uploader(
        "Classeur maitre Primavera P6",
        type=["xlsx", "xlsm"],
        help="Export P6 contenant la feuille TASK et les en-tetes internes P6.",
    )
    source_a_file = st.file_uploader(
        "Source A",
        type=["xlsx", "xlsm"],
        help="Classeur avec les colonnes Activity ID et This Week's % Complete.",
    )
    source_b_file = st.file_uploader(
        "Source B",
        type=["xlsx", "xlsm"],
        help="Deuxieme classeur optionnel avec les memes colonnes.",
    )

    default_start, default_finish = this_week_bounds()
    st.header("Semaine")
    start_date = st.date_input("Date debut", value=default_start.date())
    start_time = st.time_input("Heure debut", value=default_start.time())
    finish_date = st.date_input("Date fin", value=default_finish.date())
    finish_time = st.time_input("Heure fin", value=default_finish.time())

    run = st.button("Run Update", type="primary", use_container_width=True)

start_dt = datetime.combine(start_date, start_time)
finish_dt = datetime.combine(finish_date, finish_time)

if not run:
    st.info("Charge le fichier P6 et au moins une source, puis lance la mise a jour.")
    st.stop()

if p6_file is None:
    st.error("Selectionne d'abord le classeur maitre Primavera P6.")
    st.stop()

if source_a_file is None and source_b_file is None:
    st.error("Selectionne au moins une source de mise a jour.")
    st.stop()

if finish_dt < start_dt:
    st.error("La date de fin doit etre apres la date de debut.")
    st.stop()

with st.spinner("Traitement des classeurs en cours..."):
    try:
        with tempfile.TemporaryDirectory() as tmp:
            work_dir = Path(tmp)
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

            st.success("Mise a jour terminee.")

            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Lignes appliquees", summary.get("updated_tasks_logged", 0))
            c2.metric("Conflits", summary.get("conflicts", 0))
            c3.metric("IDs introuvables", summary.get("missing_ids", 0))
            c4.metric("Master conserve", summary.get("master_kept_higher", 0))

            st.subheader("Fichiers generes")
            d1, d2, d3 = st.columns(3)
            with d1:
                download_button("Telecharger le REVIEW", review_out)
            with d2:
                download_button("Telecharger le P6 IMPORT", import_out)
            with d3:
                download_button("Telecharger le LOG", log_out)

            if summary.get("conflicts_detail"):
                st.subheader("Conflits")
                st.dataframe(summary["conflicts_detail"], use_container_width=True)

            if summary.get("missing_ids_detail"):
                st.subheader("Activity IDs introuvables")
                st.dataframe(summary["missing_ids_detail"], use_container_width=True)

    except Exception as exc:
        st.exception(exc)

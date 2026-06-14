"""P6 Weekly Progress Updater - version fenetre native (pywebview).

Demarre le serveur Flask de server.py dans un thread puis ouvre l'UI dans une
fenetre WebView2 (Edge runtime, present par defaut sous Windows 10/11) :
aucun navigateur n'est ouvert. Fermer la fenetre arrete l'application.
"""

from __future__ import annotations

import socket
import threading
import time
import urllib.request

import webview

import server


def _pick_port(preferred: int) -> int:
    """Port prefere si libre, sinon un port libre quelconque (multi-instances)."""
    try:
        with socket.socket() as s:
            s.bind(("127.0.0.1", preferred))
        return preferred
    except OSError:
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]


def main() -> None:
    port = _pick_port(server.PORT)
    threading.Thread(
        target=lambda: server.app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False),
        daemon=True,
    ).start()

    url = f"http://127.0.0.1:{port}"
    for _ in range(60):
        try:
            urllib.request.urlopen(f"{url}/api/health", timeout=0.5)
            break
        except Exception:
            time.sleep(0.1)

    webview.settings["ALLOW_DOWNLOADS"] = True
    webview.create_window(
        "P6 Weekly Progress Updater",
        url,
        width=1480,
        height=920,
        min_size=(1100, 720),
    )
    webview.start()


if __name__ == "__main__":
    main()

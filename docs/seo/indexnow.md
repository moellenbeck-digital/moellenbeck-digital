# IndexNow vorbereiten

## Datei erzeugen

`INDEXNOW_KEY` aus der freigegebenen Umgebung bereitstellen. Dann `python3 scripts/indexnow.py` ausführen.

- Das Skript prüft den Wert: 8–128 ASCII-Buchstaben, Ziffern oder Bindestriche.
- Es schreibt `.deploy/<key>.txt` im Repo-Root. Der Inhalt ist exakt der Schlüssel.
- `.deploy/` steht in `.gitignore`.
- Das Skript erzeugt keinen Schlüssel und sendet keine Anfrage.
- Keine echten Schlüssel für Tests verwenden.

## Beim Deploy veröffentlichen [MAX]

Stand 25.11.2026: GitHub Pages veröffentlicht den Root von `main` (Build-Typ `legacy`, Domain `moellenbeck-digital.io`). Es gibt keinen Deploy-Workflow. **Die Datei in `.deploy/` geht deshalb nicht automatisch online.**

Nur nach Freigabe:

1. Eigenen Branch von `main` anlegen.
2. Datei in den Root kopieren: `cp .deploy/<key>.txt ./`
3. Nur diese Datei committen, PR öffnen und mergen. Pages veröffentlicht sie danach.
4. Prüfen: `curl -fsS https://moellenbeck-digital.io/<key>.txt` gibt exakt den Schlüssel aus.

Der Schlüssel steht dann öffentlich im Web und in der Git-Historie. Er gehört nie in einen Feature-PR. Soll er nicht in Git stehen, braucht Pages zuerst einen Actions-Workflow, der die Datei in das Deploy-Artefakt schreibt. Dieser Workflow existiert nicht.

Einreichung bei IndexNow und Bing-Verifizierung sind separate Schritte für Max.

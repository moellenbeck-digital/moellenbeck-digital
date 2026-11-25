# IndexNow vorbereiten

`INDEXNOW_KEY` aus der freigegebenen Umgebung bereitstellen; anschließend im Repo-Root `python3 scripts/indexnow.py` ausführen. Das Skript validiert 8–128 ASCII-Buchstaben, Ziffern oder Bindestriche und schreibt `<key>.txt` mit exakt dem Schlüssel als Inhalt. Es erzeugt keinen Schlüssel und sendet keine Anfrage. Die Datei erst bei freigegebenem Deploy veröffentlichen. Keine realen Schlüssel für Tests verwenden oder ins PR aufnehmen.

Nach Deploy muss `https://moellenbeck-digital.io/<key>.txt` erreichbar sein. Einreichung und Bing-Verifizierung sind separate Schritte für Max.

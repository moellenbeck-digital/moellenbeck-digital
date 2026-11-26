# IndexNow vorbereiten

Stand 26.11.2026. Nichts davon ist ausgeführt. Kein Schlüssel im Repo, keine Anfrage gesendet.
IndexNow meldet geänderte URLs an Bing, Yandex, Seznam, Naver und Yep. Bing speist Copilot und die ChatGPT-Suche.

## Reihenfolge [MAX]

| Schritt | Wer | Wann |
|---|---|---|
| 1. PR #9 und Runde-3-PR freigeben und mergen (= Deploy auf GitHub Pages) | Max | zuerst |
| 2. Live prüfen: `curl -fsS https://moellenbeck-digital.io/sitemap.xml` zeigt die neuen `lastmod` | Max oder dev | nach Pages-Build |
| 3. Schlüssel erzeugen | Max | nach Schritt 2 |
| 4. Schlüsseldatei veröffentlichen | Max | nach Schritt 3 |
| 5. URL-Liste einreichen | Max | nach Schritt 4 |

## 3. Schlüssel erzeugen

Lokal, nicht im Repo speichern:

```sh
export INDEXNOW_KEY="$(uuidgen | tr -d '-' | tr 'A-Z' 'a-z')"
python3 scripts/indexnow.py
```

- Das Skript prüft den Wert: 8–128 ASCII-Buchstaben, Ziffern oder Bindestriche.
- Es schreibt `.deploy/<key>.txt` im Repo-Root. Der Inhalt ist exakt der Schlüssel.
- `.deploy/` steht in `.gitignore`.
- Das Skript erzeugt keinen Schlüssel und sendet keine Anfrage.
- Keine echten Schlüssel für Tests verwenden.

## 4. Schlüsseldatei veröffentlichen

GitHub Pages veröffentlicht den Root von `main` (Build-Typ `legacy`, Domain `moellenbeck-digital.io`). Es gibt keinen Deploy-Workflow. **Die Datei in `.deploy/` geht deshalb nicht automatisch online.**

1. Eigenen Branch von `main` anlegen.
2. Datei in den Root kopieren: `cp .deploy/<key>.txt ./`
3. Nur diese Datei committen, PR öffnen und mergen. Pages veröffentlicht sie danach.
4. Prüfen: `curl -fsS https://moellenbeck-digital.io/<key>.txt` gibt exakt den Schlüssel aus.

Der Schlüssel steht dann öffentlich im Web und in der Git-Historie. Das ist bei IndexNow so vorgesehen; er ist kein Geheimnis, beweist aber den Besitz der Domain. Er gehört nie in einen Feature-PR.

## 5. URL-Liste einreichen

Die Liste entspricht `sitemap.xml` plus den KI-Dateien. Nur kanonische 200-URLs.

```
https://moellenbeck-digital.io/
https://moellenbeck-digital.io/hausverwaltung/
https://moellenbeck-digital.io/impressum.html
https://moellenbeck-digital.io/datenschutz.html
https://moellenbeck-digital.io/legal/
https://moellenbeck-digital.io/llms.txt
https://moellenbeck-digital.io/llms-full.txt
```

Befehl (eine Anfrage, nicht wiederholen, wenn die Antwort 200 oder 202 ist):

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<JSON
{"host":"moellenbeck-digital.io","key":"$INDEXNOW_KEY","keyLocation":"https://moellenbeck-digital.io/$INDEXNOW_KEY.txt","urlList":[
"https://moellenbeck-digital.io/","https://moellenbeck-digital.io/hausverwaltung/",
"https://moellenbeck-digital.io/impressum.html","https://moellenbeck-digital.io/datenschutz.html",
"https://moellenbeck-digital.io/legal/","https://moellenbeck-digital.io/llms.txt",
"https://moellenbeck-digital.io/llms-full.txt"]}
JSON
```

Antworten: 200/202 angenommen · 400 Format falsch · 403 Schlüssel nicht gefunden oder falsch · 422 URL gehört nicht zum Host · 429 zu viele Anfragen.

Danach nur noch geänderte URLs melden, nach jedem Deploy einmal. Bing-Webmaster-Verifizierung ist ein eigener Schritt für Max und keine Voraussetzung für IndexNow.

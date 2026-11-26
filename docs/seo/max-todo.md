# Offene Freigaben und Belege

- Offizielle Unternehmensprofile (LinkedIn, GitHub-Organisation, Verzeichnisse) bestätigen. `design.html` verlinkt ein GitHub-Repository, nicht ein Personenprofil; daraus wird kein Person/sameAs abgeleitet.
- Person, Rolle und offizielle Profil-URLs für Person-Schema bestätigen. Keine erfundenen Profile ergänzt.
- Search Console und Bing verifizieren, Sitemap einreichen; IndexNow-Schlüssel erst im freigegebenen Deploy bereitstellen.
- Bestehende Claims, Testfragen und externe Sichtbarkeitsmessungen bestätigen. Feld-CWV/INP bleiben offen.

## Runde 5 – Hebel, die nur Max freigeben kann (26.11.2026)

Sortiert nach Wirkung je Aufwand. Punkte = Rubrik `seo`/`geo`. Nichts davon ist umgesetzt.

| # | Hebel | Was Max tut (exakt) | Punkte |
|---|---|---|---|
| 1 | Search Console + Bing | Domain-Property `moellenbeck-digital.io` in Search Console anlegen, DNS-TXT aus dem Dialog setzen. Bing: „Import from Google Search Console“. In beiden einreichen: `https://moellenbeck-digital.io/sitemap.xml`. | SEO E +5 |
| 2 | Testfragen bestätigen | Antwort an dev: „Testfragen 1–15 bestätigt“ oder Nummern streichen/umformulieren. Danach Vorher-Messung nach `docs/geo/messung.md`. | GEO E bis +5, nach Wiederholung bis +2 |
| 3 | `sameAs` | Offizielle URLs nennen (nur vorhandene Profile): LinkedIn-Unternehmensseite, GitHub-Organisation. dev trägt sie ein als `"sameAs": ["<LinkedIn-URL>", "<GitHub-URL>"]` im Organization-Knoten `#org` (Start und HV). | SEO C +2, GEO D +2 |
| 4 | „Für wen nicht“ | Vorschlag nur aus vorhandenen Aussagen, zur Freigabe oder Korrektur. HV-FAQ, neue Frage „Für wen ist der KI-Mitarbeiter nicht gedacht?“, Antwort: „Für Hausverwaltungen, die Antworten ohne menschliche Freigabe versenden wollen. Außer der Standardantwort geht ohne Freigabe nichts raus.“ Start-FAQ: eigener Satz von Max. | GEO C bis +2 |
| 5 | Externer Schema-Validator | Freigabe: „HTML der 5 Seiten darf an validator.schema.org gesendet werden“ (Inhalt ist nach Merge ohnehin öffentlich). Alternativ nach Deploy gegen die Live-URLs. | SEO C +1 |
| 6 | Transkript Startseiten-Film | Englisches Transkript bestätigen oder ablehnen (Entwurf im PR-Text von Runde 3). | GEO A +1 |
| 7 | Claims | Bestätigen oder streichen: „Einrichtung unter einem Tag“, „Haftungsschutz im Code“. | GEO C bis +2 |
| 8 | VideoObject | Veröffentlichungsdatum je Film nennen (`uploadDate`). Ohne Datum kein VideoObject. | kein fester Punkt |
| 9 | llms-full im Hosting-Build | **Erledigt (Runde 6).** Pages läuft mit `build_type=workflow`; `pages.yml` führt `generate-llms.py --check`, `check-llms-txt.py` und `check-meta.py` vor dem Upload aus. Deploy success an c60485c. Kein Max-Schritt. | GEO B +2 (gezählt in Runde 6) |
| 10 | Feld-CWV | Kein Schritt möglich, bis Search Console (Nr. 1) Felddaten zeigt. | SEO D bis +10 |

## Runde 6 – Entscheidungsfragen (26.11.2026)

Je Punkt eine Ja/Nein-Frage. Antwort reicht als „1 ja, 2 nein, …“. Nichts davon ist umgesetzt oder eingereicht.
Quellen: Seitentexte auf `main`, Vault, `dig TXT`. Keine Websuche mit Personennamen. Hinweis: Das GitHub-Repo ist öffentlich; diese Datei ist dort lesbar (nicht auf der Website).

### 1 · Search Console und Bing (SEO E +5)

DNS-TXT ist gesetzt: `dig +short TXT moellenbeck-digital.io` zeigt `google-site-verification=iJt4qdgvEQ0p_pwJ4j2afSXgO3r8rs4U4lPPBQmkm7Q` (26.11., E).

| Schritt | Was Max tut |
|---|---|
| 1 | https://search.google.com/search-console öffnen, mit dem Google-Konto anmelden, das den TXT-Wert erzeugt hat. |
| 2 | „Property hinzufügen“ → **Domain** → `moellenbeck-digital.io` → „Bestätigen“. Der TXT-Eintrag liegt schon; Google prüft sofort. |
| 3 | Links „Sitemaps“ → `https://moellenbeck-digital.io/sitemap.xml` eintragen → „Senden“. Erwartet: Status „Erfolgreich“, 5 URLs. |
| 4 | „URL-Prüfung“ → `https://moellenbeck-digital.io/` und `/hausverwaltung/` → „Indexierung beantragen“. |
| 5 | https://www.bing.com/webmasters → „Import from Google Search Console“ → Property wählen. Die Sitemap kommt mit. |
| 6 | Optional IndexNow: Ablauf in `docs/seo/indexnow.md` (Schlüssel nur lokal erzeugen). |
| 7 | Antwort an dev: „GSC + Bing verifiziert“. Danach zählt dev SEO E neu und liest nach 28 Tagen die Feld-CWV (Nr. 10). |

**Frage 1:** Richtest du Search Console und Bing nach diesem Ablauf ein? Ja / Nein

### 2 · `sameAs` (SEO C +2, GEO D +2)

Kandidaten aus Repo und Vault:

| Profil | URL | Beleg | Vorschlag |
|---|---|---|---|
| GitHub-Organisation | https://github.com/moellenbeck-digital | `gh api orgs/moellenbeck-digital`: Name „Moellenbeck-Digital UG“, Website `https://moellenbeck-digital.io`, öffentlich (HTTP 200) | aufnehmen |
| LinkedIn-Unternehmensseite | keine URL in Repo oder Vault | Nur Banner-Dateien `assets/linkedin-company-banner.*`; Vault nennt LinkedIn als Kanal ohne URL | Max nennt URL oder streicht |
| GitHub `MaxMoell` | https://github.com/MaxMoell | im Vault; Personenprofil, kein Firmenprofil | nicht aufnehmen (Team wird nicht zusätzlich genannt, Entscheidung 26.11.) |

**Frage 2a:** Darf `https://github.com/moellenbeck-digital` als `sameAs` in den Organization-Knoten `#org` (Start und HV)? Ja / Nein
**Frage 2b:** Gibt es eine LinkedIn-Unternehmensseite, die rein soll? Ja (URL schicken) / Nein

### 3 · „Für wen nicht“ (GEO C bis +2)

Fertige Formulierungen, nur aus Aussagen, die schon auf der Seite stehen (Quelle in Klammern). Ort: je eine neue FAQ-Frage, auch in `FAQPage` und llms-full.

HV, Frage „Für wen ist der KI-Mitarbeiter nicht gedacht?“:
- **H1:** „Für Hausverwaltungen, die Nachrichten ohne menschliche Freigabe versenden wollen. Außer der Standardantwort geht ohne Freigabe nichts raus.“ (Freigabe, FAQ)
- **H2:** „Für Hausverwaltungen, die ihre Verwaltungssoftware ersetzen wollen. Wir ersetzen Ihre Software nicht. Wir arbeiten davor, am Posteingang.“ (Einordnung, FAQ)
- **H3:** „Für Hausverwaltungen, die Zahlungen oder Rechtsauskünfte automatisieren wollen. Keine Zahlungen und keine Rechtsauskunft durch die KI.“ (Sicherheit, FAQ)

Start, Frage „Für wen ist Moellenbeck-Digital nicht der richtige Partner?“:
- **S1:** „Für Betriebe, in denen Agenten ohne einen Menschen entscheiden sollen. Unsere Agenten bereiten vor – entscheiden tut ein Mensch.“ (Hero, FAQ)
- **S2:** „Für Abläufe, die ohne Prüfung und Freigabe laufen sollen. Wiederkehrende Abläufe als BPMN-Workflows – mit Prüfung und Freigabe.“ (Fähigkeiten 02)

**Frage 3a:** HV-Antwort = H1 + H2 + H3 zusammen? Ja / Nein (dann Nummern nennen)
**Frage 3b:** Start-Antwort = S1? Ja / Nein (S2 oder eigener Satz)

### 4 · Testfragen (GEO E bis +5)

**Frage 4:** Sind die 15 Testfragen in `docs/geo/testfragen.md` so bestätigt? Ja / Nein (Nummern streichen oder umformulieren)

### 5 · Externer Schema-Validator (SEO C +1)

**Frage 5:** Darf dev die 5 Live-URLs (öffentlich) an validator.schema.org senden? Ja / Nein

### 6 · Claims auf der HV-Seite (GEO C bis +2)

**Frage 6:** Bleiben „Einrichtung unter einem Tag: … 15 Minuten Einweisung“ und „Haftungsschutz im Code“ so stehen? Ja / Nein (dann streichen oder neue Formulierung)

### 7 · Anipal-Referenz auf der Startseite (Abgleich Nr. 12)

Heute: „Referenz: Anipal – Tiergesundheit für Tierbesitzer und Praxen, geleitet von Max Möllenbeck.“ anipal.io sagt: „die App für Pferdehalter – und alle ihre Tiere“; für Pferdetierärzte „bald verfügbar“ (Warteliste, `/fuer-praxen`).

**Frage 7:** Ändern in „Referenz: Anipal – die App für Pferdehalter und alle ihre Tiere, für Pferdetierärzte bald verfügbar; geleitet von Max Möllenbeck.“? Ja / Nein

### 8 · BloomMD-Status auf der Startseite (Abgleich Nr. 13)

Heute: „Closed Beta“. bloommd.io sagt: „Desktop-Beta … Direkt herunterladen; lokale Nutzung braucht kein Konto.“ und `/docs/closed-beta-zugang`: Testaccount für Web und Cloud „ohne Einladung und Warteliste“.

**Frage 8:** Status auf der MD-Startseite (Karte und Faktentabelle) von „Closed Beta“ auf „Beta“ ändern? Ja / Nein

### 9 · Anrede wave-mesh (Abgleich Nr. 14)

Heute: „… mit einem Koordinationsserver, den du selbst betreibst.“ (Karte, sichtbare FAQ, `FAQPage`). Sonst siezt die Seite.

**Frage 9:** Ändern in „…, den Sie selbst betreiben.“? Ja / Nein

### 10 · Freigabe-Aussage der Plattform (Abgleich Nr. 15)

Heute Start: „Nichts geht raus ohne Freigabe eines Menschen.“ (Plattform-Karte) und Film „Keine Nachricht geht ohne Genehmigung raus“. Beim HV-Produkt geht die Standardantwort ohne Freigabe raus.

**Frage 10:** Plattform-Karte ergänzen um „Ausnahme im HV-Paket: die Standardantwort an den Mieter.“? Ja / Nein (Film bleibt)

### 11 · Weiter offen aus Runde 5

| Nr (oben) | Punkt | Frage |
|---|---|---|
| 6 | Transkript Startseiten-Film (Entwurf im PR-Text Runde 3) | **Frage 11a:** Englisches Transkript veröffentlichen? Ja / Nein |
| 8 | VideoObject | **Frage 11b:** Kennst du die Veröffentlichungsdaten der beiden Filme? Ja (Datum schicken) / Nein |
| – | MD #7 Ratgeber (Draft, noindex) | **Frage 11c:** Inhaltsprüfung der drei Entwürfe diese Woche? Ja / Nein |

### 12–17 · BloomMD (Befunde aus dem Abgleich zu PR BloomMD#451, nichts geändert)

| Nr | Widerspruch | Frage (Ja/Nein) |
|---|---|---|
| 12 | FAQ DE/EN und `docs/closed-beta-zugang`: „Preise und Leistungsumfang werden vor Einführung veröffentlicht.“; `/leistungen` und AGB nennen schon 6 EUR/Monat, 60 EUR/Jahr, 100 MB | **Frage 12:** FAQ-Satz durch Verweis auf `/leistungen` ersetzen? |
| 13 | DE-FAQ: „Cloud-Sync ist als optionales Zusatzmodul gedacht“ und „Sync ist optional und wird separat als Add-on eingeordnet.“; Testaccount-FAQ: „… für BloomMD Web, Cloud, Sync und Zusammenarbeit“ | **Frage 13:** FAQ an den Tarif angleichen (Sync ist im Tarif Cloud enthalten)? |
| 14 | FAQ DE 8 Fragen, EN 5; Feedback DE „Angemeldete Tester melden Feedback direkt in der App mit Screenshot.“ + feedback@bloommd.io, EN „Screenshots and videos are planned for the beta feedback workflow.“ | **Frage 14:** EN-FAQ an DE angleichen (Übersetzung, keine neue Aussage)? |
| 15 | JSON-LD `operatingSystem` auf BloomMD main: „Web, macOS, Linux, iOS, Android“ (live noch „Web, macOS, Linux“, main nicht deployt); iPad-/Android-Doku ist Entwurf | **Frage 15:** „iOS, Android“ vor dem nächsten Deploy entfernen, bis die Apps veröffentlicht sind? |
| 16 | `WIKI_VERSION` auf main = „0.4.4“, obwohl main neue Befehle hat | **Frage 16:** Nächstes CLI-Release vorbereiten lassen (Version wählt Max)? |
| 17 | Kein Organization-/FAQPage-JSON-LD auf bloommd.io | **Frage 17:** Organization (= Moellenbeck-Digital `#org`) und FAQPage aus vorhandenem Text ergänzen? |

### Anipal

Anipal ist ein privates Repo. Die Anipal-Fragen (Preise, Claims) liegen deshalb nicht hier, sondern im privaten Vault (Projektordner Anipal, Runde 6).

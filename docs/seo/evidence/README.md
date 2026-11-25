# Lokale Prüfung · 25.11.2026
- docs/seo-geo/check.py unverändert ausgeführt, nur Port 8876 zur Laufzeit auf 8897 gesetzt: Exit 0 (regression.json).
- audit/check.cjs mit Tool-Pfad /tmp/md-pr6-test/audit/tools/node_modules, Port 8897 und drei zusätzlichen Entwurfsrouten: alle acht Routen ohne Axe-Verstöße und kaputte Links (browser-checks.json).
- npx --yes html-validate 'hausverwaltung/ratgeber/**/index.html' 'ratgeber/**/index.html': Exit 0, keine Meldungen.
- Lighthouse CLI 13 mobil, lokale Schadensmeldungen-Seite: Performance 100, Accessibility 100, Best Practices 96, SEO 66. noindex ist beabsichtigt. Vollbericht und Kurzfassung liegen hier.
- Keine Live-Prüfung, kein externer Schema-Validator, keine Sichtbarkeitsmessung, kein unabhängiges Review und keine Max-Inhaltsabnahme.
- Wiederholung: lokalen HTTP-Server auf Port 8897 im Checkout starten; bestehende Skripte mit obigen Port-/Tool-Anpassungen ausführen.

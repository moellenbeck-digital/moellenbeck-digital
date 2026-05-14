# TODO – Go-Live moellenbeck-digital.io

Offene Schritte, damit die Seite unter `https://moellenbeck-digital.io` live ist.

## 1. DNS-Records beim Domain-Provider eintragen

Domain: `moellenbeck-digital.io`

### Apex-Domain (`moellenbeck-digital.io`)

A-Records auf GitHub-Pages-IPs:

```
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```

Optional zusätzlich AAAA für IPv6:

```
AAAA  @  2606:50c0:8000::153
AAAA  @  2606:50c0:8001::153
AAAA  @  2606:50c0:8002::153
AAAA  @  2606:50c0:8003::153
```

### `www`-Subdomain

CNAME auf die GitHub-Organisation (nicht auf die Custom-Domain):

```
CNAME  www  moellenbeck-digital.github.io.
```

## 2. DNS-Propagation prüfen

```
dig +short moellenbeck-digital.io
dig +short www.moellenbeck-digital.io
```

Erwartet: Die vier `185.199.108-111.153` IPs bzw. `moellenbeck-digital.github.io`.

## 3. Custom Domain in GitHub verifizieren

Im Repo unter **Settings → Pages**: nach DNS-Propagation erscheint dort ein grüner Haken für die Domain. Falls nicht, „Check again" klicken.

## 4. HTTPS erzwingen

Sobald DNS aufgelöst wird und das Let's-Encrypt-Zertifikat von GitHub bereitgestellt wurde (typischerweise wenige Minuten nach Domain-Verifikation):

```
gh api -X PUT repos/moellenbeck-digital/moellenbeck-digital/pages -F https_enforced=true
```

Oder in **Settings → Pages → "Enforce HTTPS"** anhaken.

## 5. Smoke-Test

- [ ] `https://moellenbeck-digital.io` lädt
- [ ] `https://www.moellenbeck-digital.io` leitet auf Apex weiter
- [ ] `http://` wird auf `https://` umgeleitet
- [ ] `impressum.html` und `datenschutz.html` sind erreichbar
- [ ] Favicons und SVGs werden geladen

## 6. Redirect `moellenbeck-digital.de` → `moellenbeck-digital.io`

Ziel: jeder Aufruf von `http(s)://(www.)moellenbeck-digital.de/<pfad>` antwortet mit **HTTP 301** auf `https://moellenbeck-digital.io/<pfad>` — inkl. gültigem TLS-Zertifikat auf der `.de` (sonst Browser-Warnung vor dem Redirect).

### Empfohlen: Cloudflare (kostenlos, 301 + HTTPS)

1. `moellenbeck-digital.de` als Site in Cloudflare hinzufügen, beim Registrar die Nameserver auf die von Cloudflare zugewiesenen umstellen.
2. In Cloudflare einen Dummy-DNS-Record für Apex und `www` anlegen, der proxied ist (orange Wolke). Z. B.:

   ```
   A     @    192.0.2.1   (Proxied)
   AAAA  @    100::       (Proxied)
   CNAME www  moellenbeck-digital.de   (Proxied)
   ```

   Die IPs müssen nicht erreichbar sein — Cloudflare fängt den Traffic durch den Proxy ab, bevor er die Origin erreicht.
3. SSL/TLS-Modus auf **Full** (oder **Flexible**, da keine echte Origin) stellen, **Always Use HTTPS** aktivieren.
4. **Bulk Redirects** (oder eine **Single Redirect Rule**) anlegen:
   - Source URL: `https://moellenbeck-digital.de/*` und `https://www.moellenbeck-digital.de/*`
   - Target URL: `https://moellenbeck-digital.io/${1}`
   - Status: **301**
   - Optionen: *Preserve query string*, *Preserve path suffix* aktivieren.
5. Warten bis Edge-Cert ausgestellt ist (Universal SSL, meist < 15 min nach NS-Umstellung).

### Alternative: URL-Weiterleitung beim Registrar

Viele Registrare (INWX, Netcup, Strato, IONOS …) bieten unter „Domain → Weiterleitung" ein HTTP-Forwarding an. Vor der Nutzung prüfen:

- liefert **301** (permanent), nicht 302
- unterstützt **HTTPS** auf der Quell-Domain (sonst Zertifikatsfehler)
- erhält den **Pfad** (`/impressum.html` muss auf `/impressum.html` zeigen, nicht nur auf die Startseite)

Wenn eine dieser Eigenschaften fehlt → Cloudflare-Variante nehmen.

### Smoke-Test Redirect

```
curl -sI https://moellenbeck-digital.de/            | grep -iE 'HTTP/|location'
curl -sI https://www.moellenbeck-digital.de/        | grep -iE 'HTTP/|location'
curl -sI https://moellenbeck-digital.de/impressum.html | grep -iE 'HTTP/|location'
curl -sI http://moellenbeck-digital.de/             | grep -iE 'HTTP/|location'
```

Erwartet jeweils:

```
HTTP/2 301
location: https://moellenbeck-digital.io/<entsprechender Pfad>
```

## Referenzen

- Repo: https://github.com/moellenbeck-digital/moellenbeck-digital
- Pages (vorläufig, vor DNS): https://moellenbeck-digital.github.io/moellenbeck-digital/
- GitHub Pages Custom-Domain-Doku: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

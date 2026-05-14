# TODO – Go-Live moellenbeck-digital.de

Offene Schritte, damit die Seite unter `https://moellenbeck-digital.de` live ist.

## 1. DNS-Records beim Domain-Provider eintragen

Domain: `moellenbeck-digital.de`

### Apex-Domain (`moellenbeck-digital.de`)

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
dig +short moellenbeck-digital.de
dig +short www.moellenbeck-digital.de
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

- [ ] `https://moellenbeck-digital.de` lädt
- [ ] `https://www.moellenbeck-digital.de` leitet auf Apex weiter
- [ ] `http://` wird auf `https://` umgeleitet
- [ ] `impressum.html` und `datenschutz.html` sind erreichbar
- [ ] Favicons und SVGs werden geladen

## Referenzen

- Repo: https://github.com/moellenbeck-digital/moellenbeck-digital
- Pages (vorläufig, vor DNS): https://moellenbeck-digital.github.io/moellenbeck-digital/
- GitHub Pages Custom-Domain-Doku: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

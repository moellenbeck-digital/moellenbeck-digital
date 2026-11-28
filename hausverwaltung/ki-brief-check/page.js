/* KI-Brief-Check: Oberfläche. Alle Ausgaben laufen über textContent bzw. value.
 * Der Text bleibt im Arbeitsspeicher; es gibt keinen Netzwerkaufruf und keine Speicherung. */
(function (root) {
  'use strict';

  function el(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderClaims(doc, list, claims) {
    list.replaceChildren();
    for (const claim of claims) {
      const item = el(doc, 'li', 'kbc-claim');
      item.setAttribute('data-rating', claim.rating);
      const badge = el(doc, 'span', 'kbc-badge', claim.rating);
      badge.setAttribute('data-rating', claim.rating);
      item.append(
        badge,
        el(doc, 'blockquote', 'kbc-quote', claim.text),
        el(doc, 'p', 'kbc-reason', claim.reason),
        el(doc, 'p', 'kbc-source', 'Quelle: ' + claim.source)
      );
      list.append(item);
    }
  }

  function summary(claims) {
    if (!claims.length) {
      return 'Keine Rechtsbehauptung erkannt. Das heißt nicht, dass der Brief keine enthält. Bitte selbst prüfen.';
    }
    const count = (rating) => claims.filter((c) => c.rating === rating).length;
    return `${claims.length} ${claims.length === 1 ? 'Hinweis' : 'Hinweise'}: ${count('belegt')} belegt, ${count('fraglich')} fraglich, ${count('unklar')} unklar.`;
  }

  function init(doc, api) {
    const $ = (id) => doc.getElementById(id);
    const letter = $('letter'), result = $('result'), status = $('status'), error = $('letterError');
    const optin = $('optin'), email = $('email'), newsStatus = $('newsStatus');
    let run = 0;

    const count = () => {
      const n = letter.value.length;
      $('letterCount').textContent = `${n.toLocaleString('de-DE')} von ${api.MAX_LENGTH.toLocaleString('de-DE')} Zeichen`;
    };
    // Ein altes Ergebnis darf nie neben einem geänderten Text stehen.
    const reset = () => {
      run += 1;
      result.hidden = true;
      $('claims').replaceChildren();
      $('draft').value = '';
      status.textContent = '';
      error.textContent = '';
      letter.removeAttribute('aria-invalid');
    };

    letter.addEventListener('input', () => { reset(); count(); });

    $('clearButton').addEventListener('click', () => {
      letter.value = '';
      reset(); count(); letter.focus();
    });

    $('letterForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      reset();
      const current = run;
      try {
        const analysis = await api.analyzeLetter(letter.value);
        if (current !== run) return;
        renderClaims(doc, $('claims'), analysis.claims);
        $('draft').value = analysis.draft;
        $('resultDisclaimer').textContent = analysis.disclaimer;
        result.hidden = false;
        status.textContent = summary(analysis.claims);
        $('claimsTitle').focus();
      } catch (problem) {
        if (current !== run) return;
        error.textContent = problem instanceof api.AnalyzerError ? problem.message : 'Die Prüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.';
        letter.setAttribute('aria-invalid', 'true');
        letter.focus();
      }
    });

    // Platzhalter: prüft nur die Eingaben. Es wird nichts gespeichert oder gesendet.
    $('newsForm').addEventListener('submit', (event) => {
      event.preventDefault();
      optin.removeAttribute('aria-invalid');
      email.removeAttribute('aria-invalid');
      if (!optin.checked) {
        newsStatus.textContent = 'Bitte setzen Sie zuerst das Häkchen zur Einwilligung.';
        optin.setAttribute('aria-invalid', 'true');
        optin.focus();
        return;
      }
      if (!email.value.trim() || !email.validity.valid) {
        newsStatus.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        return;
      }
      email.value = '';
      optin.checked = false;
      newsStatus.textContent = 'Double-Opt-in folgt – Prototyp, es wird nichts gespeichert oder gesendet.';
    });

    for (const id of ['checkButton', 'clearButton', 'newsButton']) $(id).disabled = false;
    count();
  }

  if (typeof module === 'object' && module.exports) module.exports = { renderClaims, summary, init };
  else init(root.document, root.KiBriefCheck);
}(typeof self !== 'undefined' ? self : this));

/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG — INVOICE LAYOUTS
   6 Sep 2026

   One entry per card on invoice.html. Card #N runs LAYOUTS[N].

   Each layout is a function that receives:
     v   — the filled values (invNum, dates, fromName, fromRest, toName,
           toRest, notes, cur, sub, tax, total, taxRate …)
     c   — the effective colours (bg, accent, light, bodyBg, text, th,
           thText, border, font) after the user's own customisation
     x   — extras: x.logoHtml, x.itemRows, x.footer, x.cfg (column names)

   and returns a complete HTML document string.

   Layout 1 is the finished design. Layouts 2-50 are BLANK STARTERS — a
   bare, working invoice with nothing styled. Design them one at a time;
   nothing else in the page needs to change.
   ═══════════════════════════════════════════════════════════════════════ */
window.LD_INVOICE_LAYOUTS = {};

/* ── Layout 1 — finished design ─────────────────────────────────────── */
window.LD_INVOICE_LAYOUTS[1] = function (v, c, x) {
  const logoHtml = x.logoHtml, footer = x.footer, itemRows = x.itemRows, cfg = x.cfg, wm = '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#f0f4f8;">
${wm}
<div style="max-width:800px;margin:30px auto;background:${c.bodyBg};box-shadow:0 4px 30px rgba(0,0,0,0.12);">
  <div style="background:${c.bg};color:#fff;padding:36px 50px;display:flex;justify-content:space-between;align-items:center;">
    <div>${logoHtml}<div style="font-size:22px;font-weight:900;">${v.fromName}</div><div style="font-size:11px;opacity:0.7;margin-top:4px;">${v.fromDetails}</div></div>
    <div style="text-align:right;"><div style="font-size:28px;font-weight:900;letter-spacing:3px;">INVOICE</div><div style="font-size:12px;opacity:0.7;margin-top:4px;">${v.invNum}</div></div>
  </div>
  <div style="background:${c.light};padding:14px 50px;display:flex;justify-content:space-between;border-bottom:2px solid ${c.bg};">
    <div><div style="font-size:10px;font-weight:700;color:${c.accent};text-transform:uppercase;">Date</div><div style="font-size:13px;font-weight:700;margin-top:2px;color:${c.text};">${v.invDate}</div></div>
    <div><div style="font-size:10px;font-weight:700;color:${c.accent};text-transform:uppercase;">Due Date</div><div style="font-size:13px;font-weight:700;margin-top:2px;color:${c.text};">${v.dueDate}</div></div>
    <div><div style="font-size:10px;font-weight:700;color:${c.accent};text-transform:uppercase;">Invoice #</div><div style="font-size:13px;font-weight:700;margin-top:2px;color:${c.text};">${v.invNum}</div></div>
  </div>
  <div style="padding:34px 50px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-bottom:32px;">
      <div><div style="font-size:10px;font-weight:700;color:${c.accent};text-transform:uppercase;border-bottom:2px solid ${c.bg};padding-bottom:5px;margin-bottom:8px;">${cfg.from[0]||'From'}</div><div style="font-size:13px;line-height:1.8;color:${c.text};"><strong>${v.fromName}</strong><br/>${v.fromDetails}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:${c.accent};text-transform:uppercase;border-bottom:2px solid ${c.bg};padding-bottom:5px;margin-bottom:8px;">${cfg.to[0]||'Bill To'}</div><div style="font-size:13px;line-height:1.8;color:${c.text};"><strong>${v.toName}</strong><br/>${v.toDetails}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <thead><tr style="background:${c.th};">${cfg.cols.map(col=>`<th style="padding:10px 14px;font-size:10px;color:${c.thText};text-transform:uppercase;text-align:left;">${col}</th>`).join('')}<th style="padding:10px 14px;font-size:10px;color:${c.thText};text-transform:uppercase;text-align:right;">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:26px;">
      <div style="width:230px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid ${c.border};color:${c.text};"><span>Subtotal</span><span>${v.cur}${v.sub.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid ${c.border};color:${c.text};"><span>Tax</span><span>${v.cur}${v.tax.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;padding:11px 14px;background:${c.bg};color:#fff;margin-top:2px;"><span>Total Due</span><span>${v.cur}${v.grand.toFixed(2)}</span></div>
      </div>
    </div>
    ${v.notes?`<div style="background:${c.light};border-left:4px solid ${c.accent};padding:12px 16px;font-size:12px;line-height:1.7;color:${c.text};">${v.notes}</div>`:''}
  </div>
  ${footer}
</div></body></html>`;
};

/* ── Layout 2 — Minimal Agency (monogram band, serif, signature) ────── */
window.LD_INVOICE_LAYOUTS[2] = function (v, c, x) {
  var st   = x.settings || {};
  var band = st.strip   || '#E8E6E1';
  var ink  = st.text    || '#1B1B1B';
  var soft = '#6B6B6B';
  var rule = '#1B1B1B';
  var font = (st.font) || "'Helvetica Neue', Helvetica, Arial, sans-serif";

  /* monogram: first letters of the first two words of the business name */
  var mono = (typeof window !== 'undefined' && window.LD_L2_MONO) || {};
  var words = String(v.fromName || '').trim().split(/\s+/).filter(Boolean);
  var i1 = mono.a || (words[0] || 'A').charAt(0).toUpperCase();
  var i2 = mono.b || ((words[1] || words[0] || 'B').charAt(words[1] ? 0 : 1).toUpperCase() || i1);

  var mark = x.logoSrc
    ? '<img src="' + x.logoSrc + '" style="max-height:78px;display:block;margin:0 auto 14px;"/>'
    : '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:56px;line-height:1;'
      + 'color:' + ink + ';letter-spacing:-2px;margin-bottom:14px;">'
      + i1 + '<span style="display:inline-block;transform:rotate(18deg);margin:0 -4px;'
      + 'font-weight:300;color:' + soft + ';">/</span>' + i2 + '</div>';

  var rows = (x.items || []).map(function (it) {
    var q = parseFloat(it.c2) || 1;
    var r = parseFloat(it.rate) || 0;
    return '<tr>'
      + '<td style="padding:11px 0;font-size:11.5px;color:' + ink + ';letter-spacing:.02em;">' + (it.c1 || '') + '</td>'
      + '<td style="padding:11px 0;font-size:11.5px;color:' + ink + ';text-align:right;width:90px;">' + r.toFixed(0) + '</td>'
      + '<td style="padding:11px 0;font-size:11.5px;color:' + ink + ';text-align:center;width:60px;">' + q + '</td>'
      + '<td style="padding:11px 0;font-size:11.5px;color:' + ink + ';text-align:right;width:90px;">' + v.cur + (q * r).toFixed(0) + '</td>'
      + '</tr>';
  }).join('');

  var payTo = v.notes
    ? '<div style="margin-top:26px;">'
      + '<div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:' + ink + ';margin-bottom:7px;">PAY TO:</div>'
      + '<div style="font-size:11px;line-height:1.85;color:' + ink + ';white-space:pre-line;">' + v.notes + '</div>'
      + '</div>'
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${font};">
<div style="max-width:760px;margin:0 auto;background:#fff;">

  <div style="background:${band};padding:54px 40px 46px;text-align:center;">
    ${mark}
    <div style="font-size:17px;letter-spacing:.30em;color:${ink};font-weight:500;">${String(v.fromName || '').toUpperCase()}</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:${soft};margin-top:7px;">${v.fromDetails || ''}</div>
  </div>

  <div style="padding:52px 64px 60px;">

    <table style="width:100%;border-collapse:collapse;margin-bottom:34px;">
      <tr>
        <td style="vertical-align:top;">
          <div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};margin-bottom:7px;">ISSUED TO:</div>
          <div style="font-size:11px;line-height:1.85;color:${ink};">${v.toName || ''}<br/>${String(v.toDetails || '').split(' | ').join('<br/>')}</div>
          ${payTo}
        </td>
        <td style="vertical-align:top;text-align:right;white-space:nowrap;">
          <div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};">INVOICE NO:&nbsp;&nbsp;&nbsp;<span style="letter-spacing:.02em;">${v.invNum}</span></div>
          <div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};margin-top:6px;">DATE:&nbsp;&nbsp;&nbsp;<span style="font-weight:400;letter-spacing:.02em;">${v.invDate}</span></div>
          <div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};margin-top:6px;">DUE DATE:&nbsp;&nbsp;&nbsp;<span style="font-weight:400;letter-spacing:.02em;">${v.dueDate}</span></div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:44px;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};padding:0 0 11px;border-bottom:1px solid ${rule};">DESCRIPTION</th>
          <th style="text-align:right;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};padding:0 0 11px;border-bottom:1px solid ${rule};">UNIT PRICE</th>
          <th style="text-align:center;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};padding:0 0 11px;border-bottom:1px solid ${rule};">QTY</th>
          <th style="text-align:right;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};padding:0 0 11px;border-bottom:1px solid ${rule};">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid ${rule};margin-top:2px;">
      <tr>
        <td style="padding:14px 0 0;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:${ink};vertical-align:top;">SUBTOTAL</td>
        <td style="padding:14px 0 0;text-align:right;">
          <div style="font-size:11.5px;font-weight:700;color:${ink};">${v.cur}${v.sub.toFixed(0)}</div>
          <div style="font-size:11px;color:${ink};margin-top:6px;"><span style="color:${soft};margin-right:16px;">Tax</span>${x.taxRate}%</div>
          <div style="font-size:11.5px;font-weight:700;color:${ink};margin-top:6px;"><span style="margin-right:16px;">TOTAL</span>${v.cur}${v.grand.toFixed(0)}</div>
        </td>
      </tr>
    </table>

    <div style="text-align:right;margin-top:58px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:26px;color:${ink};opacity:.85;">${v.fromName || ''}</div>
    </div>

  </div>

  <div style="background:${band};height:26px;"></div>
</div>
</body></html>`;
};

/* ── Layout 3 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[3] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 4 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[4] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 5 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[5] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 6 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[6] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 7 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[7] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 8 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[8] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 9 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[9] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 10 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[10] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 11 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[11] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 12 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[12] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 13 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[13] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 14 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[14] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 15 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[15] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 16 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[16] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 17 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[17] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 18 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[18] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 19 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[19] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 20 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[20] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 21 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[21] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 22 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[22] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 23 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[23] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 24 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[24] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 25 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[25] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 26 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[26] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 27 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[27] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 28 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[28] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 29 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[29] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 30 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[30] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 31 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[31] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 32 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[32] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 33 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[33] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 34 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[34] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 35 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[35] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 36 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[36] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 37 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[37] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 38 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[38] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 39 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[39] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 40 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[40] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 41 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[41] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 42 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[42] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 43 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[43] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 44 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[44] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 45 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[45] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 46 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[46] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 47 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[47] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 48 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[48] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 49 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[49] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

/* ── Layout 50 — BLANK STARTER, ready to design ──────────────────────── */
window.LD_INVOICE_LAYOUTS[50] = function (v, c, x) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${v.invNum}</title></head>
<body style="margin:0;padding:0;font-family:${c.font};background:#fff;color:${c.text};">
<div style="max-width:800px;margin:30px auto;padding:40px;">
  ${x.logoHtml}
  <h1 style="margin:0 0 4px;font-size:24px;">INVOICE</h1>
  <div style="font-size:12px;margin-bottom:24px;">#${v.invNum} &nbsp;·&nbsp; ${v.invDate} &nbsp;·&nbsp; Due ${v.dueDate}</div>

  <div style="display:flex;gap:40px;margin-bottom:24px;font-size:12px;">
    <div><b>${v.fromName}</b><br>${v.fromDetails}</div>
    <div><b>${v.toName}</b><br>${v.toDetails}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr>${x.cfg.cols.map(function (col) {
      return `<th style="text-align:left;padding:8px;border-bottom:2px solid ${c.text};font-size:11px;">${col}</th>`;
    }).join('')}</tr></thead>
    <tbody>${x.itemRows}</tbody>
  </table>

  <div style="text-align:right;font-size:13px;">
    <div>Subtotal: ${v.cur}${v.sub.toFixed(2)}</div>
    <div>Tax: ${v.cur}${v.tax.toFixed(2)}</div>
    <div style="font-weight:800;font-size:16px;margin-top:6px;">Total: ${v.cur}${v.grand.toFixed(2)}</div>
  </div>

  ${v.notes ? `<div style="margin-top:24px;font-size:12px;">${v.notes}</div>` : ''}
</div>
</body></html>`;
};

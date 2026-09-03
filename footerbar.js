(function() {

  // ── INJECT FOOTER CSS ──
  var style = document.createElement('style');
  style.textContent = `
    /* ── FOOTER (footerbar.js) ── */
    footer { background: #f0f0f0 !important; border-top: 1px solid #ddd; margin-top: 0; }
    .footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; padding: 55px 120px 45px; background: #f0f0f0; }
    .footer-links h4 { color: #1a1a1a; font-size: 15px; font-weight: 600; margin-bottom: 16px; font-family: 'Inter', sans-serif; text-transform: none; letter-spacing: 0; }
    .footer-links a { display: block; color: #3d3d3d; text-decoration: none; font-size: 14px; margin-bottom: 10px; transition: color 0.2s; font-family: 'Inter', sans-serif; }
    .footer-links a:hover { color: #e03030; }

    /* social + legal row */
    .footer-mid { border-top: 1px solid #ddd; padding: 30px 40px; display: flex; flex-direction: column; align-items: center; gap: 18px; background: #f0f0f0; }
    .footer-social { display: flex; gap: 22px; align-items: center; }
    .footer-social a { display: flex; align-items: center; justify-content: center; text-decoration: none; transition: opacity 0.2s, transform 0.2s; }
    .footer-social a:hover { opacity: 0.75; transform: translateY(-2px); }
    .footer-social a.ic-x { color: #000000; }
    .footer-social a.ic-ig { color: #e1306c; }
    .footer-social a.ic-li { color: #0a66c2; }
    .footer-social a.ic-yt { color: #ff0000; }
    .footer-social a.ic-fb { color: #1877f2; }
    .footer-legal-row { display: flex; flex-wrap: wrap; justify-content: center; }
    .footer-legal-row a { color: #666; text-decoration: none; font-size: 13px; padding: 2px 14px; border-right: 1px solid #bbb; transition: color 0.2s; white-space: nowrap; font-family: 'Inter', sans-serif; }
    .footer-legal-row a:last-child { border-right: none; }
    .footer-legal-row a:hover { color: #e03030; }

    /* black bottom bar — centered like Zoho */
    .footer-bar { background: #1a1a1a; padding: 24px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 100%; box-sizing: border-box; }
    .footer-bar-logo { font-family: 'Nunito','Poppins', sans-serif; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .footer-bar-logo .ld { color: #ffffff; -webkit-text-fill-color: #ffffff; }
    .footer-bar-logo .tmpl { color: #e03030; -webkit-text-fill-color: #e03030; }
    .footer-bar p { color: #888; font-size: 12px; font-family: 'Inter', sans-serif; }


    /* gold divider */
    .gold-divider { height: 1px; margin: 0 70px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); }

    @media (max-width: 900px) { .footer-cols { grid-template-columns: 1fr 1fr; padding: 40px 30px; } .footer-mid { padding: 24px 20px; } .footer-bar { padding: 20px; } .gold-divider { margin: 0 20px; } }
    @media (max-width: 500px) { .footer-cols { grid-template-columns: 1fr; padding: 30px 20px; } }
  `;
  document.head.appendChild(style);

  // ── INJECT FOOTER HTML ──
  var footerHTML = `
<div class="gold-divider"></div>
<footer>
  <div class="footer-cols">
    <div class="footer-links">
      <h4>Templates</h4>
      <a href="pitch_deck_folder_section.html">Pitch Decks</a>
      <a href="media_kits_folder_section.html">Media Kits</a>
      <a href="digital_keynote-folder.html">Digital Keynotes</a>
      <a href="invoice.html">Invoices</a>
      <a href="career_docs_folder_section.html">Career Documents</a>
      <a href="web_kit_folder_file.html">Website UI Kits</a>
      <!-- "Browse All" used to open Pitch Decks only. The Studio collection page
           is the genuine all-products view (every category, live counts). -->
      <a href="lazydog_studio.html#marketplace">Browse All</a>
      <!-- "Pro Plans" removed 29 Jul 2026: it pointed at index.html#pro, an anchor
           that does not exist, so the page silently reloaded. That was a link
           people clicked intending to pay. Re-add it when the subscription plan
           is live and has a real page. -->
    </div>
    <!-- Industries column removed 29 Jul 2026: all six links were href="#" and
         went nowhere, directly under a page boasting "Multiple Industries
         Covered". Bring it back when there are real industry pages to open. -->
    <div class="footer-links">
      <h4>Company</h4>
      <!-- These three stay (owner). No dedicated pages exist yet, so rather than
           href="#" — which looks live and does nothing — each points somewhere
           real. Swap in proper pages when they are built.
             About Us  -> the Studio page already tells the LazyDog story
             Affiliate -> the freelancer programme is launching; collect interest
             Careers   -> same, straight to the inbox -->
      <a href="about.html">About Us</a>
      <a href="blog.html">Blog</a>
      <a href="mailto:support@lazydogtemplates.com?subject=Affiliate%20%2F%20Freelancer%20Programme">Affiliate Program</a>
      <a href="mailto:support@lazydogtemplates.com?subject=Careers%20at%20LazyDog">Careers</a>
      <a href="mailto:support@lazydogtemplates.com">Contact Us</a>
      <a href="faq.html">FAQ</a>
    </div>
    <div class="footer-links">
      <h4>Legal</h4>
      <a href="terms.html">Terms &amp; Conditions</a>
      <a href="terms.html#privacy">Privacy Policy</a>
      <a href="terms.html#refund">Refund Policy</a>
      <a href="terms.html#cookies">Cookie Policy</a>
      <a href="terms.html#license">License</a>
    </div>
  </div>

  <div class="footer-mid">
    <div class="footer-social">
      <a href="https://x.com/lazydogtemplate" title="X (Twitter)" class="ic-x" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <!-- Facebook added 2 Aug 2026. Points at the LazyDog Templates *Page*, not
           the personal profile. Numeric id because Facebook gates usernames on
           new Pages — swap to /lazydogtemplates once that unlocks. -->
      <a href="https://www.facebook.com/profile.php?id=61592577276958" title="Facebook" class="ic-fb" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <a href="https://www.instagram.com/lazydogtemplates/" title="Instagram" class="ic-ig" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      </a>
      <a href="https://www.linkedin.com/company/lazydogtemplates" title="LinkedIn" class="ic-li" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
<!-- Email added 9 Aug 2026 — the footer had four ways to follow us and no way
           to write to us. "Contact Us" further down is a text link that is easy to
           miss; an icon in the same row is where people look. -->
      <a href="mailto:support@lazydogtemplates.com" title="support@lazydogtemplates.com" class="ic-mail" aria-label="Email us">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 5.25A2.25 2.25 0 013.75 3h16.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0120.25 21H3.75a2.25 2.25 0 01-2.25-2.25V5.25zm2.4-.75l7.494 6.017a1.05 1.05 0 001.312 0L20.2 4.5H3.9zM21 6.31l-7.31 5.87a2.55 2.55 0 01-3.19 0L3 6.31V18.75c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75V6.31z"/></svg>
      </a>
      <a href="https://apps.microsoft.com/detail/XP8LW3QG971T8N" title="Get LazyDog Editor on Microsoft Store" target="_blank" rel="noopener" class="ms-store-badge" style="display:inline-flex;align-items:center;gap:8px;background:#000;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;">
        <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="13" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="13" width="10" height="10" fill="#00a4ef"/><rect x="13" y="13" width="10" height="10" fill="#ffb900"/></svg>
        <span style="font-size:12px;font-weight:600;font-family:'Inter',sans-serif;">Microsoft Store</span>
      </a>
<!-- YouTube icon removed 29 Jul 2026: href="#", no channel behind it. -->
    </div>
    <div class="footer-legal-row">
      <a href="terms.html">Terms &amp; Conditions</a>
      <a href="terms.html#privacy">Privacy Policy</a>
      <a href="terms.html#refund">Refund Policy</a>
      <a href="terms.html#cookies">Cookies</a>
      <a href="faq.html">FAQ</a>
    </div>
  </div>

  <div class="footer-bar">
    <div class="footer-bar-logo"><span class="ld">LazyDog</span><span class="tmpl">Templates</span></div>
    <p>&#169; 2026 LazyDogTemplates. All rights reserved.</p>
  </div>
</footer>`;

  document.body.insertAdjacentHTML('beforeend', footerHTML);

})();

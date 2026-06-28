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
      <a href="invoice.html">Invoices</a>
      <a href="career_docs_folder_section.html">Career Documents</a>
      <a href="social_kits.html">Social Media Kits</a>
      <a href="web_kit_folder_file.html">Website UI Kits</a>
      <a href="pitch_deck_folder_section.html">Browse All</a>
      <a href="main.html#pro">Pro Plans</a>
    </div>
    <div class="footer-links">
      <h4>Industries</h4>
      <a href="#">Tech / AI</a>
      <a href="#">Medical</a>
      <a href="#">Finance</a>
      <a href="#">Construction</a>
      <a href="#">Education</a>
      <a href="#">Retail</a>
    </div>
    <div class="footer-links">
      <h4>Company</h4>
      <a href="#">About Us</a>
      <a href="#">Blog</a>
      <a href="#">Affiliate Program</a>
      <a href="#">Careers</a>
      <a href="mailto:lazydogtemplates@gmail.com">Contact Us</a>
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
      <a href="https://www.instagram.com/lazydogtemplates/" title="Instagram" class="ic-ig" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      </a>
      <a href="https://www.linkedin.com/company/lazydogtemplates" title="LinkedIn" class="ic-li" target="_blank" rel="noopener">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
      <a href="#" title="YouTube" class="ic-yt">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      </a>
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

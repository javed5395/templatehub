// reviews_widget.js — per-kit star ratings & written reviews.
// Any signed-in visitor may rate/review a kit (one review per person per
// kit — resubmitting updates their existing review instead of adding a
// second one). Reviews render on the page AND get folded into the page's
// existing #ldKitSchema JSON-LD as aggregateRating/review — but ONLY real
// reviews that are actually visible on the page. Nothing here ever invents
// a rating. If a kit has zero reviews, the schema simply carries none,
// exactly as before this file existed.
//
// Usage: call window.ldMountReviews(kitId, mountElementId) once the kit's
// own data has finished loading (kitId = the Firestore doc id / ?firebase=
// value; mountElementId = id of an empty <div> already in the page).
(function () {
  var _cfg = {
    apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
    authDomain: "templatehub-16cd7.firebaseapp.com",
    projectId: "templatehub-16cd7",
    storageBucket: "templatehub-16cd7.firebasestorage.app",
    messagingSenderId: "143000893683",
    appId: "1:143000893683:web:fd694de96f8c0fa6569f86"
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function starsHTML(n) {
    n = Math.round(n || 0);
    var out = '';
    for (var i = 1; i <= 5; i++) out += (i <= n ? '★' : '☆');
    return out;
  }

  window.ldMountReviews = async function (kitId, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount || !kitId) return;
    mount.innerHTML = '<div style="opacity:.6;font-size:14px;padding:20px 0;">Loading reviews…</div>';

    var appMod, fsMod, authMod;
    try {
      appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
      fsMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
      authMod = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
    } catch (e) { mount.innerHTML = ''; return; }

    var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(_cfg);
    var db = fsMod.getFirestore(app);
    var auth = authMod.getAuth(app);

    function patchSchema(list) {
      var s = document.getElementById('ldKitSchema');
      if (!s || !s.textContent) return;
      try {
        var ld = JSON.parse(s.textContent);
        if (!list.length) { delete ld.aggregateRating; delete ld.review; s.textContent = JSON.stringify(ld); return; }
        var sum = 0;
        list.forEach(function (r) { sum += (r.rating || 0); });
        ld.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: (sum / list.length).toFixed(1),
          reviewCount: list.length
        };
        ld.review = list.map(function (r) {
          return {
            '@type': 'Review',
            reviewRating: { '@type': 'Rating', ratingValue: String(r.rating || 0) },
            author: { '@type': 'Person', name: r.userName || 'LazyDogTemplates customer' },
            reviewBody: r.comment || ''
          };
        });
        s.textContent = JSON.stringify(ld);
      } catch (e) { /* schema patch is best-effort; never break the page over it */ }
    }

    function render(list, uid) {
      var mine = uid ? list.filter(function (r) { return r.uid === uid; })[0] : null;
      var avg = list.length ? (list.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / list.length) : 0;

      var html = '<div style="margin:32px auto;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);">';
      html += '<h3 style="margin:0 0 12px;font-size:18px;">Reviews</h3>';
      if (list.length) {
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">';
        html += '<span style="color:#d4af37;font-size:22px;letter-spacing:2px;">' + starsHTML(avg) + '</span>';
        html += '<span style="opacity:.75;font-size:14px;">' + avg.toFixed(1) + ' out of 5 · ' + list.length + (list.length === 1 ? ' review' : ' reviews') + '</span>';
        html += '</div>';
      } else {
        html += '<p style="opacity:.6;font-size:14px;margin-bottom:18px;">No reviews yet — be the first.</p>';
      }
      html += '<div id="ldReviewFormWrap"></div>';
      html += '<div id="ldReviewListWrap">';
      list.forEach(function (r) {
        html += '<div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">';
        html += '<div style="color:#d4af37;font-size:15px;">' + starsHTML(r.rating || 0) + '</div>';
        html += '<div style="font-size:13px;font-weight:600;margin-top:3px;">' + esc(r.userName || 'LazyDogTemplates customer') + '</div>';
        if (r.comment) html += '<div style="font-size:13px;opacity:.85;margin-top:5px;line-height:1.5;">' + esc(r.comment) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
      mount.innerHTML = html;

      var formWrap = document.getElementById('ldReviewFormWrap');
      if (!uid) {
        formWrap.innerHTML = '<button onclick="window.openAuth && window.openAuth(\'signin\')" style="padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:13px;cursor:pointer;margin-bottom:20px;">Sign in to leave a review</button>';
        return;
      }

      var chosen = mine ? mine.rating : 0;
      var myComment = mine ? (mine.comment || '') : '';
      var starsRow = '';
      for (var i = 1; i <= 5; i++) {
        starsRow += '<span class="ldStarPick" data-v="' + i + '" style="cursor:pointer;font-size:24px;padding-right:2px;color:' + (i <= chosen ? '#d4af37' : 'rgba(255,255,255,.25)') + ';">★</span>';
      }
      formWrap.innerHTML =
        '<div style="margin-bottom:22px;padding:16px;border-radius:12px;background:rgba(255,255,255,.04);">' +
        '<div style="font-size:13px;opacity:.75;margin-bottom:8px;">' + (mine ? 'Update your review' : 'Rate this kit') + '</div>' +
        '<div id="ldStarPicker" style="margin-bottom:10px;">' + starsRow + '</div>' +
        '<textarea id="ldReviewText" maxlength="1000" placeholder="What did you think? (optional)" style="width:100%;min-height:60px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.2);color:#fff;padding:8px;font-family:inherit;font-size:13px;box-sizing:border-box;">' + esc(myComment) + '</textarea>' +
        '<div style="margin-top:10px;"><button id="ldSubmitReview" style="padding:9px 18px;border-radius:8px;border:none;background:#d4af37;color:#111;font-weight:600;font-size:13px;cursor:pointer;">' + (mine ? 'Update review' : 'Submit review') + '</button></div>' +
        '</div>';

      var picks = formWrap.querySelectorAll('.ldStarPick');
      picks.forEach(function (el) {
        el.addEventListener('click', function () {
          chosen = parseInt(el.getAttribute('data-v'), 10);
          picks.forEach(function (p) { p.style.color = (parseInt(p.getAttribute('data-v'), 10) <= chosen) ? '#d4af37' : 'rgba(255,255,255,.25)'; });
        });
      });

      document.getElementById('ldSubmitReview').addEventListener('click', async function () {
        if (!chosen) { alert('Pick a star rating first.'); return; }
        var btn = document.getElementById('ldSubmitReview');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          var reviewId = kitId + '_' + uid;
          await fsMod.setDoc(fsMod.doc(db, 'reviews', reviewId), {
            kitId: kitId,
            uid: uid,
            userName: ((auth.currentUser && auth.currentUser.displayName) || 'LazyDogTemplates customer').slice(0, 80),
            rating: chosen,
            comment: (document.getElementById('ldReviewText').value || '').slice(0, 1000),
            createdAt: fsMod.serverTimestamp()
          });
        } catch (e) {
          alert('Could not save your review — please try again.');
          btn.disabled = false; btn.textContent = (mine ? 'Update review' : 'Submit review');
        }
      });
    }

    var unsub = authMod.onAuthStateChanged(auth, function () {
      if (unsub) { unsub(); unsub = null; }
      var q = fsMod.query(fsMod.collection(db, 'reviews'), fsMod.where('kitId', '==', kitId));
      fsMod.onSnapshot(q, function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(d.data()); });
        list.sort(function (a, b) {
          var ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
          var tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        var uid = auth.currentUser ? auth.currentUser.uid : null;
        render(list, uid);
        patchSchema(list);
      }, function () { mount.innerHTML = ''; });
    });
  };
})();

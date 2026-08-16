/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE 3D (real WebGL objects)          owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   The 3D BRAIN. Loads three.js lazily, builds real parametric meshes,
   renders them with lighting to a transparent texture, and places that
   texture on the fabric canvas as an object that REMEMBERS its 3D state
   (kind / colour / rotation). Alt+drag a selected 3D object to rotate it
   live — the mesh re-renders every frame, like PowerPoint 3D models.
   Overrides the flat-SVG insert3D from core.js (this file loads after it).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var _loading = null;
  function ensureThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (_loading) return _loading;
    _loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = THREE_URL;
      s.onload = function () { res(window.THREE); };
      s.onerror = function () { _loading = null; rej(new Error('three.js failed to load')); };
      document.head.appendChild(s);
    });
    return _loading;
  }

  /* one shared offscreen renderer */
  var R = null;
  function renderer() {
    var T = window.THREE;
    if (!R) {
      R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      R.setSize(512, 512);
      R.setClearColor(0x000000, 0);
    }
    return R;
  }

  function mesh(kind, colorHex) {
    var T = window.THREE;
    var mat = new T.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.25 });
    var flat = new T.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.25, flatShading: true });
    var g;
    switch (kind) {
      case 'cube':     return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), flat);
      case 'box':      return new T.Mesh(new T.BoxGeometry(2, 1.2, 1.2), flat);
      case 'sphere':   return new T.Mesh(new T.SphereGeometry(1.05, 48, 32), mat);
      case 'cylinder': return new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 1.8, 48), mat);
      case 'cone':     return new T.Mesh(new T.ConeGeometry(0.95, 1.9, 48), mat);
      case 'pyramid':  return new T.Mesh(new T.ConeGeometry(1.1, 1.7, 4), flat);
      case 'prism':    return new T.Mesh(new T.CylinderGeometry(1, 1, 1.5, 3), flat);
      case 'ring':     return new T.Mesh(new T.TorusGeometry(0.95, 0.38, 24, 64), mat);
      case 'diamond':  return new T.Mesh(new T.OctahedronGeometry(1.15), flat);
      case 'knot':     return new T.Mesh(new T.TorusKnotGeometry(0.75, 0.26, 128, 20), mat);
      case 'coins':
        g = new T.Group();
        for (var i = 0; i < 4; i++) {
          var c = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.22, 48), mat);
          c.position.y = -0.6 + i * 0.26;
          c.position.x = (i % 2 ? 0.06 : -0.04);
          g.add(c);
        }
        return g;
      case 'bars':
        g = new T.Group();
        [[-0.8, 0.8], [0, 1.4], [0.8, 2.0]].forEach(function (b) {
          var m = new T.Mesh(new T.BoxGeometry(0.55, b[1], 0.55), flat);
          m.position.set(b[0], b[1] / 2 - 1, 0);
          g.add(m);
        });
        return g;
      default:         return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), flat);
    }
  }

  function render3D(kind, colorHex, rx, ry) {
    var T = window.THREE;
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(35, 1, 0.1, 50);
    cam.position.set(0, 0, 5.2);
    scene.add(new T.AmbientLight(0xffffff, 0.55));
    var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(3, 4, 5); scene.add(key);
    var rim = new T.DirectionalLight(0x8b7cf3, 0.35); rim.position.set(-4, -2, -3); scene.add(rim);
    var m = mesh(kind, colorHex);
    m.rotation.x = rx || 0;
    m.rotation.y = ry || 0;
    scene.add(m);
    var r = renderer();
    r.render(scene, cam);
    return r.domElement.toDataURL('image/png');
  }

  function toast(m) { if (window.Editor && Editor._toast) Editor._toast(m); }

  /* ── insert: a fabric.Image that carries its 3D soul ── */
  Editor._register({
    insert3D: function (a) {
      if (!a || !a.kind) return;
      var color = a.color || '#7C3AED';
      ensureThree().then(function () {
        var rx = -0.35, ry = 0.65;   /* pleasant starting angle */
        var url = render3D(a.kind, color, rx, ry);
        fabric.Image.fromURL(url, function (img) {
          img.scaleToWidth(240);
          img.set({
            left: 220, top: 130,
            is3D: true, threeKind: a.kind, threeColor: color,
            rotX: rx, rotY: ry,
            layerName: (a.name || '3D object')
          });
          fc.add(img).setActiveObject(img);
          fc.renderAll(); saveState();
          toast((a.name || '3D object') + ' added — hold Alt and drag to rotate it in 3D');
        });
      }).catch(function () { toast('3D engine could not load — check your connection'); });
    }
  });

  /* ── live rotation: Alt+drag on a selected 3D object ── */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!window.fc || !fc.on) return;
      var rot = null, pending = false;
      fc.on('mouse:down', function (opt) {
        var o = opt && opt.target, e = opt && opt.e;
        if (!o || !o.is3D || !e || !e.altKey) return;
        rot = { o: o, x: e.clientX, y: e.clientY, rx: o.rotX || 0, ry: o.rotY || 0 };
        o.lockMovementX = true; o.lockMovementY = true;
      });
      fc.on('mouse:move', function (opt) {
        if (!rot || !opt.e) return;
        var o = rot.o;
        o.rotY = rot.ry + (opt.e.clientX - rot.x) * 0.012;
        o.rotX = rot.rx + (opt.e.clientY - rot.y) * 0.012;
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (!window.THREE) return;
          var url = render3D(o.threeKind, o.threeColor, o.rotX, o.rotY);
          o.setSrc(url, function () { fc.renderAll(); });
        });
      });
      function endRot() {
        if (!rot) return;
        var o = rot.o;
        o.lockMovementX = false; o.lockMovementY = false;
        rot = null;
        saveState();
      }
      fc.on('mouse:up', endRot);
      document.addEventListener('keyup', function (e) { if (e.key === 'Alt') endRot(); });
    }, 900);
  });
})();

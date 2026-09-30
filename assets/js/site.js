/* SoftOps — site behaviour. No dependencies. Everything degrades to a working static page. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav border once the page scrolls ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll(
    ".receipts__grid li, .section__head, .case, .also li, .caps li, .principles li, .first30, .company__text, .founders, .brief"
  );
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    var fold = window.innerHeight;
    revealTargets.forEach(function (el, i) {
      // Only animate what starts below the fold; anything already visible just stays put.
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 6) * 60 + "ms";
      io.observe(el);
    });
  }

  /* ---------- Case files: deep links open the right one ---------- */
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === "DETAILS") { el.open = true; el.classList.add("is-in"); }
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
  document.querySelectorAll("details.case").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open && history.replaceState) history.replaceState(null, "", "#" + d.id);
    });
  });

  /* ---------- Brief → pre-filled email ----------
     mailto: only works when the visitor has a mail app registered, and many webmail users don't,
     so the click can silently do nothing. We still try it, then always offer Gmail, Outlook and a
     copyable brief as a fallback. */
  var brief = document.getElementById("brief");
  if (brief) {
    var sent = document.getElementById("brief-sent");
    var copyBtn = document.getElementById("copy-brief");
    var current = null;

    brief.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(brief);
      var needs = fd.getAll("need");
      var when = fd.get("when");
      var about = (fd.get("about") || "").toString().trim();
      var body = [
        "Hello SoftOps,",
        "",
        "What we need: " + (needs.length ? needs.join(", ") : "(not sure yet)"),
        "Timing: " + (when || "(open)"),
        "",
        about || "A little about what we're building:",
        "",
        "—"
      ].join("\n");
      var subject = "Project brief" + (needs.length ? ": " + needs.slice(0, 2).join(" + ") : "");
      var to = brief.getAttribute("action").replace(/^mailto:/, "");
      var q = encodeURIComponent;
      current = { to: to, subject: subject, body: body };

      document.getElementById("via-gmail").href =
        "https://mail.google.com/mail/?view=cm&fs=1&to=" + q(to) + "&su=" + q(subject) + "&body=" + q(body);
      document.getElementById("via-outlook").href =
        "https://outlook.office.com/mail/deeplink/compose?to=" + q(to) + "&subject=" + q(subject) + "&body=" + q(body);
      copyBtn.textContent = "Copy brief";
      sent.hidden = false;

      location.href = "mailto:" + to + "?subject=" + q(subject) + "&body=" + q(body);
    });

    copyBtn.addEventListener("click", function () {
      if (!current) return;
      var text = "To: " + current.to + "\nSubject: " + current.subject + "\n\n" + current.body;
      function done() { copyBtn.textContent = "Copied — paste it into an email to " + current.to; }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { copyBtn.textContent = "Copy failed — email " + current.to; }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  }

  /* ---------- Footer: year and honest page weight ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  window.addEventListener("load", function () {
    var out = document.getElementById("weight");
    if (!out || !window.performance || !performance.getEntriesByType) return;
    setTimeout(function () {
      var nav0 = performance.getEntriesByType("navigation")[0];
      var total = nav0 ? (nav0.encodedBodySize || 0) : 0;
      var ext = 0;
      performance.getEntriesByType("resource").forEach(function (r) {
        total += r.encodedBodySize || 0;
        if (r.name.indexOf(location.origin) !== 0) ext++;
      });
      if (!total) return;
      out.textContent = "This page: " + Math.round(total / 1024) + " KB · " +
        (ext ? ext + " third-party requests" : "zero third-party requests") +
        " · no framework, trackers or cookies.";
    }, 300);
  });

  /* ---------- Hero: many points assemble into one mark ---------- */
  var canvas = document.getElementById("assemble");
  var art = canvas && canvas.parentElement;
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx || typeof Path2D === "undefined") { doc.classList.add("no-canvas"); return; }

  // The SoftOps mark, in its own 178 × 204 space (see #mark in index.html).
  var MARK_W = 178, MARK_H = 204;
  var markPath = new Path2D(
    "M64 0H140C162 0 178 18 178 42H76L49 63V88L86 126H36L0 90V62Z" +
    "M114 204H38C16 204 0 186 0 162H102L129 141V116L92 78H142L178 114V142Z"
  );

  var W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
  var parts = [], net = [], start = 0, running = false, visible = true, settledAt = 0;
  var pointer = { x: -9999, y: -9999, active: false };
  var color = "#ededef", lineRGB = "237,237,239";

  function readColors() {
    var cs = getComputedStyle(doc);
    color = cs.getPropertyValue("--text").trim() || color;
    var m = color.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      var n = parseInt(m[1], 16);
      lineRGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
    }
  }

  function samplePoints() {
    // Sample a grid inside the mark; spacing adapts so we get ~500–900 points.
    var probe = document.createElement("canvas").getContext("2d");
    var pts = [];
    var step = W < 360 ? 4.2 : 2.9;
    for (var y = 1; y < MARK_H; y += step) {
      for (var x = 1; x < MARK_W; x += step) {
        var jx = x + (Math.random() - 0.5) * step * 0.5;
        var jy = y + (Math.random() - 0.5) * step * 0.5;
        if (probe.isPointInPath(markPath, jx, jy)) pts.push([jx, jy]);
      }
    }
    return pts;
  }

  function layout() {
    var r = art.getBoundingClientRect();
    if (!r.width) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(W / MARK_W, H / MARK_H) * 0.62;
    ox = (W - MARK_W * scale) / 2; oy = (H - MARK_H * scale) / 2;
    return true;
  }

  function build() {
    var pts = samplePoints();
    parts = pts.map(function (p, i) {
      var a = Math.random() * Math.PI * 2, rad = Math.min(W, H) * (0.08 + Math.sqrt(Math.random()) * 0.4);
      var sx = W / 2 + Math.cos(a) * rad, sy = H / 2 + Math.sin(a) * rad;
      return {
        tx: ox + p[0] * scale, ty: oy + p[1] * scale,
        sx: sx, sy: sy, x: sx, y: sy, vx: 0, vy: 0,
        // Stagger arrival along the diagonal of the mark so it "draws" itself.
        delay: 700 + ((p[0] + p[1]) / (MARK_W + MARK_H)) * 900 + Math.random() * 350,
        net: i % 7 === 0,
        size: 1.3 + Math.random() * 0.7,
        seed: Math.random() * 1000
      };
    });
    net = parts.filter(function (p) { return p.net; });
  }

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 4); }

  function frame(now) {
    if (!running) return;
    var t = now - start;
    ctx.clearRect(0, 0, W, H);

    var moving = false;
    var assembleDur = 1600;
    var netAlpha = Math.max(0, 1 - t / 2200);

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var k = ease((t - p.delay) / assembleDur);
      // Before assembling: a slow drifting network. During: travel home. After: breathe.
      var drift = 1 - k;
      var bx = p.sx + (p.tx - p.sx) * k + Math.sin(now / 1400 + p.seed) * 14 * drift;
      var by = p.sy + (p.ty - p.sy) * k + Math.cos(now / 1600 + p.seed) * 14 * drift;
      var br = k === 1 ? Math.sin(now / 900 + p.seed) * 0.35 : 0;
      bx += br; by += br;

      // Pointer pushes points aside; a spring brings them back.
      if (pointer.active) {
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy, R = 70;
        if (d2 < R * R) {
          var d = Math.sqrt(d2) || 1, f = (1 - d / R) * 2.4;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      p.vx += (bx - p.x) * 0.12; p.vy += (by - p.y) * 0.12;
      p.vx *= 0.72; p.vy *= 0.72;
      p.x += p.vx; p.y += p.vy;
      if (k < 1 || Math.abs(p.vx) + Math.abs(p.vy) > 0.02) moving = true;
    }

    // Connections: only a subset of points, and only while they are still scattered.
    // Lines are batched into a few opacity buckets: one stroke per bucket, not per line.
    if (netAlpha > 0) {
      ctx.lineWidth = 0.6;
      var maxD = Math.min(W, H) * 0.18, maxD2 = maxD * maxD, BUCKETS = 4;
      var paths = [];
      for (var q0 = 0; q0 < BUCKETS; q0++) paths.push(new Path2D());
      for (var a = 0; a < net.length; a++) {
        var na = net[a];
        for (var b = a + 1; b < net.length; b++) {
          var nb = net[b], ddx = na.x - nb.x, ddy = na.y - nb.y, dd2 = ddx * ddx + ddy * ddy;
          if (dd2 < maxD2) {
            var bucket = Math.min(BUCKETS - 1, Math.floor((dd2 / maxD2) * BUCKETS));
            paths[bucket].moveTo(na.x, na.y); paths[bucket].lineTo(nb.x, nb.y);
          }
        }
      }
      for (var q1 = 0; q1 < BUCKETS; q1++) {
        ctx.strokeStyle = "rgba(" + lineRGB + "," + (0.24 * (1 - q1 / BUCKETS) * netAlpha).toFixed(3) + ")";
        ctx.stroke(paths[q1]);
      }
    }

    ctx.fillStyle = color;
    for (var j = 0; j < parts.length; j++) {
      var q = parts[j];
      ctx.globalAlpha = 0.45 + 0.55 * ease((t - q.delay) / assembleDur);
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;

    // Once settled and untouched, stop burning frames; pointer movement wakes it up.
    if (!moving && !pointer.active) {
      if (!settledAt) settledAt = now;
      if (now - settledAt > 1200) { running = false; return; }
    } else settledAt = 0;

    if (visible) requestAnimationFrame(frame);
    else running = false;
  }

  function run() {
    if (running || !visible) return;
    running = true; settledAt = 0;
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    parts.forEach(function (p) { p.x = p.tx; p.y = p.ty; ctx.fillRect(p.tx - p.size / 2, p.ty - p.size / 2, p.size, p.size); });
  }

  function init(animate) {
    readColors();
    if (!layout()) return;
    build();
    if (animate && !reduceMotion) { start = performance.now(); run(); }
    else { parts.forEach(function (p) { p.delay = -1e6; }); start = performance.now(); drawStatic(); }
  }

  init(true);

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { running = false; init(false); }, 150);
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function () {
    readColors(); if (!running) drawStatic();
  });

  if (!reduceMotion) {
    art.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
      run();
    });
    art.addEventListener("pointerleave", function () { pointer.active = false; pointer.x = pointer.y = -9999; run(); });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) run();
    }).observe(art);
  }
})();

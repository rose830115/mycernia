/* Mycernia MVP demo — render the curated database as a safe data table, a species
   detail modal, and a guided identify demo. Data comes from window.MYCERNIA_DATA
   (data/species.js): a public-safe subset — tier, LOO rate, accession counts, panel
   loci, habitat. No enzyme identities or fragment-length data. The identify demo runs
   on preset samples with precomputed outcomes; gels are schematic (illustrative) SVGs. */
(function () {
  "use strict";
  var DATA = window.MYCERNIA_DATA || { species: [], demo: {}, validation: {} };

  var GROUPS = [
    { key: "verified",   title: "High confidence", note: "Tier A — may be reported directly" },
    { key: "lower_tier", title: "Important species at lower confidence", note: "reported as a candidate set; confirm by sequencing" },
    { key: "wall",       title: "Honest hard walls", note: "RFLP cannot separate these — sequencing recommended" },
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function tierBadge(sp) { return '<span class="tier ' + sp.tier + '">Tier ' + sp.tier + "</span>"; }
  function looCell(sp) {
    if (sp.loo_pct == null) return '<span class="muted">n/a</span>';
    return '<span class="loo"><span class="loo-bar"><i style="width:' + sp.loo_pct +
      '%"></i></span>' + sp.loo_pct + "%</span>";
  }

  /* ---------- database table ---------- */
  function renderTable() {
    var host = document.getElementById("species-groups");
    if (!host) return;
    GROUPS.forEach(function (g) {
      var items = DATA.species.filter(function (s) { return s.group === g.key; });
      if (!items.length) return;
      host.appendChild(el("div", "group-title",
        g.title + ' <span class="count">— ' + items.length + " species · " + g.note + "</span>"));
      var table = el("table", "spectable");
      table.innerHTML =
        "<thead><tr><th>Species</th><th>Genus</th><th>Tier</th>" +
        "<th>LOO unique ID</th><th>Ref. sequences</th><th>Marker panel</th></tr></thead>";
      var tb = el("tbody");
      items.forEach(function (sp) {
        var wall = sp.indistinguishable_from.length ? ' <span class="wallflag" title="sequencing recommended">⚠</span>' : "";
        var demo = sp.worked_example ? ' <span class="demotag">demo</span>' : "";
        var tr = el("tr");
        tr.innerHTML =
          '<td class="sp"><em>' + sp.name + "</em>" + wall + demo + "</td>" +
          "<td>" + sp.genus + "</td><td>" + tierBadge(sp) + "</td>" +
          "<td>" + looCell(sp) + "</td><td>" + sp.n_accessions + "</td>" +
          '<td class="muted">' + sp.loci.join(" · ") + "</td>";
        tr.addEventListener("click", function () { openModal(sp.id); });
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      host.appendChild(table);
    });
  }

  /* ---------- species modal (no gel) ---------- */
  function row(k, v) { return '<div class="row"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"; }
  function openModal(id) {
    var sp = DATA.species.find(function (s) { return s.id === id; });
    if (!sp) return;
    var m = document.getElementById("modal");
    var wallbox = sp.indistinguishable_from.length
      ? '<div class="wallbox">⚠ Under RFLP this species is indistinguishable from <em>' +
          sp.indistinguishable_from.join("</em>, <em>") +
          "</em>. Mycernia flags the pair and recommends sequencing to resolve it.</div>"
      : "";
    var noteRow = sp.note ? row("Taxonomy note", sp.note) : "";
    var looRow = sp.loo_pct == null ? "n/a" : sp.loo_pct + "% of held-out isolates identified uniquely";
    m.innerHTML =
      '<div class="modal-pad"><button class="close" aria-label="Close">×</button>' +
        '<div class="sp"><em>' + sp.name + "</em></div>" +
        '<div class="ge">' + sp.genus + "</div>" +
        '<div class="meta">' + tierBadge(sp) +
          '<span class="muted" style="font-size:14px">' + sp.tier_label + "</span></div></div>" +
      '<div class="blurb">' + sp.blurb + "</div>" + wallbox +
      '<div class="rows">' +
        row("Marker panel", sp.loci.join(" + ")) +
        row("Confidence tier", "Tier " + sp.tier + " — " + sp.tier_label) +
        row("LOO unique ID", looRow) +
        row("Reference accessions", sp.n_accessions + " sequences") +
        noteRow +
        row("What Mycernia returns", "Nearest in-scope candidate with a calibrated label; sequencing is recommended for clinical, regulatory, or out-of-scope cases.") +
      "</div>";
    m.querySelector(".close").addEventListener("click", closeModal);
    document.getElementById("modal-bg").classList.add("open");
  }
  function closeModal() { document.getElementById("modal-bg").classList.remove("open"); }

  /* ---------- schematic gel (illustrative SVG) ---------- */
  // laneBands: array of sample lanes; each is an array of y-fractions (0..1).
  function gelSVG(laneBands) {
    var laneW = 26, gap = 18, padX = 20, padTop = 16, padBot = 16, innerH = 300;
    var ladder = [[0.08,0.7],[0.16,1],[0.27,0.5],[0.35,0.5],[0.44,0.5],[0.52,0.6],[0.61,0.7],[0.71,0.55],[0.82,0.85],[0.92,0.55]];
    var lanes = [{ladder: true}];
    laneBands.forEach(function (b) { lanes.push({bands: b}); });
    lanes.push({ladder: true});
    var W = padX*2 + lanes.length*laneW + (lanes.length-1)*gap;
    var H = padTop+padBot+innerH;
    var s = '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="schematic gel">';
    s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" rx="14" fill="#15171a"/>';
    lanes.forEach(function (ln, idx) {
      var x = padX + idx*(laneW+gap);
      var bands = ln.ladder ? ladder : ln.bands.map(function (y) { return [y, 0.95]; });
      bands.forEach(function (b) {
        var y = padTop + b[0]*innerH;
        s += '<rect x="'+x+'" y="'+(y-2.5)+'" width="'+laneW+'" height="5" rx="2" fill="#eef3f1" opacity="'+b[1]+'"/>';
      });
    });
    return s + "</svg>";
  }

  /* ---------- guided identify demo ---------- */
  function renderDemo() {
    var demo = DATA.demo || {}, samples = demo.samples;
    if (!samples || !samples.length) return;
    var picker = document.getElementById("sample-picker");
    var gelEl = document.getElementById("q-gel");
    var lanesEl = document.getElementById("q-lanes");
    var nameEl = document.getElementById("q-name");
    var runBtn = document.getElementById("run-btn");
    var stepsEl = document.getElementById("run-steps");
    var resultEl = document.getElementById("demo-result");
    var current = null, busy = false;

    samples.forEach(function (s, i) {
      var b = el("button", "sample-chip", s.chip);
      b.addEventListener("click", function () { if (!busy) select(i); });
      picker.appendChild(b);
    });

    function select(i) {
      current = samples[i];
      Array.prototype.forEach.call(picker.children, function (c, j) { c.classList.toggle("on", j === i); });
      gelEl.innerHTML = gelSVG(current.bands);
      if (lanesEl) lanesEl.textContent = "3 loci";
      if (nameEl) nameEl.textContent = current.query_name;
      stepsEl.innerHTML = "";
      resultEl.hidden = true; resultEl.innerHTML = "";
      runBtn.hidden = false; runBtn.disabled = false; runBtn.textContent = "Identify this sample";
    }

    function run() {
      if (busy || !current) return;
      busy = true; runBtn.disabled = true; runBtn.textContent = "Identifying…";
      stepsEl.innerHTML = ""; resultEl.hidden = true;
      var steps = current.steps, i = 0;
      (function next() {
        if (i > 0) {
          var prev = stepsEl.children[i-1];
          prev.className = "run-step done";
          prev.querySelector(".dot").outerHTML = '<span class="tick">✓</span>';
        }
        if (i < steps.length) {
          stepsEl.appendChild(el("div", "run-step", '<span class="dot"></span>' + steps[i]));
          i++; setTimeout(next, 720);
        } else {
          busy = false; runBtn.hidden = true;
          setTimeout(showResult, 360);
        }
      })();
    }

    function showResult() {
      var r = current.result, body;
      resultEl.className = "result " + r.kind;
      if (r.top1) {
        body = '<div class="rlabel ' + r.kind + '">' + r.label + '</div><div class="verdict">' + r.verdict +
          '</div><div class="top1">' + r.top1 + "</div>";
      } else {
        var list = r.candidates.map(function (c) { return "<em>" + c + "</em>"; }).join(", ");
        body = '<div class="rlabel ' + r.kind + '">' + r.label + '</div><div class="verdict">' + r.verdict +
          '</div><div class="candset">' + list + "</div>";
      }
      body += '<p class="anno">' + r.detail + '</p>' +
        '<div class="reco"><b>Next step:</b> ' + r.recommendation + "</div>";
      if (current.lesson) {
        body += '<button class="lesson-toggle" type="button">Why three loci? See ITS alone ▾</button>' +
          '<div class="lesson" hidden>' +
            '<div class="lesson-grid"><div class="lesson-gel">' + gelSVG(current.lesson.bands) + '</div>' +
            '<div><div class="candset">' + current.lesson.candidates.map(function (c) { return "<em>" + c + "</em>"; }).join(", ") +
            '</div><p class="anno">' + current.lesson.note + '</p>' +
            '<p class="src">' + current.lesson.rate + "</p></div></div></div>";
      }
      body += '<p class="src">Source: ' + (demo.source || "") + "</p>";
      resultEl.innerHTML = body;
      resultEl.hidden = false;
      var lt = resultEl.querySelector(".lesson-toggle");
      if (lt) lt.addEventListener("click", function () {
        var box = resultEl.querySelector(".lesson");
        box.hidden = !box.hidden;
        lt.innerHTML = box.hidden ? "Why three loci? See ITS alone ▾" : "Hide ITS-only comparison ▴";
      });
    }

    runBtn.addEventListener("click", run);
    select(0);
  }

  /* ---------- email CTA: copy-to-clipboard fallback + toast ----------
     The button keeps its mailto: href, so visitors with a configured mail
     client still get a pre-filled draft. But mailto silently does nothing
     when no client is set up — so on every click we also copy the address
     to the clipboard and show a toast. Everyone gets feedback. */
  function initEmailCTA() {
    var btn = document.getElementById("email-cta");
    var toast = document.getElementById("toast");
    if (!btn || !toast) return;
    var email = btn.getAttribute("data-email") || "";
    var timer = null;

    function showToast(html) {
      toast.innerHTML = html;
      toast.classList.add("show");
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove("show"); }, 4200);
    }

    function copyEmail() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(email);
      }
      return new Promise(function (resolve, reject) {
        try {
          var ta = document.createElement("textarea");
          ta.value = email;
          ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error("copy failed"));
        } catch (e) { reject(e); }
      });
    }

    btn.addEventListener("click", function () {
      // Let the mailto: default fire for those who have a mail client.
      copyEmail().then(function () {
        showToast("Email address copied — <b>" + email + "</b>");
      }).catch(function () {
        showToast("Contact us at <b>" + email + "</b>");
      });
    });
  }

  /* ---------- init ---------- */
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  document.getElementById("modal-bg").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
  renderTable();
  renderDemo();
  initEmailCTA();
})();

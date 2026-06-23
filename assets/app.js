/* Mycernia MVP demo — render the curated database as a safe data table, a species
   detail modal, and the single-locus vs multi-locus identify demo. Data comes
   from window.MYCERNIA_DATA (data/species.js): a public-safe subset — tier, LOO rate,
   accession counts, panel loci, habitat. No enzyme identities or fragment-length data.
   The demo gel is a schematic SVG (illustrative); no real fingerprint is shipped. */
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
        "<thead><tr>" +
          "<th>Species</th><th>Genus</th><th>Tier</th>" +
          "<th>LOO unique ID</th><th>Ref. sequences</th><th>Marker panel</th>" +
        "</tr></thead>";
      var tb = el("tbody");
      items.forEach(function (sp) {
        var wall = sp.indistinguishable_from.length ? ' <span class="wallflag" title="sequencing recommended">⚠</span>' : "";
        var demo = sp.worked_example ? ' <span class="demotag">demo</span>' : "";
        var tr = el("tr");
        tr.setAttribute("data-id", sp.id);
        tr.innerHTML =
          '<td class="sp"><em>' + sp.name + "</em>" + wall + demo + "</td>" +
          "<td>" + sp.genus + "</td>" +
          "<td>" + tierBadge(sp) + "</td>" +
          "<td>" + looCell(sp) + "</td>" +
          "<td>" + sp.n_accessions + "</td>" +
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
          '<span class="muted" style="font-size:14px">' + sp.tier_label + "</span></div>" +
      "</div>" +
      '<div class="blurb">' + sp.blurb + "</div>" +
      wallbox +
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
  function gelSVG(nSample) {
    var laneW = 26, gap = 18, padX = 20, padTop = 16, padBot = 16, innerH = 300;
    var ladder = [[0.08,0.7],[0.16,1],[0.27,0.5],[0.35,0.5],[0.44,0.5],[0.52,0.6],[0.61,0.7],[0.71,0.55],[0.82,0.85],[0.92,0.55]];
    var sampleSets = [[0.80,0.88],[0.75,0.83],[0.71]];
    var lanes = [];
    lanes.push({type:"ladder"});
    for (var i=0;i<nSample;i++) lanes.push({type:"sample",bands:sampleSets[i]});
    lanes.push({type:"ladder"});
    var W = padX*2 + lanes.length*laneW + (lanes.length-1)*gap;
    var H = padTop+padBot+innerH;
    var s = '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="schematic gel">';
    s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" rx="14" fill="#15171a"/>';
    lanes.forEach(function(ln,idx){
      var x = padX + idx*(laneW+gap);
      var bands = ln.type==="ladder" ? ladder : ln.bands.map(function(y){return [y,0.95];});
      bands.forEach(function(b){
        var y = padTop + b[0]*innerH;
        s += '<rect x="'+x+'" y="'+(y-2.5)+'" width="'+laneW+'" height="5" rx="2" fill="#eef3f1" opacity="'+b[1]+'"/>';
      });
    });
    s += "</svg>";
    return s;
  }

  /* ---------- identify demo (single-locus vs multi-locus) ---------- */
  function renderDemo() {
    var demo = DATA.demo || {}, modes = demo.modes, hl = demo.headline;
    if (!modes) return;
    var nameEl = document.getElementById("q-name"); if (nameEl) nameEl.textContent = demo.query_name || "";
    var gelEl = document.getElementById("q-gel");
    var lanesEl = document.getElementById("q-lanes");
    var resultEl = document.getElementById("demo-result");

    function paint(key) {
      var m = modes[key];
      if (gelEl) gelEl.innerHTML = gelSVG(m.sample_lanes);
      if (lanesEl) lanesEl.textContent = m.lanes;
      var body;
      if (m.unique) {
        body = '<div class="verdict">' + m.verdict + "</div><div class=\"top1\">" + m.top1 + "</div>";
      } else {
        var list = m.candidates.map(function (c) { return "<em>" + c + "</em>"; }).join(", ");
        body = '<div class="verdict">' + m.verdict + '</div><div class="candset">' + list +
          (m.candidates_more ? ' <span class="muted">' + m.candidates_more + "</span>" : "") + "</div>";
      }
      resultEl.className = "result " + (m.unique ? "good" : "bad");
      resultEl.innerHTML = body + '<p class="anno">' + m.annotation + "</p>" +
        '<p class="src">Source: ' + (demo.source || "") + "</p>";
    }

    var btns = document.querySelectorAll("#fp-toggle button");
    btns.forEach(function (b) {
      b.textContent = modes[b.getAttribute("data-mode")].label;
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("on"); x.removeAttribute("aria-selected"); });
        b.classList.add("on"); b.setAttribute("aria-selected", "true");
        paint(b.getAttribute("data-mode"));
      });
    });
    paint("multi");

    if (hl) {
      document.getElementById("demo-headline").innerHTML =
        '<div class="big">' + hl.text.replace(hl.single, "<b>" + hl.single + "</b>")
                                      .replace(hl.multi, "<b>" + hl.multi + "</b>") + "</div>" +
        '<div class="src muted" style="font-size:13px">' + hl.source + "</div>";
    }
  }

  /* ---------- init ---------- */
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  document.getElementById("modal-bg").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
  renderTable();
  renderDemo();
})();

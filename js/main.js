(function () {
  "use strict";

  var burger = document.querySelector(".hdr__burger");
  var drawer = document.getElementById("drawer");
  var navLinks = document.querySelectorAll(".hdr__nav a, .drawer a");

  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    if (open) {
      drawer.removeAttribute("hidden");
    } else {
      drawer.setAttribute("hidden", "");
    }
  }

  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      setDrawer(open);
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      setDrawer(false);
    });
  });

  // Highlight current section in sticky nav
  var sections = ["top", "rules", "teams", "schedule", "results"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function updateActiveNav() {
    var y = window.scrollY + 100;
    var current = "top";
    sections.forEach(function (sec) {
      if (sec.offsetTop <= y) current = sec.id;
    });
    document.querySelectorAll(".hdr__nav a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      a.classList.toggle("is-active", href === "#" + current);
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  // Countdowns: kickoff (開幕) + next-match (対局中 / 次の対局まで)
  var MATCH_DAYS = [
    { ymd: "2026-11-06", startIso: "2026-11-06T21:00:00+09:00", sub: "2026年11月6日（金）21:00 配信開始予定（Asia/Tokyo）" },
    { ymd: "2026-11-15", startIso: "2026-11-15T21:00:00+09:00", sub: "2026年11月15日（日） 21:00 配信開始予定（Asia/Tokyo）" },
    { ymd: "2026-11-27", startIso: "2026-11-27T21:00:00+09:00", sub: "2026年11月27日（金） 21:00 配信開始予定（Asia/Tokyo）" },
    { ymd: "2026-12-06", startIso: "2026-12-06T21:00:00+09:00", sub: "2026年12月6日（日） 配信開始予定（Asia/Tokyo）※時刻は追って掲載" },
    { ymd: "2026-12-18", startIso: "2026-12-18T21:00:00+09:00", sub: "2026年12月18日（金） 配信開始予定（Asia/Tokyo）※時刻は追って掲載" },
    { ymd: "2026-12-27", startIso: "2026-12-27T21:00:00+09:00", sub: "2026年12月27日（日） 配信開始予定（Asia/Tokyo）※時刻は追って掲載" },
    { ymd: "2027-01-08", startIso: "2027-01-08T21:00:00+09:00", sub: "2027年1月8日（金） 配信開始予定（Asia/Tokyo）※時刻は追って掲載" },
    { ymd: "2027-01-17", startIso: "2027-01-17T21:00:00+09:00", sub: "2027年1月17日（日）・最終戦 配信開始予定（Asia/Tokyo）※時刻は追って掲載" }
  ];

  var countdownRoots = Array.prototype.slice.call(
    document.querySelectorAll("[data-countdown]")
  );

  if (countdownRoots.length) {
    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function tokyoYmd(ms) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(ms));
    }

    function findMatchByYmd(ymd) {
      for (var i = 0; i < MATCH_DAYS.length; i++) {
        if (MATCH_DAYS[i].ymd === ymd) return MATCH_DAYS[i];
      }
      return null;
    }

    function showStatus(root, text) {
      var grid = root.querySelector("[data-cd-grid]");
      var done = root.querySelector("[data-cd-done]");
      var label = root.querySelector(".cd__label");
      var sub = root.querySelector(".cd__sub");
      if (grid) grid.hidden = true;
      if (label) label.hidden = true;
      if (sub) sub.hidden = true;
      if (done) {
        done.hidden = false;
        done.textContent = text;
      }
      root.classList.add("is-live");
    }

    function showCountdown(root) {
      var grid = root.querySelector("[data-cd-grid]");
      var done = root.querySelector("[data-cd-done]");
      var label = root.querySelector(".cd__label");
      var sub = root.querySelector(".cd__sub");
      if (grid) grid.hidden = false;
      if (label) label.hidden = false;
      if (sub) sub.hidden = false;
      if (done) done.hidden = true;
      root.classList.remove("is-live");
    }

    function applyTick(root, diff) {
      var daysEl = root.querySelector('[data-cd="days"]');
      var hoursEl = root.querySelector('[data-cd="hours"]');
      var minsEl = root.querySelector('[data-cd="mins"]');
      var secsEl = root.querySelector('[data-cd="secs"]');
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      var secs = Math.floor((diff % 60000) / 1000);
      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);
    }

    function tickKickoff(root, now) {
      var targetIso = root.getAttribute("data-target") || "2026-11-06T21:00:00+09:00";
      var target = new Date(targetIso).getTime();
      var diff = target - now;
      if (diff <= 0) {
        showStatus(root, "リーグ期間中");
        return true;
      }
      showCountdown(root);
      applyTick(root, diff);
      return false;
    }

    function tickNextMatch(root, now) {
      var today = tokyoYmd(now);
      if (findMatchByYmd(today)) {
        showStatus(root, "対局中");
        return false;
      }

      var next = null;
      for (var i = 0; i < MATCH_DAYS.length; i++) {
        if (MATCH_DAYS[i].ymd > today) {
          next = MATCH_DAYS[i];
          break;
        }
      }

      if (!next) {
        showStatus(root, "リーグ終了");
        return true;
      }

      var target = new Date(next.startIso).getTime();
      var diff = target - now;
      var sub = root.querySelector("[data-cd-sub]") || root.querySelector(".cd__sub");
      if (sub) sub.textContent = next.sub;
      if (diff <= 0) {
        showStatus(root, "対局中");
        return false;
      }
      showCountdown(root);
      applyTick(root, diff);
      return false;
    }

    function tickAll() {
      var now = Date.now();
      var allDone = true;
      countdownRoots.forEach(function (root) {
        var mode = root.getAttribute("data-countdown") || "kickoff";
        var done = mode === "next-match" ? tickNextMatch(root, now) : tickKickoff(root, now);
        if (!done) allDone = false;
      });
      return allDone;
    }

    tickAll();
    setInterval(tickAll, 1000);
  }

  // —— Results: load data/results.json and render ——
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatScore(score) {
    if (score == null || score === "") return "—";
    var n = Number(score);
    if (Number.isNaN(n)) return escapeHtml(score);
    var sign = n > 0 ? "+" : "";
    return sign + n.toLocaleString("ja-JP");
  }


  function showEmpty(container) {
    if (!container) return;
    var empty = container.querySelector("[data-empty-state]");
    var filled = container.querySelector("[data-filled-state]");
    if (empty) empty.hidden = false;
    if (filled) filled.hidden = true;
  }

  function showFilled(container) {
    if (!container) return;
    var empty = container.querySelector("[data-empty-state]");
    var filled = container.querySelector("[data-filled-state]");
    if (empty) empty.hidden = true;
    if (filled) filled.hidden = false;
  }

  function renderTeamRanking(data) {
    var container = document.querySelector('[data-results="teamRanking"]');
    if (!container) return;
    var rows = (data && data.teamRanking) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.score != null; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var tbody = container.querySelector('[data-results-body="teamRanking"]');
    if (!tbody) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });
    tbody.innerHTML = sorted.map(function (row) {
      var rankClass = "rank" + (row.rank === 1 ? " rank--1" : "");
      return (
        "<tr>" +
        '<td class="' + rankClass + '">' + escapeHtml(row.rank) + "</td>" +
        '<td class="name-cell">' + escapeHtml(row.name) + "</td>" +
        '<td class="score">' + formatScore(row.score) + "</td>" +
        '<td class="games">' + escapeHtml(row.games != null ? row.games : "—") + "</td>" +
        "</tr>"
      );
    }).join("");
    showFilled(container);
  }

  function renderPlayerScores(data) {
    var container = document.querySelector('[data-results="playerScores"]');
    if (!container) return;
    var rows = (data && data.playerScores) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.name; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var tbody = container.querySelector('[data-results-body="playerScores"]');
    if (!tbody) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });
    tbody.innerHTML = sorted.map(function (row) {
      var rankClass = "rank" + (row.rank === 1 ? " rank--1" : "");
      return (
        "<tr>" +
        '<td class="' + rankClass + '">' + escapeHtml(row.rank) + "</td>" +
        '<td class="name-cell">' + escapeHtml(row.name) + "</td>" +
        '<td class="team-cell">' + escapeHtml(row.team) + "</td>" +
        '<td class="score">' + formatScore(row.score) + "</td>" +
        '<td class="games">' + escapeHtml(row.games != null ? row.games : "—") + "</td>" +
        "</tr>"
      );
    }).join("");
    showFilled(container);
  }

  function renderTopScores(data) {
    var container = document.querySelector('[data-results="topScores"]');
    if (!container) return;
    var rows = (data && data.topScores) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.name; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var list = container.querySelector('[data-results-body="topScores"]');
    if (!list) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    }).slice(0, 3);
    list.innerHTML = sorted.map(function (row) {
      var metaParts = [];
      if (row.date) metaParts.push(escapeHtml(row.date));
      if (row.note) metaParts.push(escapeHtml(row.note));
      var meta = metaParts.length
        ? '<p class="top-score-card__meta">' + metaParts.join(" ／ ") + "</p>"
        : "";
      return (
        '<li class="top-score-card top-score-card--' + escapeHtml(row.rank) + '">' +
        '<span class="top-score-card__rank">TOP ' + escapeHtml(row.rank) + "</span>" +
        '<p class="top-score-card__score">' + formatScore(row.score) + "</p>" +
        '<p class="top-score-card__name">' + escapeHtml(row.name) + "</p>" +
        '<p class="top-score-card__team">' + escapeHtml(row.team) + "</p>" +
        meta +
        "</li>"
      );
    }).join("");
    showFilled(container);
  }


  function renderSample(data) {
    var on = !!(data && data.sample);
    document.querySelectorAll("[data-sample-banner]").forEach(function (el) { el.hidden = !on; });
  }

  var TEAM_ORDER = ["koneko", "apple", "pandaz", "nekojyaku"];
  function renderDays(data) {
    var days = (data && data.days) || {};
    Object.keys(days).forEach(function (day) {
      var li = document.querySelector('.sched-item[data-day="' + day + '"]');
      var games = days[day] && days[day].games;
      if (!li || !games || !games.length) return;
      var tags = li.querySelector(".sched-item__tags");
      if (tags && !tags.querySelector(".tag--done")) {
        tags.insertAdjacentHTML("afterbegin", '<span class="tag tag--done">終了' + (data.sample ? "（サンプル）" : "") + "</span>");
      }
      var rows = li.querySelectorAll(".sched-cards tbody tr");
      games.forEach(function (g, i) {
        var tr = rows[i];
        if (!tr) return;
        var tds = tr.querySelectorAll("td");
        TEAM_ORDER.forEach(function (tid, j) {
          var r = g[tid];
          if (!r || !tds[j]) return;
          tds[j].innerHTML = escapeHtml(r.name) +
            '<span class="sched-res' + (r.rank === 1 ? " sched-res--top" : "") + '">' +
            escapeHtml(r.rank) + "位 " + formatScore(r.score) + "</span>";
        });
      });
    });
  }

  function applyResults(data) {
    renderSample(data);
    renderDays(data);
    // Always keep empty UI when updatedAt is null (pre-kickoff)
    if (!data || data.updatedAt == null) {
      showEmpty(document.querySelector('[data-results="teamRanking"]'));
      showEmpty(document.querySelector('[data-results="playerScores"]'));
      showEmpty(document.querySelector('[data-results="topScores"]'));
      return;
    }
    renderTeamRanking(data);
    renderPlayerScores(data);
    renderTopScores(data);
  }

  function loadResults() {
    // Keep embedded empty state if fetch fails (e.g. file://)
    fetch("data/results.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("results.json " + res.status);
        return res.json();
      })
      .then(applyResults)
      .catch(function () {
        // Fall back to HTML empty state already in the page
        showEmpty(document.querySelector('[data-results="teamRanking"]'));
        showEmpty(document.querySelector('[data-results="playerScores"]'));
        showEmpty(document.querySelector('[data-results="topScores"]'));
      });
  }

  loadResults();
})();

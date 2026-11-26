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
  // 一時休止中: true の間は両カウントダウンを「一時休止中」で固定。再開時は false。
  var LEAGUE_PAUSED = false;
  // 実施する対局日のみ（11/15中止・11/27お休みは含めない）
  var MATCH_DAYS = [
    { ymd: "2026-11-06", startIso: "2026-11-06T21:00:00+09:00", sub: "2026年11月6日（金）21:00 開始（Asia/Tokyo）" },
    { ymd: "2026-12-06", startIso: "2026-12-06T21:00:00+09:00", sub: "2026年12月6日（日）21:00 開始（Asia/Tokyo）" },
    { ymd: "2026-12-18", startIso: "2026-12-18T21:00:00+09:00", sub: "2026年12月18日（金）21:00 開始（Asia/Tokyo）" },
    { ymd: "2026-12-27", startIso: "2026-12-27T21:00:00+09:00", sub: "2026年12月27日（日）21:00 開始（Asia/Tokyo）" },
    { ymd: "2027-01-08", startIso: "2027-01-08T21:00:00+09:00", sub: "2027年1月8日（金）21:00 開始（Asia/Tokyo）" },
    { ymd: "2027-01-17", startIso: "2027-01-17T21:00:00+09:00", sub: "2027年1月17日（日）21:00 開始（Asia/Tokyo）" },
    { ymd: "2027-01-29", startIso: "2027-01-29T21:00:00+09:00", sub: "2027年1月29日（金）21:00 開始（Asia/Tokyo）" },
    { ymd: "2027-02-07", startIso: "2027-02-07T21:00:00+09:00", sub: "2027年2月7日（日）・最終節 21:00 開始（Asia/Tokyo）" }
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

    // Match-day window (Asia/Tokyo): countdown until 21:00,
    // then 対局中 through 23:59:59; after midnight, next match / finished.
    function resolveNextMatch(now) {
      var today = tokyoYmd(now);
      var todayMatch = findMatchByYmd(today);
      if (todayMatch) {
        var start = new Date(todayMatch.startIso).getTime();
        if (now >= start) {
          return { kind: "live", text: "対局中" };
        }
        return {
          kind: "countdown",
          target: start,
          sub: todayMatch.sub
        };
      }

      var next = null;
      for (var i = 0; i < MATCH_DAYS.length; i++) {
        if (MATCH_DAYS[i].ymd > today) {
          next = MATCH_DAYS[i];
          break;
        }
      }

      if (!next) {
        return { kind: "finished", text: "リーグ終了" };
      }

      return {
        kind: "countdown",
        target: new Date(next.startIso).getTime(),
        sub: next.sub
      };
    }

    function tickNextMatch(root, now) {
      var state = resolveNextMatch(now);
      if (state.kind === "live" || state.kind === "finished") {
        showStatus(root, state.text);
        return state.kind === "finished";
      }

      var sub = root.querySelector("[data-cd-sub]") || root.querySelector(".cd__sub");
      if (sub) sub.textContent = state.sub;
      var diff = state.target - now;
      if (diff <= 0) {
        // Safety: treat overdue target as live rather than negative countdown.
        showStatus(root, "対局中");
        return false;
      }
      showCountdown(root);
      applyTick(root, diff);
      return false;
    }

    function tickAll() {
      if (LEAGUE_PAUSED) {
        countdownRoots.forEach(function (root) { showStatus(root, "一時休止中"); });
        return true;
      }
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

  var TEAM_IDS = { "小猫熊": "koneko", "お前をApple牌": "apple", "Apple牌": "apple", "PANDAaaaZ": "pandaz", "猫雀カルテット": "nekojyaku" };
  function teamLabel(name, id) {
    id = id || TEAM_IDS[name];
    var img = id ? '<img class="team-logo" src="assets/logos/team-' + escapeHtml(id) + '.png" alt="" width="32" height="32" loading="lazy">' : "";
    return '<span class="team-label">' + img + "<span>" + escapeHtml(name) + "</span></span>";
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
        '<td class="name-cell">' + teamLabel(row.name, row.teamId) + "</td>" +
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
        '<td class="team-cell">' + teamLabel(row.team, row.teamId) + "</td>" +
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
        '<p class="top-score-card__team">' + teamLabel(row.team, row.teamId) + "</p>" +
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

  // —— Notice carousel (horizontal snap; past notice is not in the vertical flow) ——
  (function initNoticeCarousel() {
    var root = document.querySelector("[data-notice-carousel]");
    if (!root) return;

    var viewport = root.querySelector("[data-notice-viewport]");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".notice-carousel__slide"));
    var prevBtn = root.querySelector("[data-notice-prev]");
    var nextBtn = root.querySelector("[data-notice-next]");
    var dots = Array.prototype.slice.call(root.querySelectorAll("[data-notice-dot]"));
    if (!viewport || slides.length < 2) return;

    var index = 0;
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}

    function clamp(i) {
      return Math.max(0, Math.min(slides.length - 1, i));
    }

    function slideWidth() {
      return viewport.clientWidth;
    }

    // Scroll position of a slide *inside the viewport*, not offsetLeft
    // (offsetLeft is relative to offsetParent=body, so on wide screens
    // goTo(0) overshoots the midpoint and scroll-snap jumps to the last slide).
    function slideTargetLeft(i) {
      var slide = slides[i];
      if (!slide) return 0;
      return viewport.scrollLeft + slide.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
    }

    function currentFromScroll() {
      var origin = viewport.getBoundingClientRect().left;
      var best = 0;
      var bestDist = Infinity;
      for (var s = 0; s < slides.length; s++) {
        var dist = Math.abs(slides[s].getBoundingClientRect().left - origin);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      return best;
    }

    function updateHeight() {
      var slide = slides[index];
      if (!slide) return;
      var article = slide.querySelector(".notice") || slide;
      var styles = window.getComputedStyle(viewport);
      var pad = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
      viewport.style.height = (article.offsetHeight + pad) + "px";
    }

    function updateUI() {
      slides.forEach(function (slide, i) {
        var on = i === index;
        slide.setAttribute("aria-hidden", on ? "false" : "true");
        var article = slide.querySelector(".notice");
        if (article) {
          if (on) article.removeAttribute("inert");
          else article.setAttribute("inert", "");
        }
      });
      dots.forEach(function (dot, i) {
        var on = i === index;
        dot.classList.toggle("is-active", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1;
      updateHeight();
    }

    function goTo(i, instant) {
      index = clamp(i);
      var left = slideTargetLeft(index);
      if (typeof viewport.scrollTo === "function") {
        viewport.scrollTo({
          left: left,
          behavior: instant || reduceMotion ? "auto" : "smooth"
        });
      } else {
        viewport.scrollLeft = left;
      }
      updateUI();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () { goTo(index - 1); });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () { goTo(index + 1); });
    }
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var i = parseInt(dot.getAttribute("data-notice-dot"), 10);
        if (!isNaN(i)) goTo(i);
      });
    });

    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    });

    var scrollTick = 0;
    viewport.addEventListener("scroll", function () {
      if (scrollTick) return;
      scrollTick = window.requestAnimationFrame(function () {
        scrollTick = 0;
        var i = currentFromScroll();
        if (i !== index) {
          index = i;
          updateUI();
        }
      });
    }, { passive: true });

    var wheelLock = false;
    viewport.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelLock) return;
      if (e.deltaX > 10) {
        wheelLock = true;
        goTo(index + 1);
      } else if (e.deltaX < -10) {
        wheelLock = true;
        goTo(index - 1);
      }
      setTimeout(function () { wheelLock = false; }, 420);
    }, { passive: false });

    // Mouse drag (Windows / PC): native overflow scrolling is touch/trackpad only.
    var dragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var dragMoved = false;

    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartScroll = viewport.scrollLeft;
      viewport.classList.add("is-dragging");
      try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
    });

    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 3) dragMoved = true;
      if (dragMoved) {
        e.preventDefault();
        viewport.scrollLeft = dragStartScroll - dx;
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      goTo(currentFromScroll(), true);
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("lostpointercapture", function () {
      if (dragging) endDrag();
    });

    window.addEventListener("resize", function () {
      goTo(index, true);
    });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { updateHeight(); });
      slides.forEach(function (slide) { ro.observe(slide); });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { updateHeight(); });
    }

    goTo(0, true);
  })();
})();

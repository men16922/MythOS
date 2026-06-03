// MythOS API PoC client — vanilla JS over the /api/v1 contract.
// Proves REST (connect) + WebSocket token streaming + presigned image URLs
// drive a full loop end-to-end, with no build toolchain. UX language follows
// streamlit_app.py (green terminal). See docs/plans/2026-06-03-poc-ux-improvement.md.

const $ = (id) => document.getElementById(id);
const state = {
  playerId: null,
  loopId: null,
  socket: null,
  streaming: false,
  // typewriter queue: tokens land in `queue`, a timer drains chars into `typed`.
  queue: "",
  typed: "",
  typer: null,
  streamDone: false,
  pendingSnapshot: null,
  // combat (REST action loop, separate from the WS narrative stream)
  combat: null,
  combatTarget: null,
  busy: false,
};

function log(line) {
  const el = $("log");
  el.textContent += line + "\n";
  el.scrollTop = el.scrollHeight;
}
function setStatus(text) { $("status").textContent = text; }
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- rendering --------------------------------------------------------------

function renderSnapshot(snap) {
  state.loopId = snap.loop_id;
  state.combat = snap.combat || null;
  const scene = snap.active_scene || {};
  $("scene-title").textContent = scene.title || "";
  renderHud(snap);
  resolveImage(snap.assets || []);
  renderCombat(snap.combat);
}

// After the narration finishes typing, show either narrative choices or, if a
// combat is active in the snapshot, the combat action controls.
function finalizeScene(snap) {
  if (!snap) return;
  const combat = snap.combat;
  const cc = $("combat-controls");
  if (combat && combat.radar && combat.finished === false) {
    $("choices").innerHTML = "";
    renderCombatControls(combat);
  } else {
    cc.className = ""; cc.innerHTML = "";
    renderChoices((snap.active_scene || {}).choices || []);
  }
}

function renderHud(snap) {
  $("hud-meta").innerHTML =
    `루프 <b>${snap.loop_id || "—"}</b> · 국면 <b>${snap.phase || "—"}</b> · 위치 <b>${snap.location || "—"}</b>`;
  setGauge("stab", snap.stability, false);
  setGauge("tens", snap.tension, true);
}

function setGauge(key, value, dangerHigh) {
  const v = Number.isFinite(value) ? value : 0;
  $(`g-${key}-v`).textContent = Number.isFinite(value) ? value : "—";
  const fill = $(`g-${key}`);
  fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
  const risky = dangerHigh ? v >= 70 : v <= 30;
  fill.style.background = risky ? "var(--danger)" : dangerHigh && v >= 45 ? "var(--warn)" : "var(--term)";
}

function renderChoices(choices) {
  const box = $("choices");
  box.innerHTML = "";
  choices.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "command-card";
    btn.innerHTML =
      `<div class="cmd-hotkey">[${i + 1}] COMMAND</div>` +
      `<div class="cmd-label">${escapeHtml(c.label || "")}</div>` +
      (c.intent ? `<div class="cmd-intent">${escapeHtml(c.intent)}</div>` : "");
    btn.onclick = () => sendChoose(c.choice_id);
    box.appendChild(btn);
  });
}

async function resolveImage(assets) {
  const ok = assets.find((a) => a.status === "succeeded" && a.storage_uri);
  if (!ok) return; // image (if any) arrives later via visual_status
  try {
    const { url } = await api("/api/v1/assets/resolve", { storage_uri: ok.storage_uri });
    showImage(url);
  } catch (err) { log("image resolve 실패: " + err.message); }
}
function showImage(url) {
  const img = $("scene-img");
  img.onload = () => img.classList.add("shown");
  img.src = url;
  $("image-ph").style.display = "none";
}

// --- combat canvas (responsive, labels, HP bars, range ring) ----------------

function renderCombat(combat) {
  const canvas = $("combat");
  const radar = combat && combat.radar;
  if (!radar || !radar.blips || !radar.blips.length) { canvas.style.display = "none"; return; }
  canvas.style.display = "block";
  canvas.style.cursor = combat.available && combat.available.can_act ? "pointer" : "default";

  const cols = (radar.arena && radar.arena.w) || 8;
  const rows = (radar.arena && radar.arena.h) || 6;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth;
  const cssH = Math.round((cssW * rows) / cols);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const cw = cssW / cols, ch = cssH / rows;

  // reachable cells for the active unit (translucent fill)
  const reach = (combat.available && combat.available.reachable) || [];
  ctx.fillStyle = "rgba(41,255,198,0.12)";
  reach.forEach(([x, y]) => ctx.fillRect(x * cw, y * ch, cw, ch));

  // grid
  ctx.strokeStyle = "rgba(41,255,198,0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, cssH); ctx.stroke(); }
  for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(cssW, y * ch); ctx.stroke(); }

  const factionColor = (f) => (f === "player" ? "#8fffea" : f === "ally" ? "#7dff9b" : "#ff6b7d");
  radar.blips.forEach((b) => {
    const cx = b.x * cw + cw / 2, cy = b.y * ch + ch / 2;
    const r = Math.min(cw, ch) * 0.28;
    const alive = b.alive !== false;
    ctx.globalAlpha = alive ? 1 : 0.3;

    // active turn ring
    if (radar.current && b.id === radar.current) {
      ctx.strokeStyle = "rgba(255,215,106,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    // unit dot
    ctx.fillStyle = factionColor(b.faction);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // defending shield
    if (b.defending) { ctx.strokeStyle = "#cfe"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r + 2, -0.6, 3.74); ctx.stroke(); }

    // name label above
    ctx.globalAlpha = alive ? 0.9 : 0.4;
    ctx.fillStyle = "#d6fff6";
    ctx.font = `${Math.max(8, Math.round(ch * 0.16))}px "SF Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText((b.name || b.id || "").slice(0, 8), cx, cy - r - 3);

    // HP bar below
    if (b.max_hp) {
      const bw = cw * 0.7, bh = 3, bx = cx - bw / 2, by = cy + r + 3;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx, by, bw, bh);
      const ratio = b.hp_ratio != null ? b.hp_ratio : b.hp / b.max_hp;
      ctx.fillStyle = ratio > 0.5 ? "#7dff9b" : ratio > 0.25 ? "#ffd76a" : "#ff6b7d";
      ctx.fillRect(bx, by, bw * Math.max(0, ratio), bh);
    }
    ctx.globalAlpha = 1;
  });
}

// --- combat action controls (REST /api/v1/combat/action loop) ---------------

function ccSection(label, inner) {
  return `<div class="cc-section"><div class="cc-label">${label}</div><div class="cc-row">${inner}</div></div>`;
}

function renderCombatControls(combat) {
  state.combat = combat;
  const cc = $("combat-controls");
  cc.className = "active";
  const av = combat.available || {};
  const radar = combat.radar || {};
  const enemies = (av.targets || []);
  if (!state.combatTarget || !enemies.some((t) => t.id === state.combatTarget)) {
    state.combatTarget = enemies[0] ? enemies[0].id : null;
  }
  if (!av.can_act) { cc.innerHTML = '<div class="cc-hint">상대 턴 진행 중…</div>'; return; }

  let html = `<div class="combat-bar"><span class="turn">교전 · R${radar.round || 1}</span>` +
    `<span class="focus">FOCUS ${av.focus ?? "—"}/${av.max_focus ?? "—"}</span></div>`;

  if (enemies.length) {
    html += ccSection("표적", enemies.map((t) =>
      `<button class="cc-btn tgt ${t.id === state.combatTarget ? "sel" : ""}" data-tgt="${t.id}">` +
      `${escapeHtml(t.name)} · HP ${t.hp}/${t.max_hp}${t.in_range ? "" : " · 사거리밖"}</button>`).join(""));
  }

  html += ccSection("행동",
    `<button class="cc-btn" data-act="attack">공격</button>` +
    `<button class="cc-btn" data-act="defend">방어</button>` +
    `<button class="cc-btn" data-act="wait">대기</button>` +
    `<button class="cc-btn danger" data-act="flee">도주</button>`);

  if (av.skills && av.skills.length) {
    html += ccSection("스킬", av.skills.map((s) =>
      `<button class="cc-btn" data-skill="${s.id}" ${s.cooldown > 0 ? "disabled" : ""}>` +
      `${escapeHtml(s.id)}${s.cooldown > 0 ? ` (CD ${s.cooldown})` : ""}</button>`).join(""));
  }

  html += `<div class="cc-hint">우측 전술 보드의 밝게 표시된 칸을 클릭하면 그 위치로 이동합니다.</div>`;
  cc.innerHTML = html;

  cc.querySelectorAll("[data-tgt]").forEach((b) => (b.onclick = () => { state.combatTarget = b.dataset.tgt; renderCombatControls(state.combat); }));
  cc.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () =>
    doCombatAction({ type: b.dataset.act, target_id: b.dataset.act === "attack" ? state.combatTarget : undefined })));
  cc.querySelectorAll("[data-skill]").forEach((b) => (b.onclick = () =>
    doCombatAction({ type: "skill", skill_id: b.dataset.skill, target_id: state.combatTarget })));
}

async function doCombatAction(action) {
  if (state.busy) return;
  state.busy = true;
  setStatus("행동 처리 중…");
  try {
    const r = await api("/api/v1/combat/action", { loop_id: state.loopId, action });
    if (r.prose) $("narration").textContent = r.prose;
    state.combat = r.combat;
    renderCombat(r.combat);
    if (r.combat.finished) renderCombatOutcome(r.combat);
    else renderCombatControls(r.combat);
    setStatus("행동 적용.");
  } catch (e) {
    setStatus("행동 실패: " + e.message); log(e.message);
  } finally {
    state.busy = false;
  }
}

function renderCombatOutcome(combat) {
  const cc = $("combat-controls");
  cc.className = "active";
  const lose = combat.outcome === "player_defeat";
  const label = { player_victory: "승리", player_fled: "도주 성공", player_defeat: "패배" }[combat.outcome] || combat.outcome || "종료";
  const btn = lose
    ? `<button class="cc-btn" id="cc-restart">새 루프 시작 ▸</button>`
    : `<button class="cc-btn" id="cc-continue">계속 ▸</button>`;
  cc.innerHTML = `<div class="combat-outcome ${lose ? "lose" : ""}">교전 종료 — ${label}</div>` +
    `<div class="cc-row" style="margin-top:10px">${btn}</div>`;
  if (lose) $("cc-restart").onclick = streamBegin;
  else $("cc-continue").onclick = continueAfterCombat;
}

function continueAfterCombat() {
  if (state.streaming) return;
  $("combat-controls").className = ""; $("combat-controls").innerHTML = "";
  $("scene-img").classList.remove("shown");
  beginStream("전투 이후 · 스트리밍…");
  state.socket.send(JSON.stringify({
    event: "choose", loop_id: state.loopId,
    action: "전투의 여파를 살피고 다음 행동을 준비한다",
    fallback: $("fallback").checked, ...imageOpts(),
  }));
}

// --- visual_status (image arrives after the snapshot) -----------------------

function onVisualStatus(msg) {
  const ph = $("image-ph");
  if (msg.status === "pending" || msg.status === "processing") {
    ph.style.display = "block"; ph.textContent = "그림 생성 중… (" + msg.status + ")";
    setStatus("그림 생성 중…");
  } else if (msg.status === "succeeded" && msg.url) {
    setStatus("그림 완성."); showImage(msg.url);
  } else {
    ph.textContent = "그림 생성 실패: " + msg.status;
    setStatus("그림 생성 실패: " + msg.status); log("visual_status: " + msg.status);
  }
}

// --- typewriter + streaming -------------------------------------------------

function startTyper() {
  if (state.typer) return;
  state.typer = setInterval(() => {
    if (state.queue.length) {
      const step = Math.max(1, Math.floor(state.queue.length / 60)); // adaptive: long text types faster
      state.typed += state.queue.slice(0, step);
      state.queue = state.queue.slice(step);
      $("narration").innerHTML = escapeHtml(state.typed) + '<span class="caret">▌</span>';
    } else if (state.streamDone) {
      // finished: drop caret and reveal choices (or combat controls)
      clearInterval(state.typer); state.typer = null; state.streaming = false;
      $("narration").innerHTML = escapeHtml(state.typed);
      finalizeScene(state.pendingSnapshot);
    }
  }, 14);
}

function beginStream(label) {
  state.streaming = true; state.streamDone = false; state.pendingSnapshot = null;
  state.queue = ""; state.typed = "";
  $("choices").innerHTML = "";
  $("narration").innerHTML = '<span class="caret">▌</span>';
  setStatus(label);
  startTyper();
}

function openSocket() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/api/v1/loops/stream`);
  state.socket = socket;
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "token") {
      state.queue += msg.content;
    } else if (msg.type === "snapshot") {
      state.streamDone = true;
      state.pendingSnapshot = msg.data;
      setStatus("장면 확정.");
      renderSnapshot(msg.data); // hud/image/combat now; choices after typing completes
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      state.streamDone = true; state.streaming = false;
      setStatus("오류: " + msg.detail); log("WS error: " + msg.detail);
    }
  };
  socket.onclose = () => log("WS 연결 종료.");
  return new Promise((resolve) => (socket.onopen = () => resolve(socket)));
}

function imageOpts() {
  const on = $("with-image").checked;
  return { with_image: on, visual_async: on, image_every_turn: on };
}

function streamBegin() {
  $("scene-img").classList.remove("shown");
  $("image-ph").style.display = "block";
  beginStream("루프 생성 · 토큰 스트리밍…");
  state.socket.send(JSON.stringify({ event: "begin", player_id: state.playerId, fallback: $("fallback").checked, ...imageOpts() }));
}

function sendChoose(choiceId) {
  if (state.streaming) return;
  $("scene-img").classList.remove("shown");
  beginStream("선택 적용 · 스트리밍…");
  state.socket.send(JSON.stringify({ event: "choose", loop_id: state.loopId, choice_id: choiceId, fallback: $("fallback").checked, ...imageOpts() }));
}

async function start() {
  $("start").disabled = true;
  try {
    setStatus("접속 중…");
    const player = await api("/api/v1/auth/connect", { display_name: $("display-name").value });
    state.playerId = player.player_id;
    log("접속: " + player.player_id);
    await openSocket();
    streamBegin();
  } catch (err) {
    setStatus("실패: " + err.message); log(err.message);
  } finally {
    $("start").disabled = false;
  }
}

// keyboard 1-9 → choice
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) {
    const btns = document.querySelectorAll("#choices button");
    if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
  }
});

// click a highlighted (reachable) board cell to move there
$("combat").addEventListener("click", (e) => {
  const combat = state.combat;
  if (!combat || !combat.radar || state.busy) return;
  const av = combat.available || {};
  if (!av.can_act) return;
  const cols = (combat.radar.arena && combat.radar.arena.w) || 8;
  const rows = (combat.radar.arena && combat.radar.arena.h) || 6;
  const rect = e.target.getBoundingClientRect();
  const cx = Math.floor((e.clientX - rect.left) / (rect.width / cols));
  const cy = Math.floor((e.clientY - rect.top) / (rect.height / rows));
  const reachable = av.reachable || [];
  if (reachable.some(([x, y]) => x === cx && y === cy)) {
    doCombatAction({ type: "wait", x: cx, y: cy }); // move only
  }
});

window.addEventListener("resize", () => { /* combat redraws on next snapshot */ });
$("start").onclick = start;

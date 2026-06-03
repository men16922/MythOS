// MythOS API PoC client — vanilla JS over the /api/v1 contract.
// Proves REST (connect) + WebSocket token streaming + presigned image URLs
// drive a full loop end-to-end, with no build toolchain. UX language follows
// streamlit_app.py (green terminal). See docs/plans/2026-06-03-poc-ux-improvement.md.

const $ = (id) => document.getElementById(id);
const state = { playerId: null, loopId: null, socket: null, streaming: false, buffer: "" };

function log(line) {
  const el = $("log");
  el.textContent += line + "\n";
  el.scrollTop = el.scrollHeight;
}

function setStatus(text) {
  $("status").textContent = text;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${path} → ${res.status}: ${detail}`);
  }
  return res.json();
}

// --- rendering --------------------------------------------------------------

function renderSnapshot(snap) {
  state.loopId = snap.loop_id;
  const scene = snap.active_scene || {};
  $("scene-title").textContent = scene.title || "";
  $("narration").textContent = scene.narration || "";
  renderHud(snap);
  renderChoices(scene.choices || []);
  resolveImage(snap.assets || []);
  renderCombat(snap.combat);
}

function renderHud(snap) {
  $("hud-meta").innerHTML =
    `루프 <b>${snap.loop_id || "—"}</b> · 국면 <b>${snap.phase || "—"}</b> · 위치 <b>${snap.location || "—"}</b>`;
  setGauge("stab", snap.stability, false);
  setGauge("tens", snap.tension, true);
}

// high tension / low stability = danger color.
function setGauge(key, value, dangerHigh) {
  const v = Number.isFinite(value) ? value : 0;
  $(`g-${key}-v`).textContent = Number.isFinite(value) ? value : "—";
  const fill = $(`g-${key}`);
  fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
  const risky = dangerHigh ? v >= 70 : v <= 30;
  fill.style.background = risky ? "var(--danger)" : v >= 45 || !dangerHigh ? "var(--term)" : "var(--warn)";
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

function resolveImageReset() {
  const img = $("scene-img");
  img.classList.remove("shown");
}

async function resolveImage(assets) {
  const succeeded = assets.find((a) => a.status === "succeeded" && a.storage_uri);
  if (!succeeded) return; // image (if any) arrives later via visual_status
  try {
    const { url } = await api("/api/v1/assets/resolve", { storage_uri: succeeded.storage_uri });
    showImage(url);
  } catch (err) {
    log("image resolve 실패: " + err.message);
  }
}

function showImage(url) {
  const img = $("scene-img");
  img.onload = () => img.classList.add("shown");
  img.src = url;
  $("image-ph").style.display = "none";
}

function renderCombat(combat) {
  const canvas = $("combat");
  if (!combat || !combat.radar || !combat.radar.blips) {
    canvas.style.display = "none";
    return;
  }
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const radar = combat.radar;
  const cols = radar.cols || 8;
  const rows = radar.rows || 6;
  const cw = canvas.width / cols;
  const ch = canvas.height / rows;
  ctx.strokeStyle = "rgba(41,255,198,0.16)";
  for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(canvas.width, y * ch); ctx.stroke(); }
  radar.blips.forEach((b) => {
    ctx.fillStyle = b.faction === "player" ? "#8fffea" : b.faction === "ally" ? "#7dff9b" : "#ff6b7d";
    ctx.beginPath();
    ctx.arc(b.x * cw + cw / 2, b.y * ch + ch / 2, Math.min(cw, ch) / 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// --- visual_status (image arrives after the snapshot) -----------------------

function onVisualStatus(msg) {
  if (msg.status === "pending" || msg.status === "processing") {
    $("image-ph").style.display = "block";
    $("image-ph").textContent = "그림 생성 중… (" + msg.status + ")";
    setStatus("그림 생성 중…");
  } else if (msg.status === "succeeded" && msg.url) {
    setStatus("그림 완성.");
    showImage(msg.url);
  } else {
    $("image-ph").textContent = "그림 생성 실패: " + msg.status;
    setStatus("그림 생성 실패: " + msg.status);
    log("visual_status: " + msg.status);
  }
}

// --- streaming --------------------------------------------------------------

function imageOpts() {
  const on = $("with-image").checked;
  return { with_image: on, visual_async: on, image_every_turn: on };
}

function beginStream(label) {
  state.streaming = true;
  state.buffer = "";
  $("narration").innerHTML = '<span class="caret">▌</span>';
  setStatus(label);
}

function appendToken(content) {
  state.buffer += content;
  $("narration").innerHTML = escapeHtml(state.buffer) + '<span class="caret">▌</span>';
}

function openSocket() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/api/v1/loops/stream`);
  state.socket = socket;
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "token") {
      appendToken(msg.content);
    } else if (msg.type === "snapshot") {
      state.streaming = false;
      setStatus("장면 확정.");
      renderSnapshot(msg.data);
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      state.streaming = false;
      setStatus("오류: " + msg.detail);
      log("WS error: " + msg.detail);
    }
  };
  socket.onclose = () => log("WS 연결 종료.");
  return new Promise((resolve) => (socket.onopen = () => resolve(socket)));
}

function streamBegin() {
  resolveImageReset();
  $("image-ph").style.display = "block";
  beginStream("루프 생성 · 토큰 스트리밍…");
  state.socket.send(JSON.stringify({ event: "begin", player_id: state.playerId, fallback: $("fallback").checked, ...imageOpts() }));
}

function sendChoose(choiceId) {
  if (state.streaming) return;
  resolveImageReset();
  beginStream("선택 적용 · 스트리밍…");
  document.querySelectorAll("#choices button").forEach((b) => (b.disabled = true));
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
    setStatus("실패: " + err.message);
    log(err.message);
  } finally {
    $("start").disabled = false;
  }
}

// keyboard 1-4 → choice
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) {
    const btns = document.querySelectorAll("#choices button");
    if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
  }
});

$("start").onclick = start;

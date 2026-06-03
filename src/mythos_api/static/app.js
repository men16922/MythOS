// MythOS API PoC client — vanilla JS over the /api/v1 contract.
// Proves REST (connect) + WebSocket token streaming + presigned image URLs
// drive a full loop end-to-end, with no build toolchain.

const $ = (id) => document.getElementById(id);
const state = { playerId: null, loopId: null, socket: null };

function log(line) {
  const el = $("log");
  el.textContent += line + "\n";
  el.scrollTop = el.scrollHeight;
}

function setStatus(text) {
  $("status").textContent = text;
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

function renderSnapshot(snap) {
  state.loopId = snap.loop_id;
  const scene = snap.active_scene || {};
  $("scene-title").textContent = scene.title || "";
  $("narration").textContent = scene.narration || "";
  $("gauges").innerHTML =
    `루프 <b>${snap.loop_id}</b><br>국면 <b>${snap.phase}</b> · 위치 <b>${snap.location}</b><br>` +
    `안정 <b>${snap.stability}</b> · 긴장 <b>${snap.tension}</b>`;
  renderChoices(scene.choices || []);
  resolveImage(snap.assets || []);
  renderCombat(snap.combat);
}

function renderChoices(choices) {
  const box = $("choices");
  box.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = `▸ ${c.label}`;
    btn.onclick = () => sendChoose(c.choice_id);
    box.appendChild(btn);
  });
}

async function resolveImage(assets) {
  const img = $("scene-img");
  const succeeded = assets.find((a) => a.status === "succeeded" && a.storage_uri);
  if (!succeeded) {
    img.style.display = "none";
    return;
  }
  try {
    const { url } = await api("/api/v1/assets/resolve", { storage_uri: succeeded.storage_uri });
    img.src = url;
    img.style.display = "block";
  } catch (err) {
    log("image resolve 실패: " + err.message);
  }
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
  ctx.strokeStyle = "#16263c";
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(canvas.width, y * ch); ctx.stroke();
  }
  radar.blips.forEach((b) => {
    ctx.fillStyle = b.faction === "player" ? "#38e8ff" : b.faction === "ally" ? "#7dff9b" : "#ff5f7a";
    ctx.beginPath();
    ctx.arc(b.x * cw + cw / 2, b.y * ch + ch / 2, Math.min(cw, ch) / 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function openSocket() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/api/v1/loops/stream`);
  state.socket = socket;
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "token") {
      $("narration").textContent += msg.content;
    } else if (msg.type === "snapshot") {
      setStatus("장면 확정.");
      renderSnapshot(msg.data);
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      setStatus("오류: " + msg.detail);
      log("WS error: " + msg.detail);
    }
  };
  socket.onclose = () => log("WS 연결 종료.");
  return new Promise((resolve) => (socket.onopen = () => resolve(socket)));
}

function imageOpts() {
  const on = $("with-image").checked;
  return { with_image: on, visual_async: on, image_every_turn: on };
}

// Image arrives after the snapshot: pending/processing show a placeholder,
// succeeded swaps in the presigned URL (design §2.2).
function onVisualStatus(msg) {
  const img = $("scene-img");
  if (msg.status === "pending" || msg.status === "processing") {
    setStatus("그림 생성 중… (" + msg.status + ")");
  } else if (msg.status === "succeeded" && msg.url) {
    setStatus("그림 완성.");
    img.src = msg.url;
    img.style.display = "block";
  } else {
    setStatus("그림 생성 실패: " + msg.status);
    log("visual_status: " + msg.status);
  }
}

function streamBegin() {
  $("narration").textContent = "";
  setStatus("루프 생성 + 토큰 스트리밍…");
  state.socket.send(
    JSON.stringify({
      event: "begin",
      player_id: state.playerId,
      fallback: $("fallback").checked,
      ...imageOpts(),
    })
  );
}

function sendChoose(choiceId) {
  $("narration").textContent = "";
  setStatus("선택 적용 + 스트리밍…");
  document.querySelectorAll("#choices button").forEach((b) => (b.disabled = true));
  state.socket.send(
    JSON.stringify({
      event: "choose",
      loop_id: state.loopId,
      choice_id: choiceId,
      fallback: $("fallback").checked,
      ...imageOpts(),
    })
  );
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

$("start").onclick = start;

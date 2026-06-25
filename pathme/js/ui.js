// ─────────────────────────────────────────────────────────────
// ui.js  —  DOM 렌더링 전담 모듈
//
// 역할:
//   - 채팅 메시지(AI/사용자) 렌더링
//   - 타이핑 인디케이터 표시/제거
//   - 추천 카드 렌더링
//   - 취향 태그 바 업데이트
//   - 입력창 리셋
//
// 이 파일은 상태(state)를 직접 변경하지 않습니다.
// 이벤트 콜백만 외부(app.js)에서 주입받습니다.
// ─────────────────────────────────────────────────────────────

// ── DOM 참조 ─────────────────────────────────────────────────
const DOM = {
  get chatMessages() { return document.getElementById("chatMessages"); },
  get resultList()   { return document.getElementById("resultList"); },
  get resultSubtitle(){ return document.getElementById("resultSubtitle"); },
  get profileBar()   { return document.getElementById("profileBar"); },
  get profileTags()  { return document.getElementById("profileTags"); },
  get userInput()    { return document.getElementById("userInput"); },
  get sendBtn()      { return document.getElementById("sendBtn"); },
};

// ── 채팅: AI 메시지 추가 ─────────────────────────────────────
/**
 * @param {string}   text         - 출력할 메시지 (줄바꿈 \n 지원)
 * @param {string[]} chips        - 빠른 선택 버튼 목록
 * @param {Function} onChipClick  - 칩 클릭 시 호출될 콜백 (text) => void
 */
function addAIMessage(text, chips = [], onChipClick = null) {
  const row = document.createElement("div");
  row.className = "msg-row";
  row.innerHTML = `
    <div class="avatar ai">🌿</div>
    <div class="bubble ai">${text.replace(/\n/g, "<br>")}</div>
  `;
  DOM.chatMessages.appendChild(row);

  if (chips.length > 0 && onChipClick) {
    const chipRow = document.createElement("div");
    chipRow.className = "quick-chips";
    chips.forEach(chip => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = chip;
      btn.onclick = () => {
        disableAllChips();
        onChipClick(chip);
      };
      chipRow.appendChild(btn);
    });
    DOM.chatMessages.appendChild(chipRow);
  }

  scrollToBottom();
}

// ── 채팅: 사용자 메시지 추가 ─────────────────────────────────
function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `
    <div class="avatar user-av">나</div>
    <div class="bubble user">${text.replace(/\n/g, "<br>")}</div>
  `;
  DOM.chatMessages.appendChild(row);
  scrollToBottom();
}

// ── 채팅: 타이핑 인디케이터 ──────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.className = "msg-row";
  row.id = "typingRow";
  row.innerHTML = `
    <div class="avatar ai">🌿</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  DOM.chatMessages.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById("typingRow");
  if (el) el.remove();
}

// ── 추천 카드 렌더링 ─────────────────────────────────────────
/**
 * @param {Array}  recommendations  - [{ id, score, reason }, ...]
 * @param {Array}  dbPlaces         - CHUNCHEON_DB (id로 매칭)
 * @param {boolean} append          - true면 기존 카드에 이어붙임
 */
function renderRecommendations(recommendations, dbPlaces, append = false) {
  if (!append) {
    DOM.resultList.innerHTML = "";
    DOM.resultSubtitle.textContent = `${recommendations.length}곳을 찾았어요`;
  } else {
    const current = DOM.resultList.querySelectorAll(".place-card").length;
    DOM.resultSubtitle.textContent = `${current + recommendations.length}곳을 찾았어요`;
  }

  const medals = ["🥇", "🥈", "🥉", "4", "5", "6"];

  recommendations.forEach((rec, idx) => {
    const place = dbPlaces.find(p => p.id === rec.id);
    if (!place) return;

    const baseIdx = append
      ? DOM.resultList.querySelectorAll(".place-card").length
      : idx;

    const card = document.createElement("div");
    card.className = "place-card";
    card.style.animationDelay = `${idx * 0.08}s`;
    card.innerHTML = `
      <div class="card-rank">${medals[baseIdx] ?? "★"} 추천 ${baseIdx + 1}</div>
      <div class="card-name">${place.name}</div>
      <div class="card-category">${place.category} · ${place.indoor ? "실내" : "야외"} · ${place.price}</div>
      <div class="score-row">
        <div class="score-bar-wrap">
          <div class="score-bar" style="width: ${rec.score}%"></div>
        </div>
        <span class="score-label">${rec.score}%</span>
      </div>
      <div class="card-tags">
        ${place.tags.slice(0, 5).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="card-reason">
        ${rec.reason}
        <br><br>
        <strong>💡 Tip:</strong> ${place.tip}
      </div>
    `;
    DOM.resultList.appendChild(card);
  });
}

// ── 취향 태그 바 ─────────────────────────────────────────────
function updateProfileTags(tags) {
  DOM.profileTags.innerHTML = tags
    .map(t => `<span class="profile-tag">${t}</span>`)
    .join("");
  DOM.profileBar.classList.add("visible");
}

// ── 빈 상태 (초기 오른쪽 패널) ──────────────────────────────
function showEmptyState() {
  DOM.resultList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🗺️</div>
      <h3>아직 추천 결과가 없어요</h3>
      <p>AI와 대화하며 취향을 알려주시면 딱 맞는 춘천 여행지를 추천해드려요.</p>
    </div>
  `;
  DOM.resultSubtitle.textContent = "대화를 통해 취향을 알려주세요";
}

// ── 입력창 제어 ──────────────────────────────────────────────
function setInputDisabled(disabled) {
  DOM.sendBtn.disabled = disabled;
  DOM.userInput.disabled = disabled;
}

function clearInput() {
  DOM.userInput.value = "";
  DOM.userInput.style.height = "auto";
}

function getInputValue() {
  return DOM.userInput.value.trim();
}

function getApiKeyInputValue() {
  return DOM.apiKeyInput.value.trim();
}

// ── 내부 유틸 ────────────────────────────────────────────────
function scrollToBottom() {
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function disableAllChips() {
  document.querySelectorAll(".chip").forEach(c => {
    c.style.pointerEvents = "none";
    c.style.opacity = "0.5";
  });
}

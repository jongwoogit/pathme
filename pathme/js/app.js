// ─────────────────────────────────────────────────────────────
// app.js  —  상태 관리 & 전체 흐름 오케스트레이션
// ─────────────────────────────────────────────────────────────

// ↓↓ 여기에 OpenAI API 키를 입력하세요 ↓↓
const OPENAI_API_KEY = "여기에_API_키_입력";
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

// ── 앱 상태 ──────────────────────────────────────────────────
const state = {
  apiKey: OPENAI_API_KEY,

  // 현재 대화 단계 인덱스 (0 = 아직 첫 질문 전)
  step: 0,

  // 사용자 취향 프로필 { companion, mood, activity, indoor, budget }
  profile: {},

  // 전체 대화 히스토리 [{ role: "user"|"assistant", content: string }]
  history: [],

  // API 호출 중 여부 (중복 요청 방지)
  loading: false,

  // 이미 추천한 여행지 id 목록 (추가 추천 시 제외용)
  recommendedIds: [],
};

// ── 초기화 ───────────────────────────────────────────────────
function init() {
  // 첫 AI 메시지 출력 (greeting 단계)
  const first = CONVERSATION_FLOW[0];
  addAIMessage(first.ai, first.chips, handleUserInput);
  state.step = 1;

  // 이벤트 핸들러 등록
  setupEventListeners();
}

// ── 이벤트 핸들러 등록 ───────────────────────────────────────
function setupEventListeners() {
  document.getElementById("sendBtn").addEventListener("click", onSendClick);

  document.getElementById("userInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendClick();
    }
  });

  document.getElementById("userInput").addEventListener("input", () => {
    const el = document.getElementById("userInput");
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  });
}

// ── 전송 버튼 클릭 처리 ──────────────────────────────────────
function onSendClick() {
  const text = getInputValue();
  if (!text || state.loading) return;
  clearInput();
  handleUserInput(text);
}

// ── 사용자 입력 메인 처리 ────────────────────────────────────
async function handleUserInput(text) {
  if (text === "다시 처음부터") { location.reload(); return; }
  if (text === "추천 더 보여줘") { addUserMessage(text); await handleMoreRecommendations(); return; }

  addUserMessage(text);
  state.history.push({ role: "user", content: text });

  const currentFlow = CONVERSATION_FLOW[state.step - 1];
  if (currentFlow?.profileKey) {
    state.profile[currentFlow.profileKey] = text;
  }

  const nextFlow = CONVERSATION_FLOW[state.step];

  if (nextFlow) {
    if (!CONVERSATION_FLOW[state.step]?.profileKey && state.step < CONVERSATION_FLOW.length) {
      state.profile[LAST_PROFILE_KEY] = text;
    }
    setTimeout(() => {
      addAIMessage(nextFlow.ai, nextFlow.chips, handleUserInput);
      state.step++;
    }, 600);
  } else {
    state.profile[LAST_PROFILE_KEY] = text;
    state.step++;
    await generateRecommendations();
  }
}

// ── 추천 생성 (첫 번째) ──────────────────────────────────────
async function generateRecommendations() {
  setLoading(true);
  showTyping();

  try {
    const result = await fetchRecommendations(
      state.profile,
      state.history,
      CHUNCHEON_DB,
      state.apiKey
    );

    removeTyping();

    state.recommendedIds = result.recommendations.map(r => r.id);

    updateProfileTags(result.profileTags);
    renderRecommendations(result.recommendations, CHUNCHEON_DB, false);

    state.history.push({ role: "assistant", content: result.message });
    addAIMessage(result.message, ["추천 더 보여줘", "다시 처음부터"], handleUserInput);

  } catch (err) {
    removeTyping();
    console.error(err);
    addAIMessage(`오류가 발생했어요 😥\n${err.message}\n\nAPI 키를 확인하거나 페이지를 새로고침 해주세요.`, [], null);
  } finally {
    setLoading(false);
  }
}

// ── 추가 추천 ─────────────────────────────────────────────────
async function handleMoreRecommendations() {
  const remaining = CHUNCHEON_DB.filter(p => !state.recommendedIds.includes(p.id));

  if (remaining.length === 0) {
    addAIMessage("추천할 수 있는 모든 춘천 여행지를 보여드렸어요! 다시 처음부터 시작하면 취향을 바꿔서 다른 추천을 받을 수 있어요.", ["다시 처음부터"], handleUserInput);
    return;
  }

  setLoading(true);
  showTyping();

  try {
    const result = await fetchMoreRecommendations(state.profile, remaining, state.apiKey);

    removeTyping();

    state.recommendedIds.push(...result.recommendations.map(r => r.id));

    renderRecommendations(result.recommendations, CHUNCHEON_DB, true);
    addAIMessage(result.message, ["추천 더 보여줘", "다시 처음부터"], handleUserInput);

  } catch (err) {
    removeTyping();
    console.error(err);
    addAIMessage(`추가 추천을 불러오는데 실패했어요.\n${err.message}`, [], null);
  } finally {
    setLoading(false);
  }
}

// ── 로딩 상태 토글 ───────────────────────────────────────────
function setLoading(val) {
  state.loading = val;
  setInputDisabled(val);
}

// ── 시작 ─────────────────────────────────────────────────────
init();

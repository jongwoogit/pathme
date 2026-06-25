// ─────────────────────────────────────────────────────────────
// api.js  —  Claude API 호출 전담 모듈
//
// 역할:
//   - Anthropic /v1/messages 엔드포인트 호출
//   - 프롬프트 조립 (사용자 프로필 + 여행지 DB 요약)
//   - JSON 파싱 및 에러 처리
//
// 다른 파일에서 직접 fetch를 쓰지 말고 이 모듈만 사용하세요.
// ─────────────────────────────────────────────────────────────


const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL   = "gpt-4o-mini";

// ── 공통 fetch 래퍼 ──────────────────────────────────────────
async function callClaude(userPrompt, apiKey, maxTokens = 1000) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`API 오류: ${data.error.message}`);
  }

  return data.choices[0].message.content.trim();
}

// ── 프롬프트 빌더 ────────────────────────────────────────────

// 여행지 DB를 LLM이 읽기 쉬운 한 줄 텍스트로 요약
function buildDbSummary(places) {
  return places.map(p =>
    `[${p.id}] ${p.name}(${p.category}) ` +
    `태그:${p.tags.join("·")} / 분위기:${p.mood.join("·")} / ` +
    `가격:${p.price} / 혼잡도:${p.crowd} / ${p.indoor ? "실내" : "야외"}`
  ).join("\n");
}

// 사용자 프로필 객체를 읽기 쉬운 문자열로 변환
function buildProfileSummary(profile) {
  return Object.entries(profile)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

// 대화 히스토리 배열을 텍스트로 변환
function buildHistorySummary(history) {
  return history
    .map(m => `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`)
    .join("\n");
}

// ── API 함수 1: 첫 추천 생성 ─────────────────────────────────
/**
 * @param {Object} profile   - 사용자 취향 프로필 { companion, mood, activity, ... }
 * @param {Array}  history   - 대화 히스토리 [{ role, content }, ...]
 * @param {Array}  places    - CHUNCHEON_DB 전체
 * @param {string} apiKey
 * @returns {Promise<{ profileTags: string[], recommendations: Array, message: string }>}
 */
async function fetchRecommendations(profile, history, places, apiKey) {
  const prompt = `
당신은 춘천 여행지 추천 AI입니다.

사용자 프로필:
${buildProfileSummary(profile)}

대화 내용:
${buildHistorySummary(history)}

춘천 여행지 DB:
${buildDbSummary(places)}

위 사용자 프로필과 대화 내용을 분석하여:
1. 사용자 취향 태그를 5~8개 추출 (한국어, 짧게)
2. 가장 적합한 여행지 Top 4를 선정하고 각각 유사도 점수(0~100)와 추천 이유(2~3문장, 사용자 취향 언급) 제공
3. 친근하고 따뜻한 마지막 멘트 작성 (2~3문장)

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "profileTags": ["태그1", "태그2", ...],
  "recommendations": [
    { "id": 숫자, "score": 숫자, "reason": "추천 이유" },
    ...
  ],
  "message": "마지막 멘트"
}
`.trim();

  const raw = await callClaude(prompt, apiKey, 1000);
  return JSON.parse(raw);
}

// ── API 함수 2: 추가 추천 (이미 추천한 곳 제외) ─────────────
/**
 * @param {Object} profile
 * @param {Array}  remainingPlaces  - 아직 추천하지 않은 여행지만 담긴 배열
 * @param {string} apiKey
 * @returns {Promise<{ recommendations: Array, message: string }>}
 */
async function fetchMoreRecommendations(profile, remainingPlaces, apiKey) {
  const prompt = `
사용자 프로필: ${buildProfileSummary(profile)}

아직 추천하지 않은 춘천 여행지:
${buildDbSummary(remainingPlaces)}

위 장소 중 프로필에 맞는 Top 3를 골라 JSON으로만 응답하세요 (마크다운 없이):
{
  "recommendations": [
    { "id": 숫자, "score": 숫자, "reason": "추천 이유" },
    ...
  ],
  "message": "추가 추천 멘트 (1~2문장)"
}
`.trim();

  const raw = await callClaude(prompt, apiKey, 800);
  return JSON.parse(raw);
}

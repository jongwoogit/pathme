# PathMe — 춘천 AI 여행지 추천 서비스

대화를 통해 사용자 취향을 수집하고, 최적의 춘천 여행지를 추천하는 웹 서비스입니다.

---

## 폴더 구조

```
pathme/
├── index.html          # HTML 구조만 담당 (뼈대)
├── css/
│   └── style.css       # 전체 스타일
├── js/
│   ├── data.js         # 춘천 여행지 DB + 대화 흐름 정의
│   ├── api.js          # apen ai API 호출 전담
│   ├── ui.js           # DOM 렌더링 전담 (메시지·카드·태그)
│   └── app.js          # 상태 관리 + 전체 흐름 오케스트레이션
└── README.md
```

### 각 파일의 역할

| 파일 | 역할 | 건드릴 때 |
|------|------|-----------|
| `data.js` | 여행지 데이터, 대화 질문 목록 | 장소 추가/수정, 질문 추가 |
| `api.js` | apen ai API 호출, 프롬프트 조립 | 프롬프트 수정, 모델 변경 |
| `ui.js` | 화면 렌더링 (DOM 조작) | 카드 디자인, 메시지 형태 변경 |
| `app.js` | 전체 흐름, 상태 관리 | 대화 로직, 추천 흐름 변경 |
| `style.css` | 색상, 레이아웃, 컴포넌트 스타일 | 디자인 변경 |

---

## 실행 방법

### 방법 1 — VS Code Live Server (권장)
1. VS Code에서 `pathme/` 폴더 열기
2. `index.html` 우클릭 → **Open with Live Server**
3. 브라우저에서 자동으로 열림

### 방법 2 — 브라우저에서 직접 열기
> ⚠️ `file://` 프로토콜은 ES 모듈 CORS 제한이 있을 수 있습니다.
> Live Server 사용을 강력히 권장합니다.

### API 키 설정

---

## 데이터 확장 방법

### 여행지 추가 (`js/data.js`)
```js
{
  id: 13,                         // 고유 번호
  name: "소양강댐",
  category: "관광지",
  tags: ["야외", "자연", "댐", "뷰맛집"],
  description: "설명...",
  mood: ["웅장한", "시원한"],
  price: "무료",
  crowd: "적음",
  indoor: false,
  tip: "오전에 방문하면 안개가 피어올라 환상적이에요."
}
```

### 대화 질문 추가 (`js/data.js`)
`CONVERSATION_FLOW` 배열에 항목 추가:
```js
{
  id: "season",
  profileKey: "budget",   // 이전 단계 답변을 저장할 키
  ai: "어느 계절에 방문하실 예정인가요?",
  chips: ["봄", "여름", "가을", "겨울"]
}
```
그리고 `LAST_PROFILE_KEY`를 새 마지막 질문의 id로 수정하세요.

---

## 기술 스택

- **Frontend**: 바닐라 HTML/CSS/JS (프레임워크 없음)
- **AI**: "gpt-4o-mini" 
- **DB**: 하드코딩된 춘천 여행지 JSON (추후 Pinecone 등으로 교체 가능)
- **추천 로직**: LLM 기반 프로필 매칭 + 유사도 점수화

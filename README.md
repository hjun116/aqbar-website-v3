# AQbar 공식 웹사이트

**운영 중인 실제 서비스 사이트입니다.** 이 레포에 푸시하면 `https://aqbar.ai` 에 그대로 반영됩니다.

- 서비스 주소: **https://aqbar.ai**
- 배포 방식: GitHub Pages (`main` 브랜치 기준 자동 배포)
- 연결 도메인: `CNAME` 파일에 `aqbar.ai`

> ⚠️ `main` 에 푸시하는 순간 운영 사이트가 바뀝니다.
> 작업은 항상 별도 브랜치에서 하고, 로컬에서 눈으로 확인한 뒤 합치세요.

---

## 기술 구성

빌드 도구가 **없습니다.** HTML·CSS·JavaScript 파일이 그대로 서비스됩니다.

- 프레임워크 없음 (React·Next.js 아님), `package.json` 없음
- `npm install` · `npm run build` 같은 명령어가 **필요 없습니다**
- 각 페이지는 하나의 HTML 파일 안에 `<style>` 과 `<script>` 를 함께 담고 있습니다
- 폰트는 Pretendard 를 직접 포함(self-host)합니다 — 외부 CDN에 의존하지 않습니다
- `.nojekyll` : GitHub Pages 의 Jekyll 처리를 끄는 빈 파일 (지우지 마세요)

---

## 폴더 구조

```
.
├── index.html              메인 페이지 (/)
├── hiring/index.html       채용 평가 페이지 (/hiring/)
├── diagnosis/index.html    조직 역량 진단 페이지 (/diagnosis/)
├── privacy/index.html      개인정보 처리방침 (/privacy/)
│
├── contact-config.js       문의 폼 전송 주소 설정
├── contact-form.js         문의 폼 동작 로직 (공통)
├── google-apps-script/
│   └── contact-handler.gs  문의 접수 서버 코드 백업본
│
├── assets/                 로고, OG 공유 이미지
├── fonts/pretendard/       Pretendard 폰트 (woff2)
├── favicon.ico / -96 / -192  파비콘
│
├── CNAME                   연결 도메인 (aqbar.ai)
├── robots.txt              검색엔진 수집 규칙
├── sitemap.xml             검색엔진용 페이지 목록
└── .nojekyll               GitHub Pages 설정용 빈 파일
```

---

## 페이지 구성

| 주소 | 파일 | 내용 |
|---|---|---|
| `/` | `index.html` | 메인. 철학 → 문제 → 솔루션 → 차별점 → 지표 → FAQ → 문의 |
| `/hiring/` | `hiring/index.html` | 채용 평가 소개 + 가격 플랜 |
| `/diagnosis/` | `diagnosis/index.html` | 조직 역량 진단 소개 |
| `/privacy/` | `privacy/index.html` | 개인정보 처리방침 |

주소에 `.html` 을 붙이지 않습니다. 폴더 안의 `index.html` 을 쓰는 방식이라
`/hiring/` 처럼 **끝에 슬래시(/)** 를 붙인 주소가 정식 주소입니다.

---

## 로컬에서 미리보기

파일을 브라우저로 직접 여는 것(`file://`)은 **권장하지 않습니다.**
`/contact-form.js` 같은 절대경로 링크가 깨져서 실제와 다르게 보입니다.

프로젝트 폴더에서 아래 명령어를 실행하세요.

```
python3 -m http.server 8000
```

그다음 브라우저에서 접속합니다.

```
http://localhost:8000
```

끄고 싶을 때는 터미널에서 `Ctrl + C` 를 누르면 됩니다.

---

## 배포 방법

`main` 브랜치에 반영되면 GitHub Pages 가 자동으로 배포합니다. 보통 1~3분 걸립니다.

```
git add .
git commit -m "변경 내용 설명"
git push origin main
```

배포된 뒤에도 화면이 그대로라면 브라우저 강력 새로고침을 하세요.
(Windows `Ctrl + Shift + R` / Mac `Cmd + Shift + R`)

---

## 문의 폼이 동작하는 구조

```
방문자가 폼 제출
      ↓
contact-form.js  ← 입력값을 모아서 전송
      ↓
contact-config.js 에 적힌 Google Apps Script 주소로 POST
      ↓
Google 스프레드시트에 한 줄 기록 + 담당자 이메일 알림 발송
```

- 전송 주소를 바꾸려면 `contact-config.js` 의 `webAppUrl` 을 수정합니다
- 서버 쪽 코드는 `google-apps-script/contact-handler.gs` 에 백업되어 있습니다.
  이 파일은 **백업본일 뿐이라 여기서 고쳐도 반영되지 않습니다.**
  실제 수정은 Google Apps Script 콘솔에서 하고, 반드시 **새 버전으로 재배포**해야 적용됩니다
- 문의 유형은 두 가지로 구분되어 기록됩니다 — `채용 평가 문의` / `조직 진단 문의`

> 테스트로 폼을 제출하면 실제 스프레드시트에 쌓이고 알림 메일도 갑니다.
> 테스트할 때는 이름 칸에 **"테스트"** 라고 적어 주세요.

---

## 자주 하는 수정 작업

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 페이지 문구 수정 | 해당 페이지의 `index.html` |
| 문의 폼 전송 주소 변경 | `contact-config.js` |
| 카카오톡 공유 시 나오는 이미지 | `assets/og-main.png` (1200×630) |
| 브라우저 탭 아이콘 | `favicon.ico`, `favicon-96.png`, `favicon-192.png` |
| 검색 결과 제목·설명 | 각 페이지 `<head>` 의 `<title>`, `meta description` |

---

## 검색엔진(SEO) 관련

- `robots.txt` : 모든 검색로봇 수집 허용. 네이버(`Yeti`) 규칙도 포함
- `sitemap.xml` : 페이지 4개 등록. **페이지를 추가하면 여기에도 추가해야 합니다**
- 각 페이지에 `canonical`, `og:` 태그가 `https://aqbar.ai/...` 기준으로 설정되어 있습니다
- 현재 검색 차단(noindex)은 **걸려 있지 않습니다** — 검색에 정상 노출되는 상태입니다

---

## 방문자 분석

Google Analytics 4 가 모든 페이지에 설치되어 있습니다. (측정 ID: `G-YD8F18L7QG`)

---

## 주의할 점

- **CSS 변수가 페이지마다 조금씩 다릅니다.** 공통으로 쓰는 JS·CSS 를 새로 만들 때는
  `var(--accent)` 같은 페이지 변수에 의존하지 말고 색상값을 직접 지정하세요
- **헤더·푸터가 4개 파일에 각각 복사되어 있습니다.** 메뉴를 바꾸면 4곳을 모두 고쳐야 합니다
- **공통 JS 를 모든 페이지가 부르지는 않습니다.** 현재 `contact-config.js` · `contact-form.js`
  는 `/` 와 `/hiring/` 에서만 불러옵니다. 새 공통 스크립트를 전 페이지에 적용하려면
  `/diagnosis/` 와 `/privacy/` 에도 `<script>` 를 추가해야 합니다
- **`z-index` 는 현재 최대 50** (상단 고정 헤더). 그 위에 무언가를 띄우려면 60 이상을 쓰세요

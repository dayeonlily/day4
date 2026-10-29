# 탐라월드 (제주 IP 사이트)

Vite + React + Supabase Auth + Pixabay. Vercel 배포용.

**실행 전 필수:** [Node.js LTS](https://nodejs.org) 설치 (설치 후 터미널을 새로 열기). 없으면 `npm`/`vite`가 실행되지 않아 화면이 뜨지 않습니다. `index.html`을 더블클릭해서 여는 방식은 지원하지 않습니다.

## 환경변수

| 이름 | 위치 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | 같은 화면의 `anon` `public` 키 (service_role 키는 절대 금지) |
| `VITE_PIXABAY_KEY` | https://pixabay.com/api/docs/ 로그인 후 표시되는 key |

로컬: `.env.example` 을 `.env` 로 복사해 값 입력 후 `npm install && npm run dev`

## Supabase 설정
1. SQL Editor 에서 `supabase_schema.sql` 실행 (profiles 테이블 + 가입 트리거 + guestbook 방명록 테이블/RLS)
2. Authentication > URL Configuration 에 Vercel 배포 주소를 Site URL / Redirect URLs 로 추가
3. (선택) Authentication > Providers > Email 의 "Confirm email" 을 끄면 가입 즉시 로그인

## Vercel 배포
- Root Directory: `tamra-world`
- Framework Preset: Vite (Build `npm run build`, Output `dist`)
- Settings > Environment Variables 에 위 3개 등록 후 Redeploy

## 방명록
- 조회는 누구나, 작성·삭제는 로그인한 본인만 (RLS 로 DB 에서 강제)
- 닉네임은 DB 트리거가 가입 시 저장된 값으로 채움

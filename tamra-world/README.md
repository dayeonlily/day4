# 탐라월드 (제주 IP 사이트)

Vite + Supabase Auth + Pixabay. Vercel 배포용.

## 환경변수

| 이름 | 위치 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | 같은 화면의 `anon` `public` 키 (service_role 키는 절대 금지) |
| `VITE_PIXABAY_KEY` | https://pixabay.com/api/docs/ 로그인 후 표시되는 key |

로컬: `.env.example` 을 `.env` 로 복사해 값 입력 후 `npm install && npm run dev`

## Supabase 설정
1. SQL Editor 에서 `supabase_schema.sql` 실행 (profiles 테이블 + 가입 트리거)
2. Authentication > URL Configuration 에 Vercel 배포 주소를 Site URL / Redirect URLs 로 추가
3. (선택) Authentication > Providers > Email 의 "Confirm email" 을 끄면 가입 즉시 로그인

## Vercel 배포
- Root Directory: `tamra-world`
- Framework Preset: Vite (Build `npm run build`, Output `dist`)
- Settings > Environment Variables 에 위 3개 등록 후 Redeploy

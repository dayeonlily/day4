import "./style.css";
import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const $ = (id) => document.getElementById(id);

// ---------- 캐릭터 데이터 + Pixabay 이미지 ----------
const CHARACTERS = [
  { name: "하르", tag: "수호자", emoji: "🗿", q: "dol hareubang jeju", desc: "마을 어귀를 지키는 돌하르방. 말수는 적지만 누구보다 든든한 맏형." },
  { name: "숨이", tag: "탐험가", emoji: "🌊", q: "jeju sea ocean coast", desc: "바다 밑 보물을 찾는 해녀 소녀. 숨비소리로 친구들과 소통해요." },
  { name: "귤랑", tag: "분위기메이커", emoji: "🍊", q: "tangerine orchard", desc: "감귤 밭에서 태어난 장난꾸러기 요정. 웃음이 비타민!" },
  { name: "바람이", tag: "러너", emoji: "🐴", q: "jeju pony horse", desc: "오름을 가로지르는 조랑말. 바람보다 빠르게 소식을 전합니다." },
];
const GALLERY_Q = ["jeju island", "hallasan mountain", "seongsan ilchulbong", "jeju canola flowers", "jeju waterfall", "jeju beach"];

const cache = {
  get(k) {
    try {
      const v = JSON.parse(sessionStorage.getItem(k));
      if (v && Date.now() - v.t < 24 * 3600e3) return v.d; // Pixabay 약관: 24시간 캐시
    } catch {}
    return null;
  },
  set(k, d) { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch {} },
};

async function pixabay(q, n = 1) {
  if (!env.VITE_PIXABAY_KEY) return [];
  const key = `px:${q}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(env.VITE_PIXABAY_KEY)}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=${Math.max(n, 3)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const urls = (await res.json()).hits.slice(0, n).map((h) => h.webformatURL);
    cache.set(key, urls);
    return urls;
  } catch (e) {
    console.warn("Pixabay 불러오기 실패:", q, e);
    return [];
  }
}

const bg = (el, url) => url && (el.style.backgroundImage = `url("${url}")`);

function loadImages() {
  CHARACTERS.forEach((c) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div class="img"><div class="emoji">${c.emoji}</div></div>
      <div class="body"><span class="tag">${c.tag}</span><h3>${c.name}</h3><p>${c.desc}</p></div>`;
    $("charGrid").appendChild(card);
    pixabay(c.q).then(([u]) => bg(card.querySelector(".img"), u));
  });

  GALLERY_Q.forEach((q) => {
    const d = document.createElement("div");
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", q);
    $("galleryGrid").appendChild(d);
    pixabay(q).then(([u]) => bg(d, u));
  });

  pixabay("jeju island landscape").then(([u]) => u && $("hero").style.setProperty("--hero-img", `url("${u}")`));
  pixabay("jeju stone wall").then(([u]) => bg($("storyPhoto"), u));
}

// ---------- Supabase 인증 ----------
const supa = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  : null;

const modal = $("authModal"), msg = $("authMsg");
let mode = "login";

function say(text, type = "") { msg.textContent = text; msg.className = "msg " + type; }

function setMode(m) {
  mode = m;
  $("tabLogin").classList.toggle("on", m === "login");
  $("tabSignup").classList.toggle("on", m === "signup");
  $("nickWrap").classList.toggle("hidden", m === "login");
  $("submitBtn").textContent = m === "login" ? "로그인" : "회원가입";
  $("pw").autocomplete = m === "login" ? "current-password" : "new-password";
  say("");
}
const openModal = () => { modal.classList.add("open"); setTimeout(() => $("email").focus(), 50); };
const closeModal = () => modal.classList.remove("open");

function errText(e) {
  const m = (e && e.message) || "";
  if (/Invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/Email not confirmed/i.test(m)) return "이메일 인증을 먼저 완료해주세요.";
  if (/already registered/i.test(m)) return "이미 가입된 이메일입니다.";
  if (/Password should be/i.test(m)) return "비밀번호는 6자 이상이어야 합니다.";
  if (/rate limit/i.test(m)) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  return m || "알 수 없는 오류가 발생했습니다.";
}

$("authForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!supa) return say("환경변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다.", "err");
  const email = $("email").value.trim(), password = $("pw").value, nickname = $("nick").value.trim();
  if (!email || password.length < 6) return say("이메일과 6자 이상의 비밀번호를 입력해주세요.", "err");

  const btn = $("submitBtn");
  btn.disabled = true;
  say("처리 중...");
  try {
    if (mode === "signup") {
      const { data, error } = await supa.auth.signUp({
        email, password,
        options: { data: { nickname: nickname || email.split("@")[0] }, emailRedirectTo: location.origin },
      });
      if (error) throw error;
      if (data.session) closeModal();
      else say("가입 완료! 이메일로 발송된 인증 링크를 확인해주세요.", "ok");
    } else {
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeModal();
    }
  } catch (e) {
    say(errText(e), "err");
  } finally {
    btn.disabled = false;
  }
});

function renderUser(session) {
  const box = $("userbox"), cta = $("ctaAuth"), note = $("memberMsg");
  box.replaceChildren();
  if (session) {
    const u = session.user;
    const name = u.user_metadata?.nickname || u.email;
    const hi = document.createElement("span");
    hi.textContent = `🍊 ${name}님`;
    const out = document.createElement("button");
    out.className = "btn ghost";
    out.textContent = "로그아웃";
    out.onclick = () => supa.auth.signOut();
    box.append(hi, out);
    cta.classList.add("hidden");
    note.textContent = `${name}님, 탐라월드의 주민이 되신 것을 환영합니다!`;
  } else {
    const b = document.createElement("button");
    b.className = "btn ghost";
    b.textContent = "로그인 / 회원가입";
    b.onclick = () => { setMode("login"); openModal(); };
    box.append(b);
    cta.classList.remove("hidden");
    note.textContent = "";
  }
}

$("closeAuth").onclick = closeModal;
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
$("tabLogin").onclick = () => setMode("login");
$("tabSignup").onclick = () => setMode("signup");
$("ctaAuth").onclick = () => { setMode("signup"); openModal(); };

renderUser(null);
if (supa) {
  supa.auth.getSession().then(({ data }) => renderUser(data.session));
  supa.auth.onAuthStateChange((_e, session) => renderUser(session));
}

loadImages();

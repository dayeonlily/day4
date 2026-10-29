import { useEffect, useState } from "react";
import { supa } from "./lib/supabase.js";
import { usePixabay } from "./lib/pixabay.js";
import AuthModal from "./components/AuthModal.jsx";
import Guestbook from "./components/Guestbook.jsx";

const CHARACTERS = [
  { name: "하르", tag: "수호자", emoji: "🗿", q: "dol hareubang jeju", desc: "마을 어귀를 지키는 돌하르방. 말수는 적지만 누구보다 든든한 맏형." },
  { name: "숨이", tag: "탐험가", emoji: "🌊", q: "jeju sea ocean coast", desc: "바다 밑 보물을 찾는 해녀 소녀. 숨비소리로 친구들과 소통해요." },
  { name: "귤랑", tag: "분위기메이커", emoji: "🍊", q: "tangerine orchard", desc: "감귤 밭에서 태어난 장난꾸러기 요정. 웃음이 비타민!" },
  { name: "바람이", tag: "러너", emoji: "🐴", q: "jeju pony horse", desc: "오름을 가로지르는 조랑말. 바람보다 빠르게 소식을 전합니다." },
];
const GALLERY_Q = ["jeju island", "hallasan mountain", "seongsan ilchulbong", "jeju canola flowers", "jeju waterfall", "jeju beach"];

const bgStyle = (url) => (url ? { backgroundImage: `url("${url}")` } : undefined);

function CharacterCard({ c }) {
  const img = usePixabay(c.q);
  return (
    <article className="card">
      <div className="img" style={bgStyle(img)}><div className="emoji">{c.emoji}</div></div>
      <div className="body"><span className="tag">{c.tag}</span><h3>{c.name}</h3><p>{c.desc}</p></div>
    </article>
  );
}

function GalleryItem({ q }) {
  const img = usePixabay(q);
  return <div role="img" aria-label={q} style={bgStyle(img)} />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [modal, setModal] = useState(null); // null | "login" | "signup"

  useEffect(() => {
    if (!supa) return;
    supa.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supa.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const heroImg = usePixabay("jeju island landscape");
  const storyImg = usePixabay("jeju stone wall");
  const user = session?.user ?? null;
  const name = user?.user_metadata?.nickname || user?.email;

  return (
    <>
      <header>
        <div className="wrap">
          <a href="#top" className="logo">탐라<span>월드</span></a>
          <nav>
            <a className="link" href="#characters">캐릭터</a>
            <a className="link" href="#story">세계관</a>
            <a className="link" href="#gallery">갤러리</a>
            <a className="link" href="#guestbook">방명록</a>
            <div id="userbox">
              {user ? (
                <>
                  <span>🍊 {name}님</span>
                  <button className="btn ghost" onClick={() => supa.auth.signOut()}>로그아웃</button>
                </>
              ) : (
                <button className="btn ghost" onClick={() => setModal("login")}>로그인 / 회원가입</button>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        <div className="hero" style={heroImg ? { "--hero-img": `url("${heroImg}")` } : undefined}>
          <div className="wrap">
            <h1>돌담 너머,<br />제주의 이야기가 깨어난다</h1>
            <p>돌하르방, 해녀, 감귤, 조랑말. 제주의 상징들이 캐릭터가 되어 만나는 IP 유니버스, 탐라월드.</p>
            <a className="btn" href="#characters">캐릭터 만나보기</a>
          </div>
        </div>

        <section id="characters">
          <div className="wrap">
            <h2>탐라월드 캐릭터</h2>
            <p className="sub">제주의 전통과 자연에서 태어난 네 친구들</p>
            <div className="grid">{CHARACTERS.map((c) => <CharacterCard key={c.name} c={c} />)}</div>
          </div>
        </section>

        <section className="story" id="story">
          <div className="wrap cols">
            <div className="photo" style={bgStyle(storyImg)} />
            <div>
              <h2>세계관</h2>
              <p>바람, 돌, 여자가 많다는 삼다(三多)의 섬. 탐라월드는 한라산 깊은 곳에서 잠든 설문대할망의 꿈이 현실로 번져 나오며 시작됩니다.</p>
              <ul>
                <li><b>돌</b> · 마을을 지키는 수호의 힘, 돌하르방</li>
                <li><b>바다</b> · 숨비소리로 이어지는 해녀의 연대</li>
                <li><b>바람</b> · 오름을 달리는 조랑말의 자유</li>
                <li><b>햇살</b> · 감귤 속에 담긴 따뜻한 기운</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="gallery">
          <div className="wrap">
            <h2>제주 갤러리</h2>
            <p className="sub">영감이 된 제주의 풍경들</p>
            <div className="gallery">{GALLERY_Q.map((q) => <GalleryItem key={q} q={q} />)}</div>
          </div>
        </section>

        <Guestbook user={user} onLogin={() => setModal("login")} />

        <section className="members">
          <div className="wrap">
            <h2>탐라 주민이 되어보세요</h2>
            <p className="sub">회원가입하고 새 캐릭터 소식과 굿즈 정보를 가장 먼저 받아보세요.</p>
            {user ? (
              <p id="memberMsg">{name}님, 탐라월드의 주민이 되신 것을 환영합니다!</p>
            ) : (
              <button className="btn" style={{ background: "var(--citrus)", color: "#3a2600" }} onClick={() => setModal("signup")}>지금 시작하기</button>
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          이미지 제공 <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a> · 탐라월드는 학습용 데모 사이트입니다.
        </div>
      </footer>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </>
  );
}

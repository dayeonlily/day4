import { useEffect, useRef, useState } from "react";
import { supa } from "../lib/supabase.js";

function errText(e) {
  const m = (e && e.message) || "";
  if (/Invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/Email not confirmed/i.test(m)) return "이메일 인증을 먼저 완료해주세요.";
  if (/already registered/i.test(m)) return "이미 가입된 이메일입니다.";
  if (/Password should be/i.test(m)) return "비밀번호는 6자 이상이어야 합니다.";
  if (/rate limit/i.test(m)) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  return m || "알 수 없는 오류가 발생했습니다.";
}

export default function AuthModal({ initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const say = (text, type = "") => setMsg({ text, type });
  const switchMode = (m) => { setMode(m); say(""); };

  async function submit(ev) {
    ev.preventDefault();
    if (!supa) return say("환경변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다.", "err");
    const e = email.trim();
    if (!e || pw.length < 6) return say("이메일과 6자 이상의 비밀번호를 입력해주세요.", "err");

    setBusy(true);
    say("처리 중...");
    try {
      if (mode === "signup") {
        const { data, error } = await supa.auth.signUp({
          email: e,
          password: pw,
          options: { data: { nickname: nick.trim() || e.split("@")[0] }, emailRedirectTo: location.origin },
        });
        if (error) throw error;
        if (data.session) onClose();
        else say("가입 완료! 이메일로 발송된 인증 링크를 확인해주세요.", "ok");
      } else {
        const { error } = await supa.auth.signInWithPassword({ email: e, password: pw });
        if (error) throw error;
        onClose();
      }
    } catch (err) {
      say(errText(err), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-labelledby="authTitle"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <button className="close" onClick={onClose} aria-label="닫기">&times;</button>
        <h3 id="authTitle">탐라월드 입장</h3>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>로그인</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => switchMode("signup")}>회원가입</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <>
              <label htmlFor="nick">닉네임</label>
              <input id="nick" type="text" maxLength={20} autoComplete="nickname" placeholder="예: 돌하르방팬"
                     value={nick} onChange={(e) => setNick(e.target.value)} />
            </>
          )}
          <label htmlFor="email">이메일</label>
          <input id="email" ref={emailRef} type="email" autoComplete="email" required placeholder="you@example.com"
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="pw">비밀번호 (6자 이상)</label>
          <input id="pw" type="password" required minLength={6}
                 autoComplete={mode === "login" ? "current-password" : "new-password"}
                 value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn" type="submit" disabled={busy}>{mode === "login" ? "로그인" : "회원가입"}</button>
          <div className={"msg " + msg.type} role="status">{msg.text}</div>
        </form>
      </div>
    </div>
  );
}

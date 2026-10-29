import { useCallback, useEffect, useState } from "react";
import { supa } from "../lib/supabase.js";

export default function Guestbook({ user, onLogin }) {
  const [rows, setRows] = useState([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supa) return setMsg({ text: "Supabase 환경변수가 설정되지 않았습니다.", type: "err" });
    const { data, error } = await supa.from("guestbook")
      .select("id,user_id,nickname,message,created_at")
      .order("created_at", { ascending: false }).limit(50);
    if (error) return setMsg({ text: "방명록을 불러오지 못했어요. supabase_schema.sql 을 실행했는지 확인해주세요.", type: "err" });
    setMsg({ text: "", type: "" });
    setRows(data);
  }, []);

  // 로그인 상태가 바뀌면 다시 불러와 삭제 버튼 표시를 갱신
  useEffect(() => { load(); }, [load, user?.id]);

  async function submit(ev) {
    ev.preventDefault();
    const message = text.trim();
    if (!message) return setMsg({ text: "내용을 입력해주세요.", type: "err" });
    setBusy(true);
    const { error } = await supa.from("guestbook").insert({ message });
    setBusy(false);
    if (error) return setMsg({ text: "등록하지 못했어요: " + error.message, type: "err" });
    setText("");
    load();
  }

  async function remove(id) {
    if (!confirm("이 글을 삭제할까요?")) return;
    const { error } = await supa.from("guestbook").delete().eq("id", id);
    if (error) setMsg({ text: "삭제하지 못했어요: " + error.message, type: "err" });
    else load();
  }

  return (
    <section id="guestbook">
      <div className="wrap narrow">
        <h2>탐라 방명록</h2>
        <p className="sub">주민들이 남긴 한마디. 글쓰기는 로그인한 회원만 가능해요.</p>

        {user ? (
          <form className="gb-form" onSubmit={submit}>
            <textarea maxLength={200} rows={3} value={text} onChange={(e) => setText(e.target.value)}
                      placeholder="탐라월드에 남기고 싶은 말을 적어주세요 (200자)" />
            <div className="gb-row"><span>{text.length} / 200</span><button className="btn" type="submit" disabled={busy}>남기기</button></div>
          </form>
        ) : (
          <p className="gb-login">방명록을 쓰려면 <button className="linkbtn" type="button" onClick={onLogin}>로그인</button>이 필요해요.</p>
        )}

        <div className={"msg " + msg.type} role="status">{msg.text}</div>

        <ul className="gb-list">
          {rows.length === 0 && <li className="gb-empty">아직 글이 없어요. 첫 번째 주민이 되어주세요!</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <div className="meta">
                <span>
                  <b>{r.nickname || "익명"}</b> · {new Date(r.created_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {user && r.user_id === user.id && (
                  <button className="del" type="button" onClick={() => remove(r.id)}>삭제</button>
                )}
              </div>
              <p>{r.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

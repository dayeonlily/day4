import { useEffect, useState } from "react";
import { won } from "../lib/cart.js";

export default function Cart({ cart, user, onLogin, onClose }) {
  const { items, total, setAmount, clear } = cart;
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function checkout() {
    // 결제 연동 전의 데모: 주문 완료 안내만 표시하고 장바구니를 비움
    clear();
    setDone(true);
  }

  return (
    <div className="drawer-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="장바구니">
        <div className="drawer-head">
          <h3>🛒 장바구니</h3>
          <button className="close-x" onClick={onClose} aria-label="닫기">&times;</button>
        </div>

        {!user && (
          <p className="cart-note">
            로그인하면 장바구니가 계정에 저장돼요. <button className="linkbtn" type="button" onClick={onLogin}>로그인</button>
          </p>
        )}
        {cart.error && <p className="msg err">{cart.error}</p>}

        {done ? (
          <p className="cart-empty">주문이 접수되었습니다 🎉<br /><small>(데모 사이트라 실제 결제·배송은 진행되지 않아요)</small></p>
        ) : items.length === 0 ? (
          <p className="cart-empty">장바구니가 비어 있어요.</p>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((i) => (
                <li key={i.id}>
                  <span className="cart-emoji">{i.emoji}</span>
                  <div className="cart-info">
                    <b>{i.name}</b>
                    <span>{won(i.price)}</span>
                    <div className="qty">
                      <button type="button" aria-label="수량 줄이기" onClick={() => setAmount(i.id, i.qty - 1)}>−</button>
                      <span>{i.qty}</span>
                      <button type="button" aria-label="수량 늘리기" onClick={() => setAmount(i.id, i.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div className="cart-sub">
                    <b>{won(i.price * i.qty)}</b>
                    <button type="button" className="del" onClick={() => setAmount(i.id, 0)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-total"><span>합계</span><b>{won(total)}</b></div>
            <button className="btn checkout" type="button" onClick={checkout}>주문하기</button>
          </>
        )}
      </aside>
    </div>
  );
}

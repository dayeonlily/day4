import { useState } from "react";
import { usePixabay } from "../lib/pixabay.js";
import { PRODUCTS, won } from "../lib/cart.js";

function ProductCard({ p, onAdd }) {
  const img = usePixabay(p.q);
  const [added, setAdded] = useState(false);

  function click() {
    onAdd(p.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <article className="card product">
      <div className="img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
        <div className="emoji">{p.emoji}</div>
      </div>
      <div className="body">
        <h3>{p.name}</h3>
        <p className="price">{won(p.price)}</p>
        <button className="btn" type="button" onClick={click}>{added ? "담았어요 ✓" : "장바구니 담기"}</button>
      </div>
    </article>
  );
}

export default function Shop({ onAdd }) {
  return (
    <section id="shop" className="shop">
      <div className="wrap">
        <h2>탐라 굿즈</h2>
        <p className="sub">캐릭터를 일상으로 가져오세요</p>
        <div className="grid">
          {PRODUCTS.map((p) => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}
        </div>
      </div>
    </section>
  );
}

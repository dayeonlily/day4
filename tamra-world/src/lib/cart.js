import { useEffect, useState } from "react";
import { supa } from "./supabase.js";

export const PRODUCTS = [
  { id: "hareubang", name: "하르 미니 피규어", price: 12000, q: "dol hareubang jeju", emoji: "🗿" },
  { id: "ecobag", name: "숨이 해녀 에코백", price: 15000, q: "jeju sea ocean coast", emoji: "🌊" },
  { id: "keyring", name: "귤랑 감귤 키링", price: 6000, q: "tangerine orange fruit", emoji: "🍊" },
  { id: "doll", name: "바람이 조랑말 인형", price: 18000, q: "jeju pony horse", emoji: "🐴" },
  { id: "sticker", name: "탐라 스티커 팩", price: 4000, q: "jeju stone wall", emoji: "✨" },
  { id: "postcard", name: "한라산 엽서 세트", price: 5000, q: "hallasan mountain", emoji: "💌" },
];

export const won = (n) => n.toLocaleString("ko-KR") + "원";

const STORAGE_KEY = "tamra-cart";
const MAX_QTY = 99;
const known = new Set(PRODUCTS.map((p) => p.id));

const clamp = (n) => Math.min(Math.max(Math.floor(Number(n)) || 0, 0), MAX_QTY);

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw || typeof raw !== "object") return {};
    const out = {};
    for (const id of known) if (clamp(raw[id]) > 0) out[id] = clamp(raw[id]);
    return out;
  } catch {
    return {};
  }
}

const saveLocal = (qty) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(qty)); } catch {} };
const clearLocal = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

// 장바구니 상태: { [productId]: 수량 }
// 로그인 상태면 Supabase(cart_items)에, 아니면 브라우저에 저장한다.
export function useCart(user) {
  const [qty, setQty] = useState(loadLocal);
  const [error, setError] = useState("");
  const uid = user?.id ?? null;

  // 로그인/로그아웃 시 동기화: 로그인하면 DB 내용과 비로그인 중 담은 것을 합쳐 DB에 반영
  useEffect(() => {
    if (!uid || !supa) { setQty(loadLocal()); return; }
    let alive = true;
    (async () => {
      const { data, error: err } = await supa.from("cart_items").select("product_id,quantity");
      if (!alive) return;
      if (err) return setError("장바구니를 불러오지 못했어요. supabase_schema.sql 을 실행했는지 확인해주세요.");
      const merged = {};
      for (const r of data) if (known.has(r.product_id)) merged[r.product_id] = clamp(r.quantity);
      const local = loadLocal();
      for (const [id, n] of Object.entries(local)) merged[id] = clamp((merged[id] || 0) + n);

      if (Object.keys(local).length) {
        const rows = Object.entries(merged).map(([product_id, quantity]) => ({ product_id, quantity }));
        const { error: upErr } = await supa.from("cart_items").upsert(rows, { onConflict: "user_id,product_id" });
        if (upErr) return setError("장바구니를 저장하지 못했어요: " + upErr.message);
        clearLocal();
      }
      if (!alive) return;
      setError("");
      setQty(merged);
    })();
    return () => { alive = false; };
  }, [uid]);

  async function persist(id, n) {
    if (!uid || !supa) return;
    const { error: err } = n > 0
      ? await supa.from("cart_items").upsert({ product_id: id, quantity: n, updated_at: new Date().toISOString() }, { onConflict: "user_id,product_id" })
      : await supa.from("cart_items").delete().eq("product_id", id);
    setError(err ? "장바구니를 저장하지 못했어요: " + err.message : "");
  }

  function setAmount(id, n) {
    const next = clamp(n);
    const updated = { ...qty };
    if (next > 0) updated[id] = next; else delete updated[id];
    setQty(updated);
    if (uid) persist(id, next); else saveLocal(updated);
  }

  const add = (id) => setAmount(id, (qty[id] || 0) + 1);

  async function clear() {
    setQty({});
    if (uid && supa) {
      const { error: err } = await supa.from("cart_items").delete().eq("user_id", uid);
      setError(err ? "장바구니를 비우지 못했어요: " + err.message : "");
    } else clearLocal();
  }

  const items = PRODUCTS.filter((p) => qty[p.id]).map((p) => ({ ...p, qty: qty[p.id] }));
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return { items, count, total, add, setAmount, clear, error };
}

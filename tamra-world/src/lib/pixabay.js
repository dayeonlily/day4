import { useEffect, useState } from "react";

const KEY = import.meta.env.VITE_PIXABAY_KEY;

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

async function pixabay(q) {
  if (!KEY) return null;
  const ck = `px:${q}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(KEY)}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const u = (await res.json()).hits[0]?.webformatURL || null;
    if (u) cache.set(ck, u);
    return u;
  } catch (e) {
    console.warn("Pixabay 불러오기 실패:", q, e);
    return null;
  }
}

// 검색어에 맞는 Pixabay 이미지 URL (없으면 null)
export function usePixabay(q) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    pixabay(q).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [q]);
  return url;
}

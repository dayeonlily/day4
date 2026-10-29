import { useMemo, useState } from "react";
import data from "../data/seogwipo_visitors.json";

const SPOTS = Object.keys(data[0]).filter((k) => !["기준연도", "기준월", "데이터기준일자"].includes(k));
const COLORS = ["#0e7c86", "#f59e0b", "#d9480f", "#7048e8", "#2f9e44", "#868e96"];
const colorOf = (s) => COLORS[SPOTS.indexOf(s)];
const fmt = (n) => n.toLocaleString("ko-KR");
const label = (r) => `${String(r["기준연도"]).slice(2)}.${r["기준월"]}`;

const W = 760, H = 300, PAD = { l: 52, r: 16, t: 16, b: 30 };

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

function LineChart({ spots, hoverIdx, setHoverIdx }) {
  const top = niceMax(Math.max(...spots.flatMap((s) => data.map((r) => r[s]))));
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (data.length - 1);
  const y = (v) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);

  return (
    <svg className="lines" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="관광지별 월별 관람객 추이"
      onMouseLeave={() => setHoverIdx(null)}
      onMouseMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - b.left) / b.width) * W;
        const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
        setHoverIdx(Math.min(data.length - 1, Math.max(0, i)));
      }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e6e0d2" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7a7c">{fmt(t)}</text>
        </g>
      ))}
      {data.map((r, i) => (i % 2 === 0 || data.length < 10) && (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7a7c">{label(r)}</text>
      ))}
      {spots.map((s) => (
        <polyline key={s} fill="none" stroke={colorOf(s)} strokeWidth="2.5" strokeLinejoin="round"
          points={data.map((r, i) => `${x(i)},${y(r[s])}`).join(" ")} />
      ))}
      {hoverIdx != null && (
        <g>
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.t} y2={H - PAD.b} stroke="#3b3a38" strokeDasharray="4 3" />
          {spots.map((s) => <circle key={s} cx={x(hoverIdx)} cy={y(data[hoverIdx][s])} r="4.5" fill={colorOf(s)} stroke="#fff" strokeWidth="2" />)}
        </g>
      )}
    </svg>
  );
}

export default function Visitors() {
  const [picked, setPicked] = useState([SPOTS[0], SPOTS[3]]);
  const [hoverIdx, setHoverIdx] = useState(null);

  function toggle(s) {
    setPicked((p) => (p.includes(s) ? (p.length > 1 ? p.filter((v) => v !== s) : p) : [...p, s]));
  }

  const spots = SPOTS.filter((s) => picked.includes(s));
  const rows = useMemo(() => {
    return spots
      .map((s) => {
        const vals = data.map((r) => r[s]);
        const sum = vals.reduce((a, b) => a + b, 0);
        const m = Math.max(...vals);
        return { s, sum, avg: Math.round(sum / vals.length), peak: label(data[vals.indexOf(m)]), peakVal: m };
      })
      .sort((a, b) => b.sum - a.sum);
  }, [spots.join()]);
  const topSum = rows[0].sum;
  const cur = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <section id="visitors">
      <div className="wrap">
        <h2>서귀포 관광지 비교</h2>
        <p className="sub">
          {label(data[0])} ~ {label(data[data.length - 1])} 월별 관람객수 · 비교할 관광지를 골라보세요 (서귀포시 공공데이터)
        </p>

        <div className="chips">
          {SPOTS.map((s) => (
            <button key={s} type="button" aria-pressed={picked.includes(s)}
              className={"chip" + (picked.includes(s) ? " on" : "")}
              style={picked.includes(s) ? { background: colorOf(s), borderColor: colorOf(s) } : undefined}
              onClick={() => toggle(s)}>{s}</button>
          ))}
        </div>

        <div className="chartbox">
          <div className="tip">
            {cur ? (
              <>
                <b>{cur["기준연도"]}년 {Number(cur["기준월"])}월</b>
                {spots.map((s) => (
                  <span key={s}><i style={{ background: colorOf(s) }} />{s} {fmt(cur[s])}명</span>
                ))}
              </>
            ) : <span className="muted">그래프 위에 마우스를 올리면 그 달의 수치를 볼 수 있어요</span>}
          </div>
          <LineChart spots={spots} hoverIdx={hoverIdx} setHoverIdx={setHoverIdx} />
        </div>

        <div className="rank">
          <h3>누적 관람객 순위</h3>
          {rows.map((r, i) => (
            <div className="rrow" key={r.s}>
              <span className="no">{i + 1}</span>
              <span className="nm"><i style={{ background: colorOf(r.s) }} />{r.s}</span>
              <div className="track"><div style={{ width: `${(r.sum / topSum) * 100}%`, background: colorOf(r.s) }} /></div>
              <span className="val">{fmt(r.sum)}명</span>
              <span className="meta">월평균 {fmt(r.avg)} · 최다 {r.peak}({fmt(r.peakVal)})</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

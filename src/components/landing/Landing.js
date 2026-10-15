"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EDITIONS } from "@/lib/editions";
import { COPY, DEMO_CALLS } from "./copy";
import "./landing.css";

const LANG_KEY = "gtawfi:landing-lang";

const PlaneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  </svg>
);

// Shows public/logos/<file> once it exists; until then (or if it fails to load) a placeholder.
function EditionLogo({ edition }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    // Checked from JS: an <img> that fails before hydration never fires onError.
    const img = new Image();
    img.onload = () => setState("ok");
    img.onerror = () => setState("missing");
    img.src = edition.logo;
  }, [edition.logo]);

  if (state === "ok") {
    return (
      <div className="logo">
        <img src={edition.logo} alt={`${edition.name} logo`} />
      </div>
    );
  }
  return (
    <div className="logo placeholder" aria-hidden="true">
      <div>
        <b>{edition.id === "fr" ? "GTA W FR" : "GTA W"}</b>
        <span>LOGO</span>
      </div>
    </div>
  );
}

function EditionCard({ edition, text, open }) {
  return (
    <Link href={edition.href} className={`edition ${edition.id}`}>
      <div className="edition-top">
        <EditionLogo edition={edition} />
        <div>
          <h2>{edition.name}</h2>
          <div className="tags">
            {text.tags.map((tag, i) => (
              <span key={tag} className={`chip ${i === 0 ? (edition.id === "fr" ? "m" : "c") : edition.radar ? "g" : ""}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ul>
        {text.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
        {text.off.map((f) => (
          <li key={f} className="off">
            {f}
          </li>
        ))}
      </ul>
      <span className="go">{open} ▸</span>
    </Link>
  );
}

function Demo({ c, initialEdition }) {
  const [edition, setEdition] = useState(initialEdition);
  const [index, setIndex] = useState(1);
  const [copied, setCopied] = useState(false);
  const calls = DEMO_CALLS[edition];
  const call = calls[index];

  const pick = (i) => {
    setIndex(i);
    setCopied(false);
  };
  const copy = () => {
    navigator.clipboard?.writeText(call.text).then(() => setCopied(true), () => {});
  };

  return (
    <div className="display" aria-label={c.head}>
      <div className="display-head">
        <span className="label">{c.head}</span>
        <div className="seg" role="group" aria-label="Edition">
          {Object.values(EDITIONS).map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={edition === e.id}
              onClick={() => {
                setEdition(e.id);
                setCopied(false);
              }}
            >
              {e.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="phases" role="group">
        {calls.map((p, i) => (
          <button key={p.phase} type="button" lang={edition} className={`phase ${i < index ? "done" : ""}`} aria-pressed={i === index} onClick={() => pick(i)}>
            {p.phase}
          </button>
        ))}
      </div>
      <div className="call">
        <div className="call-head">
          <span className="what">
            <span>{call.label}</span>
            <span className="freq">{call.freq}</span>
          </span>
          <span className="count">{call.text.length}/300</span>
        </div>
        <div key={`${edition}-${index}`} className="call-text" lang={edition} aria-live="polite">
          {call.text}
        </div>
        <div className="call-foot">
          <span className="note">{c.note}</span>
          <button type="button" className={`copy ${copied ? "ok" : ""}`} onClick={copy}>
            {copied ? c.copied : c.copy}
          </button>
        </div>
      </div>
    </div>
  );
}

const SectionHead = ({ eyebrow, title, text }) => (
  <div className="section-head">
    <div className="label">{eyebrow}</div>
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </div>
);

// The device/browser language: the first preferred language, French or not.
const systemLang = () => ((navigator.languages?.[0] || navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en");

export default function Landing({ initialLang = "en" }) {
  // `initialLang` comes from the Accept-Language header (server render); the browser confirms it.
  const [system, setSystem] = useState(initialLang);
  const [lang, setLang] = useState(initialLang);
  const c = COPY[lang];
  // French systems see GTA World France first.
  const editions = Object.values(EDITIONS).sort((a, b) => (b.lang === system) - (a.lang === system));

  // The system language decides on every visit; the EN/FR toggle only lasts for this tab.
  useEffect(() => {
    const detected = systemLang();
    setSystem(detected);
    let chosen = null;
    try {
      chosen = sessionStorage.getItem(LANG_KEY);
    } catch {
      // Storage blocked: the system language is enough.
    }
    setLang(chosen === "fr" || chosen === "en" ? chosen : detected);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const chooseLang = (next) => {
    setLang(next);
    try {
      sessionStorage.setItem(LANG_KEY, next);
    } catch {
      // The choice lasts until the next render only.
    }
  };

  return (
    <div className="lp">
      <div className="topbar">
        <div className="wrap">
          <a className="brand" href="#top">
            <PlaneIcon />
            <div>
              <b>GTA W</b>
              <small>FLIGHT INSTRUMENTS</small>
            </div>
          </a>
          <div className="lang" role="group" aria-label="Language / Langue">
            {["en", "fr"].map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => chooseLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <header className="hero" id="top">
        <div className="wrap">
          <div className="hero-head">
            <div className="label">{c.eyebrow}</div>
            <h1>
              {c.title[0]}
              <span className="slash">{c.title[1]}</span>
              {c.title[2]}
            </h1>
            <p className="lede">{c.lede}</p>
          </div>
          <div className="choose">
            <div className="label">{c.choose}</div>
            <div className="editions">
              {editions.map((e) => (
                <EditionCard key={e.id} edition={e} text={c.editions[e.id]} open={c.open} />
              ))}
            </div>
          </div>
        </div>
      </header>

      <hr className="rule" />
      <section className="block">
        <div className="wrap demo">
          <SectionHead eyebrow={c.demo.eyebrow} title={c.demo.title} text={c.demo.text} />
          <Demo key={system} c={c.demo} initialEdition={system} />
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.goal.eyebrow} title={c.goal.title} text={c.goal.text} />
          <div className="purpose">
            {c.goal.items.map(([title, text]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.feat.eyebrow} title={c.feat.title} />
          <div className="grid">
            {c.feat.pages.map((p) => (
              <article key={p.key} className={`page ${p.wide ? "wide" : ""}`}>
                <header>
                  <span className="label">{p.label}</span>
                  {p.only ? <span className="only">{c.feat.only}</span> : <span className="key">{p.key}</span>}
                </header>
                <div className="body">
                  <h3>{p.title}</h3>
                  <ul>
                    {p.items.map((item) =>
                      Array.isArray(item) ? (
                        <li key={item[1]}>
                          {item[0] && <b>{item[0]}</b>}
                          {item[0] && (lang === "fr" ? " : " : ": ")}
                          {item[1]}
                        </li>
                      ) : (
                        <li key={item}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
                <div className={`readout ${p.readout[0]}`}>{p.readout[1]}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.compare.eyebrow} title={c.compare.title} text={c.compare.text} />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {c.compare.cols.map((col, i) => (
                    <th key={i} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.compare.rows.map(([what, en, fr]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    <td className={en === "—" ? "no" : "yes"}>{en}</td>
                    <td className={fr === "—" ? "no" : "yes"}>{fr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.how.eyebrow} title={c.how.title} text={c.how.text} />
          <div className="flow">
            <div className="node">
              <span className="label">{c.how.flow[0][0]}</span>
              <b>{c.how.flow[0][1]}</b>
              <p>{c.how.flow[0][2]}</p>
            </div>
            <div className="arrow" aria-hidden="true">
              <span>/api</span>
            </div>
            <div className="node hub">
              <span className="label">{c.how.flow[1][0]}</span>
              <b>{c.how.flow[1][1]}</b>
              <p>{c.how.flow[1][2]}</p>
            </div>
            <div className="arrow" aria-hidden="true">
              <span>GET</span>
            </div>
            <div className="node">
              <span className="label">{c.how.flow[2][0]}</span>
              <b className="g">saaa.gta.world</b>
              <b className="c">radar.gta.world</b>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {c.how.api.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.how.rows.map(([api, what, rate]) => (
                  <tr key={api}>
                    <td className="mono">{api}</td>
                    <td>{what}</td>
                    <td className="mono">{rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="manners">
            {c.how.manners.map(([title, items]) => (
              <div key={title}>
                <h3>{title}</h3>
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.shots.eyebrow} title={c.shots.title} text={c.shots.text} />
          <div className="shots">
            {c.shots.items.map(([src, w, h, alt, bold, rest]) => (
              <figure key={src}>
                <img src={src} alt={alt} width={w} height={h} loading="lazy" />
                <figcaption>
                  <b>{bold}</b>
                  {rest}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />
      <section className="block">
        <div className="wrap">
          <SectionHead eyebrow={c.legs.eyebrow} title={c.legs.title} />
          <ol className="legs">
            {c.legs.items.map(([title, text], i) => (
              <li key={title}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>{c.footer}</span>
          <span className="mono">GTA W FLIGHT INSTRUMENTS</span>
        </div>
      </footer>
    </div>
  );
}

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { site } from "./site-data.mjs";

// Writing/notes posts live as one JSON file each under writing/ (written by the content engine,
// blog_publish.py). Loaded at build time, newest first. Empty when the dir is absent, so the
// section simply doesn't render — existing pages are untouched.
let writing = [];
async function loadWriting() {
  const srcDir = path.join(root, "content", "writing");
  let files = [];
  try {
    files = (await readdir(srcDir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const posts = [];
  for (const f of files) {
    try {
      posts.push(JSON.parse(await readFile(path.join(srcDir, f), "utf8")));
    } catch {
      /* skip malformed */
    }
  }
  return posts
    .filter(
      (p) =>
        p &&
        p.slug &&
        p.title &&
        (Array.isArray(p.body) || Array.isArray(p.sections)),
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const root = process.cwd();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
}).format(new Date());

const navItems = [
  { label: "Index", href: "/" },
  { label: "Ventures", href: "/ventures/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "Writing", href: "/writing/" },
  { label: "About", href: "/about/" },
  { label: "Research", href: "/research/" },
  { label: "Contact", href: "/contact/" },
];

const STATUS = {
  live: { label: "Live", color: "var(--status-live)" },
  pilot: { label: "In pilot", color: "var(--status-pilot)" },
  research: { label: "Research", color: "var(--status-research)" },
};

function vslug(v) {
  return (
    v.slug ||
    v.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

async function main() {
  writing = await loadWriting();
  await cleanupGeneratedRoutes();
  await writeOutput("index.html", renderHome());
  await writeOutput(path.join("ventures", "index.html"), renderVentures());
  await writeOutput(path.join("research", "index.html"), renderResearch());
  await writeOutput(path.join("gallery", "index.html"), renderGallery());
  if (writing.length) {
    await writeOutput(path.join("writing", "index.html"), renderWriting());
    for (const w of writing)
      await writeOutput(
        path.join("writing", w.slug, "index.html"),
        renderWritingDetail(w),
      );
  }
  for (const v of site.ventures)
    await writeOutput(
      path.join("ventures", vslug(v), "index.html"),
      renderVentureDetail(v),
    );
  for (const r of site.research)
    await writeOutput(
      path.join("research", r.slug, "index.html"),
      renderResearchDetail(r),
    );
  await writeOutput(path.join("about", "index.html"), renderAbout());
  await writeOutput(path.join("contact", "index.html"), renderContact());
  await writeOutput("404.html", renderNotFound());
  // legacy /projects/ → /ventures/
  await writeOutput(
    path.join("projects", "index.html"),
    renderRedirect("/ventures/"),
  );
  await writeOutput("robots.txt", renderRobots());
  await writeOutput("sitemap.xml", renderSitemap());
  await writeOutput("llms.txt", renderLlms());
  await writeOutput("CNAME", "howardchan.me\n");
}

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const attr = esc;
// Serialize JSON-LD so a stray "</script>" (or HTML comment) in any field can't break out of the
// <script> tag. Escapes <, >, & to their valid JSON \u-escapes (stays valid JSON-LD).
function jsonLdSafe(obj) {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
function urlFor(route) {
  return route === "/" ? `${site.url}/` : `${site.url}${route}`;
}

function renderHeader(current) {
  return `<header class="site-header"><div class="site-header-inner">
    <a class="brand" href="/">
      <img class="brand-mark" src="${attr(site.logo.src)}" alt="${attr(site.logo.alt)}" width="38" height="35" decoding="async">
      <span class="brand-copy"><strong>${esc(site.name)}</strong><small>${esc(site.brandSub)}</small></span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${navItems.map((n) => `<a href="${attr(n.href)}"${current === n.href ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("")}
    </nav>
  </div></header>`;
}

function renderFooter() {
  const network = site.network
    ? `<nav class="footer-network" aria-label="Howard Chan network"><span class="eyebrow">More from Howard</span><ul>${site.network.map((l) => `<li><a href="${attr(l.href)}" target="_blank" rel="noopener"><strong>${esc(l.label)}</strong>${l.note ? `<span>${esc(l.note)}</span>` : ""}</a></li>`).join("")}</ul></nav>`
    : "";
  return `<footer class="site-footer"><div class="site-footer-inner">
    ${network}
    <div class="loc"><span>${esc(site.name)} — ${esc(site.location)}</span><span>© 2026 · Built static, deployed on Cloudflare Pages</span></div>
    <nav class="footer-links" aria-label="Footer">${site.footerLinks.map((l) => `<a href="${attr(l.href)}">${esc(l.label)}</a>`).join("")}</nav>
  </div></footer>`;
}

function renderPage({
  title,
  description,
  canonicalPath,
  content,
  jsonLd,
  ogType = "website",
}) {
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${attr(description)}">
  <meta name="theme-color" content="#F6F3EC">
  <link rel="canonical" href="${attr(urlFor(canonicalPath))}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="${attr(ogType)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(urlFor(canonicalPath))}">
  <meta property="og:site_name" content="${attr(site.name)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${site.url}/assets/media/pfp.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${site.url}/assets/media/pfp.png">
  <meta name="author" content="${attr(site.fullName)}">
  <title>${esc(title)}</title>
  <script type="application/ld+json">${jsonLdSafe(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="page-shell">
    ${renderHeader(canonicalPath)}
    <main id="main" class="page-main">${content}</main>
    ${renderFooter()}
  </div>
</body>
</html>
`;
}

function statusChip(status) {
  const s = STATUS[status] || STATUS.research;
  return `<span class="chip"><span class="dot" style="background:${s.color}"></span>${esc(s.label)}</span>`;
}

function ventureCard(v) {
  const i = site.ventures.indexOf(v);
  const num = i >= 0 ? String(i + 1).padStart(2, "0") : "";
  return `<article class="vcard">
    <div class="vcard-top">
      <div class="vcard-id">${num ? `<span class="vcard-num">${num}</span>` : ""}<h3><a href="/ventures/${vslug(v)}/" style="color:inherit">${esc(v.name)}</a>${v.jp ? `<span class="jp">${esc(v.jp)}</span>` : ""}</h3></div>
      ${statusChip(v.status)}
    </div>
    <p>${esc(v.summary)}</p>
    <ul class="vdetails">${(v.details || []).map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
    <div class="vcard-foot">
      <a class="vcard-link" href="/ventures/${vslug(v)}/">Overview →</a>
      ${v.href ? `<a class="vcard-link" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="vcard-link" style="color:var(--ink-3)">${esc(v.domain)}</span>`}
    </div>
  </article>`;
}

function ventureGrid(list) {
  return `<div class="grid">${list.map(ventureCard).join("")}</div>`;
}

// Compact ledger linking every other owned property (TCL + the KVCN platform),
// so the site links to all of Howard's projects, not only the six venture cards.
function moreProjectsBlock() {
  if (!site.moreProjects || !site.moreProjects.length) return "";
  return `<section class="page-section"><span class="eyebrow">Also building</span>
    <ul class="moreproj">${site.moreProjects
      .map(
        (p) =>
          `<li><a href="${attr(p.href)}" target="_blank" rel="noopener"><strong>${esc(p.label)}</strong><span class="mp-note">${esc(p.note)}</span><span class="mp-dom">${esc(p.domain)} ↗</span></a></li>`,
      )
      .join("")}</ul></section>`;
}

function researchEntry(r) {
  return `<article class="rentry">
    <div class="rentry-head">
      <h3><a href="/research/${esc(r.slug)}/" style="color:inherit">${esc(r.title)}</a></h3>
      <span class="meta">${esc(r.meta)}</span>
    </div>
    <p class="sum">${esc(r.summary)}</p>
    <div class="body">${(r.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  </article>`;
}

function secHead(num, eyebrow) {
  return `<div class="sec-head"><span class="sec-num">${esc(num)}</span><span class="eyebrow">${esc(eyebrow)}</span></div>`;
}

function renderHome() {
  const h = site.hero;
  const content = `
    <header class="page-intro hero" style="padding-top:clamp(16px,3vw,36px)">
      <div class="masthead"><span class="masthead-l">Founder · Builder</span><span class="masthead-r">${esc(h.eyebrow)}</span></div>
      <h1>${esc(h.headline)}</h1>
      <p class="intro-subtitle">${esc(h.lead)}</p>
      <div class="hero-links">${h.links.map((l) => `<a href="${attr(l.href)}"${l.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>`).join("")}</div>
      <div class="pillars">${site.pillars.map((p) => `<div class="pillar"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join("")}</div>
    </header>
    ${secHead("02", "Ventures")}
    ${ventureGrid(site.ventures)}
    ${moreProjectsBlock()}
    ${secHead("03", "Gallery")}
    ${galleryPreview(6)}
  `;
  return renderPage({
    title: `${site.name} — ${site.brandSub}`,
    description: site.description,
    canonicalPath: "/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: site.fullName,
      alternateName: "Howard Chan",
      url: site.url,
      jobTitle: "Founder",
      sameAs: site.contactLinks
        .map((l) => l.href)
        .filter((h) => h.startsWith("http")),
      // Cambridge is incoming (matriculates Oct 2026); listing it as alumniOf
      // now overclaims against the visible "incoming" copy. Add it on enrolment.
      alumniOf: ["K. International School Tokyo"],
      description: site.tagline,
      knowsAbout: [
        "Product Management",
        "Software Engineering",
        "EdTech",
        "Quantitative Research",
        "Operations Management",
        "Regulatory Compliance",
      ],
      worksFor: {
        "@type": "Organization",
        name: "ElevateOS",
        url: "https://elevateos.org",
      },
      // Founder/affiliate of the NGO — the semantically correct edge (not
      // sameAs, which would assert the NGO *is* Howard). Pairs with the
      // rel="me author" backlink in the KVCN footers to form a verified graph.
      affiliation: {
        "@type": "NGO",
        name: "Kiwanis Voices Club of Nippon",
        url: "https://kvcn.org/",
      },
      homeLocation: { "@type": "Place", name: "Tokyo, Japan" },
      nationality: "Hong Kong",
    },
  });
}

function renderVentures() {
  const content = `${secHead("02", "Ventures")}${ventureGrid(site.ventures)}${moreProjectsBlock()}`;
  return renderPage({
    title: `Ventures · ${site.name}`,
    description: "Products and ventures Howard Chan has built and shipped.",
    canonicalPath: "/ventures/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${site.name} — Ventures`,
    },
  });
}

function renderResearch() {
  const content = `${secHead("03", "Published research")}<div class="research-list">${site.research.map(researchEntry).join("")}</div>`;
  return renderPage({
    title: `Research · ${site.name}`,
    description:
      "Published research by Howard Chan on communication, cognition, and institutional systems.",
    canonicalPath: "/research/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${site.name} — Research`,
    },
  });
}

function galleryPreview(n) {
  const items = (site.gallery || []).slice(0, n);
  if (!items.length) return "";
  const figs = items
    .map(
      (g) =>
        `<figure class="gphoto"><a href="/gallery/"><img src="${attr(g.src)}" alt="${attr(g.alt)}" loading="lazy" decoding="async"></a></figure>`,
    )
    .join("");
  return `<div class="gallery-grid">${figs}</div><p style="margin-top:16px"><a class="vcard-link" href="/gallery/">See the full gallery →</a></p>`;
}

function renderGallery() {
  const items = site.gallery || [];
  const figures = items
    .map((g) => {
      const inner = `<img src="${attr(g.src)}" alt="${attr(g.alt)}" loading="lazy" decoding="async">`;
      const cap = `<figcaption>${esc(g.caption)}${g.href ? ` <a href="${attr(g.href)}" target="_blank" rel="noopener">${esc(g.domain || "live ↗")}</a>` : ""}</figcaption>`;
      return `<figure class="gphoto">${inner}${cap}</figure>`;
    })
    .join("");
  const content = `${secHead("03", "Gallery")}
    <p class="contact-intro" style="margin-bottom:18px">Things I’ve built and shipped — the products, the Kiwanis service platform, and finished work from the family manufacturer.</p>
    <div class="gallery-grid">${figures}</div>`;
  return renderPage({
    title: `Gallery · ${site.name}`,
    description:
      "A visual gallery of Howard Chan’s work — ElevateOS, Tatemori, Prior Moves, nobill, Kiwanis Pulse, and Premier Trophy.",
    canonicalPath: "/gallery/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: `${site.name} — Gallery`,
      url: `${site.url}/gallery/`,
    },
  });
}

function renderAbout() {
  const a = site.about;
  const content = `${secHead("04", "About")}
    <div class="about-grid">
      <div class="about-prose">${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      <figure class="portrait"><img src="/assets/media/pfp.png" alt="Howard Chan" width="300" height="300" decoding="async"><figcaption>Sumida-ku, Tokyo</figcaption></figure>
    </div>
    <div class="timeline">
      <span class="eyebrow">Experience &amp; education</span>
      <div style="margin-top:14px">${a.timeline.map((t) => `<div class="tline"><h4>${esc(t.title)}</h4><span class="tmeta">${esc(t.meta)}</span><p class="tsum">${esc(t.sum)}</p></div>`).join("")}</div>
    </div>
    ${a.honors ? `<div class="timeline"><span class="eyebrow">Selected honors</span><div style="margin-top:14px">${a.honors.map((x) => `<div class="tline"><h4 style="font-weight:500">${esc(x)}</h4></div>`).join("")}</div></div>` : ""}`;
  return renderPage({
    title: `About · ${site.name}`,
    description:
      "About Howard Chan — Tokyo-based builder and researcher, incoming Cambridge HSPS.",
    canonicalPath: "/about/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        name: site.fullName,
        description: site.tagline,
      },
    },
  });
}

function renderContact() {
  const c = site.contact;
  const content = `${secHead("05", "Contact")}
    <p class="contact-intro">${esc(c.intro)}</p>
    <div class="cgroups">${c.groups.map((g) => `<div class="cgroup"><h4>${esc(g.group)}</h4><ul>${g.items.map((it) => `<li><a href="${attr(it.href)}"${it.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(it.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>
    <div class="copybar"><a class="copybtn" href="${attr(c.emailHref)}">Email me</a><span class="eyebrow" style="text-transform:none;letter-spacing:0">${esc(c.email)}</span></div>`;
  return renderPage({
    title: `Contact · ${site.name}`,
    description: "Get in touch with Howard Chan — LinkedIn, Codeberg, email.",
    canonicalPath: "/contact/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      mainEntity: {
        "@type": "Person",
        name: site.fullName,
        email: site.contact.email,
      },
    },
  });
}

function renderVentureDetail(v) {
  const others = site.ventures.filter((x) => x !== v).slice(0, 3);
  const content = `
    <p class="backlink"><a href="/ventures/">← Ventures</a></p>
    <header class="page-intro" style="padding-top:8px">
      <div class="detail-meta">${statusChip(v.status)}${v.href ? `<a class="vcard-link" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="vcard-link" style="color:var(--ink-3)">${esc(v.domain)}</span>`}</div>
      <h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${esc(v.name)}${v.jp ? ` <span class="jp" style="font-size:0.55em;color:var(--ink-3)">${esc(v.jp)}</span>` : ""}</h1>
      <p class="intro-subtitle">${esc(v.summary)}</p>
    </header>
    <section class="page-section"><span class="eyebrow">What it does</span><ul class="vdetails" style="margin-top:14px;max-width:62ch">${(v.details || []).map((d) => `<li>${esc(d)}</li>`).join("")}</ul></section>
    ${
      v.network && v.org
        ? `<section class="page-section"><span class="eyebrow">Part of ${esc(v.org.name)}</span>
      <p class="intro-subtitle" style="max-width:62ch">A youth-service NGO chartered under Kiwanis International, Japan District. I build and run its digital platform — ${v.network.length} surfaces sharing one design system.</p>
      <ul class="vdetails" style="margin-top:14px;max-width:62ch">${v.network
        .map(
          (n) =>
            `<li><a href="${attr(n.href)}" target="_blank" rel="noopener">${esc(n.label)} ↗</a>${n.note ? ` — ${esc(n.note)}` : ""}</li>`,
        )
        .join("")}</ul></section>`
        : ""
    }
    ${
      v.impact
        ? `<section class="page-section"><span class="eyebrow">Service impact</span>
      <div style="display:flex;flex-wrap:wrap;gap:24px;margin:14px 0 10px">${v.impact.stats
        .map(
          (s) =>
            `<div><span style="font-size:1.5rem;font-weight:800">${esc(s.n)}</span> <span style="font-size:0.85rem;color:var(--ink-3)">${esc(s.label)}</span></div>`,
        )
        .join("")}</div>
      <a class="vcard-link" href="${attr(v.impact.href)}" target="_blank" rel="noopener">See the club's service impact ↗</a></section>`
        : ""
    }
    <section class="page-section"><span class="eyebrow">More ventures</span><div class="grid" style="margin-top:18px">${others.map(ventureCard).join("")}</div></section>
  `;
  return renderPage({
    title: `${v.name} · ${site.name}`,
    description: v.summary,
    canonicalPath: `/ventures/${vslug(v)}/`,
    content,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: v.name,
      url: v.href || site.url,
      author: { "@type": "Person", name: site.fullName },
      description: v.summary,
      ...(v.org
        ? {
            isPartOf: {
              "@type": "NGO",
              name: v.org.name,
              url: v.org.url,
            },
          }
        : {}),
    },
  });
}

function renderResearchDetail(r) {
  const content = `
    <p class="backlink"><a href="/research/">← Research</a></p>
    <header class="page-intro" style="padding-top:8px">
      <p class="hero-eyebrow">${esc(r.meta)}</p>
      <h1 style="font-size:clamp(1.7rem,3.6vw,2.6rem);max-width:26ch">${esc(r.title)}</h1>
      <p class="intro-subtitle">${esc(r.summary)}</p>
      ${r.href ? `<div class="hero-links"><a href="${attr(r.href)}" target="_blank" rel="noopener">Read the paper ↗</a></div>` : ""}
    </header>
    <section class="page-section" style="max-width:68ch"><span class="eyebrow">Summary</span><div class="about-prose" style="margin-top:14px">${(r.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div></section>
  `;
  return renderPage({
    title: `${r.title} · ${site.name}`,
    description: r.summary,
    canonicalPath: `/research/${r.slug}/`,
    content,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: r.title,
      datePublished: "2025",
      author: { "@type": "Person", name: site.fullName },
      description: r.summary,
      mainEntityOfPage: `${site.url}/research/${r.slug}/`,
    },
  });
}

function writingEntry(w) {
  return `<article class="rentry">
    <div class="rentry-head">
      <h3><a href="/writing/${esc(w.slug)}/" style="color:inherit">${esc(w.title)}</a></h3>
      <span class="meta">${esc(w.date)}</span>
    </div>
    <p class="sum">${esc(w.description || "")}</p>
  </article>`;
}

function renderWriting() {
  const content = `${secHead("04", "Writing")}<p class="contact-intro" style="margin-bottom:18px">Field notes from building solo with AI agents — real findings, with the numbers attached.</p><div class="research-list">${writing.map(writingEntry).join("")}</div>`;
  return renderPage({
    title: `Writing · ${site.name}`,
    description:
      "Field notes by Howard Chan on building solo with AI agents, automation, and shipping — findings with receipts.",
    canonicalPath: "/writing/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `${site.name} — Writing`,
      url: `${site.url}/writing/`,
      author: { "@type": "Person", name: site.fullName },
      blogPost: writing.map((w) => ({
        "@type": "BlogPosting",
        headline: w.title,
        datePublished: w.date,
        url: `${site.url}/writing/${w.slug}/`,
      })),
    },
  });
}

// Render a fenced code/config snippet from the content engine. Strips the language
// fence the model sometimes leaves on (```js ... ```), since we control the <pre><code> shell.
function codeBlock(raw) {
  if (!raw || typeof raw !== "string") return "";
  let code = raw.trim();
  const fence = code.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  if (fence) code = fence[1];
  return `<pre class="code-block"><code>${esc(code)}</code></pre>`;
}

function tldrBox(tldr) {
  if (!tldr) return "";
  return `<div class="tldr" style="border-left:3px solid var(--accent);padding:12px 18px;margin:18px 0;background:var(--surface-2,rgba(0,0,0,0.02))"><span class="eyebrow">TL;DR</span><p style="margin:6px 0 0">${esc(tldr)}</p></div>`;
}

function writingSections(sections) {
  return (sections || [])
    .map(
      (s) =>
        `<section class="writing-section" style="margin-top:26px"><h2 style="font-size:clamp(1.25rem,2.4vw,1.6rem);max-width:42ch">${esc(s.h2)}</h2><div class="about-prose" style="margin-top:8px">${(s.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>${s.code ? codeBlock(s.code) : ""}</section>`,
    )
    .join("");
}

function faqBlock(faqs) {
  if (!faqs || !faqs.length) return "";
  const items = faqs
    .map(
      (f) =>
        `<details class="faq-item" style="border-top:1px solid var(--rule,rgba(0,0,0,0.08));padding:10px 0"><summary style="cursor:pointer;font-weight:600">${esc(f.q)}</summary><div class="about-prose" style="margin-top:8px"><p>${esc(f.a)}</p></div></details>`,
    )
    .join("");
  return `<section class="page-section"><span class="eyebrow">FAQ</span><div class="faq" style="margin-top:12px">${items}</div></section>`;
}

// "Related" list: prefer the slugs the content engine suggested (resolved against published
// posts), falling back to plain recency so the section always renders something useful.
function relatedWriting(w) {
  let related = [];
  if (Array.isArray(w.related_slugs) && w.related_slugs.length) {
    related = w.related_slugs
      .map((slug) => writing.find((x) => x.slug === slug && x.slug !== w.slug))
      .filter(Boolean);
  }
  if (!related.length) {
    related = writing.filter((x) => x.slug !== w.slug).slice(0, 3);
  }
  return related.slice(0, 3);
}

function renderWritingDetail(w) {
  const hasSections = Array.isArray(w.sections) && w.sections.length > 0;
  const more = relatedWriting(w);
  const bodyHtml = hasSections
    ? `${tldrBox(w.tldr)}${writingSections(w.sections)}${faqBlock(w.faqs)}`
    : `<section class="page-section" style="max-width:68ch"><div class="about-prose" style="margin-top:6px">${(w.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div></section>`;
  const content = `
    <p class="backlink"><a href="/writing/">← Writing</a></p>
    <header class="page-intro" style="padding-top:8px">
      <p class="hero-eyebrow">${esc(w.date)}</p>
      <h1 style="font-size:clamp(1.7rem,3.6vw,2.6rem);max-width:30ch">${esc(w.title)}</h1>
      ${w.description ? `<p class="intro-subtitle">${esc(w.description)}</p>` : ""}
    </header>
    ${hasSections ? `<div style="max-width:68ch">${bodyHtml}</div>` : bodyHtml}
    ${more.length ? `<section class="page-section"><span class="eyebrow">More writing</span><div class="research-list" style="margin-top:14px">${more.map(writingEntry).join("")}</div></section>` : ""}
  `;

  const blogPosting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: w.title,
    datePublished: w.date,
    dateModified: w.date,
    author: { "@type": "Person", name: site.fullName, url: site.url },
    publisher: { "@type": "Person", name: site.fullName },
    description: w.description || w.title,
    mainEntityOfPage: `${site.url}/writing/${w.slug}/`,
  };
  // Emit an FAQPage alongside the BlogPosting when the article carries FAQs, so the page is
  // eligible for the FAQ rich result in search. Both objects ship in the same ld+json array.
  const jsonLd =
    hasSections && Array.isArray(w.faqs) && w.faqs.length
      ? [
          blogPosting,
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: w.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : blogPosting;

  return renderPage({
    title: `${w.title} · ${site.name}`,
    description: w.description || w.title,
    canonicalPath: `/writing/${w.slug}/`,
    content,
    ogType: "article",
    jsonLd,
  });
}

function renderNotFound() {
  const content = `<header class="page-intro"><p class="hero-eyebrow">404</p><h1>Page not found.</h1><p class="intro-subtitle">Try the <a class="vcard-link" href="/">index</a>, <a class="vcard-link" href="/ventures/">ventures</a>, or <a class="vcard-link" href="/contact/">contact</a>.</p></header>`;
  return renderPage({
    title: `Not found · ${site.name}`,
    description: "Page not found.",
    canonicalPath: "/404/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Not found",
    },
  });
}

function renderRedirect(target) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${attr(target)}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${attr(urlFor(target))}"><title>Redirecting…</title></head><body><script>location.replace(${JSON.stringify(target)});</script><p>Redirecting to <a href="${attr(target)}">${esc(target)}</a>.</p></body></html>`;
}

function renderLlms() {
  return `# ${site.name}
${site.tagline}

${site.fullName} — founder, builder, and researcher; incoming University of Cambridge HSPS (Peterhouse).

## Ventures
${site.ventures.map((v) => `- ${v.name}${v.domain && v.domain.includes(".") ? ` (${v.domain})` : ""}: ${v.summary}`).join("\n")}

## More projects
${(site.moreProjects || []).map((p) => `- ${p.label} (${p.domain}): ${p.note}`).join("\n")}

## Research
${site.research.map((r) => `- ${r.title} (${r.meta})`).join("\n")}

## Pages
- ${site.url}/  — index
- ${site.url}/ventures/  — ventures
- ${site.url}/gallery/  — project gallery
- ${site.url}/research/  — published research
- ${site.url}/about/  — about + experience
- ${site.url}/contact/  — contact

## Links
${site.contactLinks.map((l) => `- ${l.label}: ${l.href}`).join("\n")}
`;
}

function renderRobots() {
  return `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`;
}

function renderSitemap() {
  const routes = [
    "/",
    "/ventures/",
    "/gallery/",
    "/research/",
    "/about/",
    "/contact/",
    ...site.ventures.map((v) => `/ventures/${vslug(v)}/`),
    ...site.research.map((r) => `/research/${r.slug}/`),
    ...(writing.length ? ["/writing/"] : []),
  ];
  const writingUrls = writing.map(
    (w) =>
      `  <url><loc>${site.url}/writing/${w.slug}/</loc><lastmod>${esc(w.date)}</lastmod><priority>0.6</priority></url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${site.url}${r === "/" ? "/" : r}</loc><lastmod>${today}</lastmod><priority>${r === "/" ? "1.0" : "0.7"}</priority></url>`).join("\n")}${writingUrls.length ? "\n" + writingUrls.join("\n") : ""}
</urlset>
`;
}

async function cleanupGeneratedRoutes() {
  const dirs = [
    "ventures",
    "research",
    "gallery",
    "about",
    "contact",
    "projects",
    "awards-certifications",
    "portfolio",
    "blog",
    "writing",
    "guides",
    "awards",
  ];
  await Promise.all(
    dirs.map((d) => rm(path.join(root, d), { recursive: true, force: true })),
  );
}

async function writeOutput(rel, content) {
  const target = path.join(root, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, String(content).replace(/[ \t]+$/gm, ""), "utf8");
}

await main();

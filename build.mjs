import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { site } from "./site-data.mjs";

// Writing/notes posts live as one JSON file each under writing/ (written by the content engine,
// blog_publish.py). Loaded at build time, newest first. Empty when the dir is absent, so the
// section simply doesn't render; existing pages are untouched.
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

// Cache-buster for the two stylesheets (they ship with a 1-year immutable
// Cache-Control from _headers). Bump when either CSS file changes.
const ASSET_V = "20260718";

const navItems = [
  { label: "Index", href: "/", num: "01" },
  { label: "Ventures", href: "/ventures/", num: "02" },
  { label: "Gallery", href: "/gallery/", num: "03" },
  { label: "Writing", href: "/writing/", num: "04" },
  { label: "About", href: "/about/", num: "05" },
  { label: "Research", href: "/research/", num: "06" },
  { label: "Contact", href: "/contact/", num: "07" },
];

// Masthead locale line, reused across page tops and detail pages.
const LOCALE = site.hero.eyebrow;
const HERO_ROLE = "Founder · Builder · Researcher";

// Interior page copy (title + lead) for the masthead page-top.
const PAGE_COPY = {
  ventures: {
    title: "Shipped, piloting, on the record.",
    lead: "Ventures with honest status. Each one maps a workflow, finds the friction, and ships a tool people can use, hand off, and trust.",
  },
  gallery: {
    title: "Built and shipped.",
    lead: "The products, the Kiwanis service platform, and finished work from the family manufacturer.",
  },
  writing: {
    title: "Working notes.",
    lead: "Short notes from inside the work: building solo with AI agents, operations, and shipping. Written when there is something concrete to say.",
  },
  research: {
    title: "Published research.",
    lead: "Presented as citations because that is what they are. Communication, cognition, and how institutional systems behave.",
  },
  about: { title: "Coordination is the through-line." },
  // Title only (no lead): gives the contact page its one h1 without adding copy.
  contact: { title: "Get in touch." },
};

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
  await writeOutput(path.join("stack", "index.html"), renderStack());
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
  return `<header class="hdr"><div class="wrap hdr-in">
    <a class="wordmark" href="/" aria-label="Howard Chan, index">
      <span class="wordmark-mark" aria-hidden="true"></span>
      <span class="wordmark-stack"><span class="wordmark-name">${esc(site.name)}</span><span class="wordmark-sub">${esc(site.brandSub)}</span></span>
    </a>
    <nav class="nav" aria-label="Primary">
      ${navItems.map((n) => `<a href="${attr(n.href)}"${current === n.href ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("")}
    </nav>
  </div></header>`;
}

function renderFooter() {
  const cols = site.contact.groups
    .map(
      (g) =>
        `<div class="ftr-col"><h4>${esc(g.group)}</h4><ul>${g.items.map((it) => `<li><a href="${attr(it.href)}"${it.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(it.label)}</a></li>`).join("")}</ul></div>`,
    )
    .join("");
  return `<footer class="ftr"><div class="wrap ftr-in">
    <div class="ftr-mesh">
      ${cols}
      <div class="ftr-col ftr-brand"><span class="ftr-mark" aria-hidden="true"></span><p class="ftr-line">Built as a fast static site on Cloudflare Pages. No trackers.</p></div>
    </div>
    <div class="ftr-base"><span class="loc">Tokyo · Hong Kong · Cambridge</span><span class="site"><span class="dot"></span>howardchan.me</span></div>
  </div></footer>`;
}

function renderPage({
  title,
  description,
  canonicalPath,
  content,
  jsonLd,
  ogType = "website",
  ogImage,
  noindex = false,
}) {
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  const img = `${site.url}${ogImage || "/assets/media/og-card.png"}`;
  // The 404 page is noindex and carries no canonical: a canonical pointing at a
  // URL that answers 404 would be a broken canonical.
  const indexTags = noindex
    ? `<meta name="robots" content="noindex">`
    : `<link rel="canonical" href="${attr(urlFor(canonicalPath))}">`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${attr(description)}">
  <meta name="theme-color" content="#F6F3EC">
  ${indexTags}
  <link rel="preload" href="/assets/fonts/newsreader-normal-400-600-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/hanken-grotesk-normal-400-700-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/colors_and_type.css?v=${ASSET_V}">
  <link rel="stylesheet" href="/assets/styles.css?v=${ASSET_V}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/favicon-180.png">
  <meta property="og:type" content="${attr(ogType)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(urlFor(canonicalPath))}">
  <meta property="og:site_name" content="${attr(site.name)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${img}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${img}">
  <meta name="author" content="${attr(site.fullName)}">
  <title>${esc(title)}</title>
  <script type="application/ld+json">${jsonLdSafe(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="shell">
    ${renderHeader(canonicalPath)}
    <main id="main" class="view wrap">${content}</main>
    ${renderFooter()}
  </div>
</body>
</html>
`;
}

function statusChip(status) {
  const s = STATUS[status] || STATUS.research;
  const cls =
    status === "live" ? "live" : status === "pilot" ? "pilot" : "research";
  return `<span class="chip ${cls}"><span class="dot"></span>${esc(s.label)}</span>`;
}

function ventureCard(v) {
  const i = site.ventures.indexOf(v);
  const num = i >= 0 ? String(i + 1).padStart(2, "0") : "01";
  return `<article class="vcard">
    <div class="vcard-top">
      <div class="vcard-title"><span class="vnum">${num}</span><h3><a href="/ventures/${vslug(v)}/" style="color:inherit">${esc(v.name)}</a>${v.jp ? `<span class="jp">${esc(v.jp)}</span>` : ""}</h3></div>
      ${statusChip(v.status)}
    </div>
    <p>${esc(v.summary)}</p>
    <div class="vcard-foot">
      <a class="vcard-link" href="/ventures/${vslug(v)}/">Details →</a>
      ${v.href ? `<a class="vcard-domain" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="vcard-domain">${esc(v.domain)}</span>`}
    </div>
  </article>`;
}

function ventureGrid(list) {
  return `<div class="grid">${list.map(ventureCard).join("")}</div>`;
}

// Also-building ledger: links every other owned property (TCL + KVCN platform)
// as a hairline ledger, so the site reaches all of Howard's work, not only cards.
function moreProjectsBlock() {
  if (!site.moreProjects || !site.moreProjects.length) return "";
  return `<div class="ledger"><div class="ledger-head"><span class="eyebrow small">Also building</span></div>
    ${site.moreProjects
      .map(
        (p) =>
          `<a class="lrow" href="${attr(p.href)}" target="_blank" rel="noopener"><span class="lrow-name">${esc(p.label)}</span><span class="lrow-note">${esc(p.note)}</span><span class="lrow-domain">${esc(p.domain)} →</span></a>`,
      )
      .join("")}</div>`;
}

// Research as numbered academic citations (R-01, R-02 …). embedded = summary only.
function citationEntry(r, i, embedded) {
  const num = `R-${String(i + 1).padStart(2, "0")}`;
  return `<article class="rentry">
    <span class="rnum">${num}</span>
    <div class="rentry-body">
      <h3><a href="/research/${esc(r.slug)}/" style="color:inherit">${esc(r.title)}</a></h3>
      <div class="rentry-meta"><span class="meta">${esc(r.meta)}</span><span class="chip research"><span class="dot"></span>Research</span></div>
      <p class="sum">${esc(r.summary)}</p>
      ${!embedded ? (r.body || []).map((p) => `<p class="sum">${esc(p)}</p>`).join("") : ""}
      <a class="read" href="/research/${esc(r.slug)}/">Read the paper →</a>
    </div>
  </article>`;
}

function secHead(num, eyebrow) {
  return `<div class="sec-head"><span class="sec-num">${esc(num)}</span><span class="eyebrow">${esc(eyebrow)}</span></div>`;
}

// Masthead band: the repeating structural motif (mono meta, framed by rules).
function masthead(left, right) {
  return `<div class="masthead"><span class="masthead-l">${esc(left)}</span><span class="masthead-r">${esc(right)}</span></div>`;
}

// Interior page top: masthead (page label · num / locale) + carved title + lead.
function pageTop(pageKey) {
  const n = navItems.find((x) => x.href === `/${pageKey}/`);
  const label = n ? n.label : pageKey;
  const num = n ? n.num : "";
  const copy = PAGE_COPY[pageKey] || {};
  return `<div class="page-top">${masthead(`${label} · ${num}`, LOCALE)}${copy.title ? `<h1 class="page-title">${esc(copy.title)}</h1>` : ""}${copy.lead ? `<p class="page-lead">${esc(copy.lead)}</p>` : ""}</div>`;
}

function renderHome() {
  const h = site.hero;
  const content = `
    <section class="hero">
      ${masthead(HERO_ROLE, h.eyebrow)}
      <h1>${esc(h.headline)}</h1>
      <p class="lead">${esc(h.lead)}</p>
      <div class="hero-links">${h.links.map((l) => `<a href="${attr(l.href)}"${l.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>`).join("")}</div>
      <div class="pillars">${site.pillars.map((p) => `<div class="pillar"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join("")}</div>
    </section>
    <section class="home-sec">${secHead("02", "Ventures")}${ventureGrid(site.ventures)}${moreProjectsBlock()}</section>
    <section class="home-sec">${secHead("03", "Gallery")}${galleryPreview(6)}</section>
  `;
  return renderPage({
    title: `${site.name} · ${site.brandSub}`,
    description: site.description,
    canonicalPath: "/",
    content,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: site.name,
        url: `${site.url}/`,
        description: site.description,
        author: { "@type": "Person", name: site.fullName },
      },
      {
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
        // Founder/affiliate of the NGO: the semantically correct edge (not
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
    ],
  });
}

function renderVentures() {
  const content = `${pageTop("ventures")}${ventureGrid(site.ventures)}${moreProjectsBlock()}`;
  return renderPage({
    title: `Ventures · ${site.name}`,
    description: "Products and ventures Howard Chan has built and shipped.",
    canonicalPath: "/ventures/",
    content,
    ogImage: "/assets/media/og-ventures.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${site.name} · Ventures`,
    },
  });
}

function renderResearch() {
  const content = `${pageTop("research")}<div class="research-list">${site.research.map((r, i) => citationEntry(r, i, false)).join("")}</div>`;
  return renderPage({
    title: `Research · ${site.name}`,
    description:
      "Published research by Howard Chan on communication, cognition, and institutional systems.",
    canonicalPath: "/research/",
    content,
    ogImage: "/assets/media/og-research.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${site.name} · Research`,
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
  const content = `${pageTop("gallery")}<div class="gallery-grid">${figures}</div>`;
  return renderPage({
    title: `Gallery · ${site.name}`,
    description:
      "A visual gallery of Howard Chan’s work: ElevateOS, Tatemori, Prior Moves, nobill, Kiwanis Pulse, and Premier Trophy.",
    canonicalPath: "/gallery/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: `${site.name} · Gallery`,
      url: `${site.url}/gallery/`,
    },
  });
}

function renderAbout() {
  const a = site.about;
  const content = `${pageTop("about")}
    <div class="about-grid">
      <div class="about-prose">${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      <div class="portrait-stack">
        <figure class="portrait"><img src="/assets/media/pfp.png" alt="Howard Chan" width="300" height="300" decoding="async"><figcaption>Sumida-ku, Tokyo</figcaption></figure>
        <figure class="portrait"><img src="/assets/media/global-brain-pitch-sm.webp" alt="Howard Chan pitching ElevateOS to Global Brain in Tokyo" width="640" height="427" loading="lazy" decoding="async"><figcaption>Pitching at Global Brain · Tokyo</figcaption></figure>
      </div>
    </div>
    <div class="page-section">${secHead("05.1", "Timeline")}<div class="timeline-list">${a.timeline.map((t, i) => `<div class="tline"><span class="tnum">${String(i + 1).padStart(2, "0")}</span><h4>${esc(t.title)}</h4><span class="tmeta">${esc(t.meta)}</span><p class="tsum">${esc(t.sum)}</p></div>`).join("")}</div></div>
    ${a.honors ? `<div class="page-section">${secHead("05.2", "Honors")}<ul class="honors-list">${a.honors.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
  return renderPage({
    title: `About · ${site.name}`,
    description:
      "About Howard Chan, Tokyo-based builder and researcher, incoming Cambridge HSPS.",
    canonicalPath: "/about/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      // Facts only, all stated on this page: name, Tokyo, incoming HSPS at
      // Peterhouse (Cambridge), founder. Same sameAs set as the home Person.
      mainEntity: {
        "@type": "Person",
        name: site.fullName,
        alternateName: "Howard Chan",
        url: site.url,
        jobTitle: "Founder",
        description:
          "Tokyo-based founder and builder, incoming HSPS student at Peterhouse, University of Cambridge.",
        homeLocation: { "@type": "Place", name: "Tokyo, Japan" },
        sameAs: site.contactLinks
          .map((l) => l.href)
          .filter((h) => h.startsWith("http")),
      },
    },
  });
}

function renderContact() {
  const c = site.contact;
  const content = `${pageTop("contact")}
    <p class="contact-intro">${esc(c.intro)}</p>
    <div class="cgroups">${c.groups.map((g) => `<div class="cgroup"><h4>${esc(g.group)}</h4><ul>${g.items.map((it) => `<li><a href="${attr(it.href)}"${it.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(it.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>
    <div class="copybar"><a class="copybtn" href="${attr(c.emailHref)}">Email me</a><span class="copynote">${esc(c.email)}</span></div>`;
  return renderPage({
    title: `Contact · ${site.name}`,
    description: "Get in touch with Howard Chan: LinkedIn, Codeberg, email.",
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

function renderStack() {
  const card = (n, h, body) =>
    `<div class="tline"><span class="tnum">${n}</span><h4>${h}</h4><p class="tsum">${body}</p></div>`;
  const content = `<div class="page-top">${masthead("Stack · 08", LOCALE)}
    <h1 class="page-title">The stack</h1>
    <p class="page-lead">The systems I run solo across investing (PriorMoves), distribution, and an agency layer (ElevateOS). Built for near-zero cost: free and local first, every outward action gated and dry-run before it sends.</p></div>

    <div class="page-section">${secHead("08.1", "Distribution + outreach")}
    <div class="timeline-list">
      ${card("01", "LinkedIn growth engine", "A headless connect and DM lane over my own session, paced on the limits that real CDR tools (gojiberry, Expandi, PhantomBuster) publish, with human gaps and warmup. It discovers my account's true weekly ceiling by watching for the block instead of guessing a number.")}
      ${card("02", "Commenter to DM flywheel", "A post asks for a keyword, people comment, a responder DMs them the asset and sends a connect to the ones who are not connections yet. Warm inbound instead of cold outreach.")}
      ${card("03", "One 9am pipeline", "Sync (Gmail, WhatsApp, reconcile), reach snapshot, source-of-truth doc sync, warm DMs, cold connects, and content fan-out chained into a single scheduled run. Nothing sends without an explicit enable flag.")}
      ${card("04", "Multi-platform fan-out", "One canonical post adapted natively for X, Bluesky, Telegram, Threads, and newsletters, each re-linted before it ships. A platform turns on the moment its credential lands in the keychain.")}
    </div></div>

    <div class="page-section">${secHead("08.2", "Investing engine — PriorMoves")}
    <div class="timeline-list">
      ${card("05", "58 investors, next-buy model", "Each investor's disclosed 13F holdings plus a per-investor model of the stocks they are most likely to buy next, roughly six weeks before the filing. Walk-forward gated, so a market only ships a prediction when it clears the test.")}
      ${card("06", "Global registers", "Japan, UK, Korea, and EU large-shareholding surfaces alongside the US book, plus Congress trades, activist 13D drift, and federal contract awards. All local, all zero cost, live at priormoves.com.")}
    </div></div>

    <div class="page-section">${secHead("08.3", "Operating doctrine")}
    <ul class="honors-list">
      <li>Free or local first. Local models for text transforms, Codex for web discovery, paid APIs only when they are the only thing that works and the cost is stated up front.</li>
      <li>Secrets live in the OS keychain, never in a file. Around 150 wired keys, each mapped to a use case.</li>
      <li>Verify before claiming. No asserting a limit or a result from memory; check the source, then state it.</li>
      <li>Everything reversible. Dry-run is the default, sends are gated, and every deploy has a one-command rollback.</li>
    </ul></div>

    <div class="copybar"><a class="copybtn" href="https://www.linkedin.com/in/howardchan2008/" target="_blank" rel="noopener">Connect on LinkedIn</a><span class="copynote">happy to walk through any part of it</span></div>`;
  return renderPage({
    title: `The stack · ${site.name}`,
    description:
      "The systems Howard Chan runs solo across investing (PriorMoves), distribution, and an agency layer. Free and local first, every outward action gated.",
    canonicalPath: "/stack/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "The stack",
      url: "https://howardchan.me/stack/",
    },
  });
}

function renderVentureDetail(v) {
  const i = site.ventures.indexOf(v);
  const num = String(i + 1).padStart(2, "0");
  const next = site.ventures[(i + 1) % site.ventures.length];
  const nextNum = String(((i + 1) % site.ventures.length) + 1).padStart(2, "0");
  const content = `
    <p class="backlink"><a href="/ventures/">← All ventures</a></p>
    ${masthead(`Venture · ${num}`, LOCALE)}
    <div class="detail-meta">${statusChip(v.status)}${v.href ? `<a class="detail-domain" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="detail-domain" style="color:var(--ink-3)">${esc(v.domain)}</span>`}</div>
    <h1 class="detail-h1">${esc(v.name)}${v.jp ? ` <span class="jp">${esc(v.jp)}</span>` : ""}</h1>
    <p class="intro-subtitle">${esc(v.summary)}</p>
    <section class="page-section"><span class="eyebrow">On the record</span><ul class="vdetails wide">${(v.details || []).map((d) => `<li>${esc(d)}</li>`).join("")}</ul></section>
    ${
      v.network && v.org
        ? `<section class="page-section"><span class="eyebrow">Part of ${esc(v.org.name)}</span><p class="intro-subtitle" style="max-width:62ch">A youth-service NGO chartered under Kiwanis International, Japan District. I build and run its digital platform: ${v.network.length} surfaces sharing one design system.</p><ul class="vdetails wide">${v.network
            .map(
              (n) =>
                `<li><a class="ds-link" href="${attr(n.href)}" target="_blank" rel="noopener">${esc(n.label)} ↗</a>${n.note ? ` · ${esc(n.note)}` : ""}</li>`,
            )
            .join("")}</ul></section>`
        : ""
    }
    ${
      v.impact
        ? `<section class="page-section"><span class="eyebrow">Service impact</span><div class="impact-stats">${v.impact.stats
            .map(
              (s) =>
                `<div><span class="n">${esc(s.n)}</span><span class="l">${esc(s.label)}</span></div>`,
            )
            .join(
              "",
            )}</div><a class="vcard-link" href="${attr(v.impact.href)}" target="_blank" rel="noopener">See the club's service impact ↗</a></section>`
        : ""
    }
    <div class="ledger next-ledger"><div class="ledger-head"><span class="eyebrow small">Next</span></div><a class="lrow" href="/ventures/${vslug(next)}/"><span class="lrow-name">${nextNum} · ${esc(next.name)}</span><span class="lrow-note">${esc(next.domain)}</span><span class="lrow-domain">Open →</span></a></div>
  `;
  return renderPage({
    title: `${v.name} · ${site.name}`,
    description: v.summary,
    canonicalPath: `/ventures/${vslug(v)}/`,
    content,
    ogType: "article",
    ogImage: "/assets/media/og-ventures.png",
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
  const rnum = `R-${String(site.research.indexOf(r) + 1).padStart(2, "0")}`;
  const content = `
    <p class="backlink"><a href="/research/">← All research</a></p>
    ${masthead(`Research · ${rnum}`, r.meta)}
    <div class="detail-meta"><span class="chip research"><span class="dot"></span>Research</span><span class="meta">${esc(r.meta)}</span></div>
    <h1 class="detail-h1 paper-h1">${esc(r.title)}</h1>
    <p class="intro-subtitle">${esc(r.summary)}</p>
    <section class="page-section"><span class="eyebrow">Abstract, plainly</span><div class="rbody">${(r.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div></section>
    ${r.href ? `<a class="more-link" href="${attr(r.href)}" target="_blank" rel="noopener">Read the paper →</a>` : ""}
  `;
  return renderPage({
    title: `${r.title} · ${site.name}`,
    description: r.summary,
    canonicalPath: `/research/${r.slug}/`,
    content,
    ogType: "article",
    ogImage: "/assets/media/og-research.png",
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

function writingEntry(w, i) {
  const num = `W-${String((i || 0) + 1).padStart(2, "0")}`;
  return `<a class="wrow" href="/writing/${esc(w.slug)}/"><span class="wnum">${num}</span><span class="wdate">${esc(w.date || "")}</span><span class="wbody"><span class="wtitle">${esc(w.title)}</span>${w.description ? `<span class="wnote">${esc(w.description)}</span>` : ""}</span><span class="warrow">→</span></a>`;
}

function renderWriting() {
  const content = `${pageTop("writing")}<div class="writing-list">${writing.map((w, i) => writingEntry(w, i)).join("")}</div>`;
  return renderPage({
    title: `Writing · ${site.name}`,
    description:
      "Field notes by Howard Chan on building solo with AI agents, automation, and shipping. Findings with receipts.",
    canonicalPath: "/writing/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `${site.name} · Writing`,
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
    ${masthead(`Writing · ${w.date || ""}`, LOCALE)}
    <h1 class="detail-h1 paper-h1">${esc(w.title)}</h1>
    ${w.description ? `<p class="intro-subtitle">${esc(w.description)}</p>` : ""}
    ${hasSections ? `<div style="max-width:68ch">${bodyHtml}</div>` : bodyHtml}
    ${more.length ? `<section class="page-section"><span class="eyebrow">More writing</span><div class="writing-list" style="margin-top:14px">${more.map((x, i) => writingEntry(x, i)).join("")}</div></section>` : ""}
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
  const content = `${masthead("Error · 404", LOCALE)}<h1 class="detail-h1" style="margin-top:22px">Page not found.</h1><p class="intro-subtitle">Try the <a class="ds-link" href="/">index</a>, <a class="ds-link" href="/ventures/">ventures</a>, or <a class="ds-link" href="/contact/">contact</a>.</p>`;
  return renderPage({
    title: `Not found · ${site.name}`,
    description: "Page not found.",
    canonicalPath: "/404/",
    noindex: true,
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

${site.fullName}. Founder, builder, and researcher; incoming University of Cambridge HSPS (Peterhouse).

## Ventures
${site.ventures.map((v) => `- ${v.name}${v.domain && v.domain.includes(".") ? ` (${v.domain})` : ""}: ${v.summary}`).join("\n")}

## More projects
${(site.moreProjects || []).map((p) => `- ${p.label} (${p.domain}): ${p.note}`).join("\n")}

## Research
${site.research.map((r) => `- ${r.title} (${r.meta})`).join("\n")}

## Pages
- ${site.url}/ (index)
- ${site.url}/ventures/ (ventures)
- ${site.url}/gallery/ (project gallery)
- ${site.url}/writing/ (working notes)
- ${site.url}/research/ (published research)
- ${site.url}/about/ (about + experience)
- ${site.url}/stack/ (the systems behind the work)
- ${site.url}/contact/ (contact)

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
    "/stack/",
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
    "stack",
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

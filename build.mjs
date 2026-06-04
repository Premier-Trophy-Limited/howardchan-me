import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { site } from './site-data.mjs';

const root = process.cwd();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

const navItems = [
  { label: 'Index', href: '/' },
  { label: 'Ventures', href: '/ventures/' },
  { label: 'Research', href: '/research/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

const STATUS = {
  live: { label: 'Live', color: 'var(--status-live)' },
  pilot: { label: 'In pilot', color: 'var(--status-pilot)' },
  research: { label: 'Research', color: 'var(--status-research)' },
};

function vslug(v) { return v.slug || v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function main() {
  await cleanupGeneratedRoutes();
  await writeOutput('index.html', renderHome());
  await writeOutput(path.join('ventures', 'index.html'), renderVentures());
  await writeOutput(path.join('research', 'index.html'), renderResearch());
  for (const v of site.ventures) await writeOutput(path.join('ventures', vslug(v), 'index.html'), renderVentureDetail(v));
  for (const r of site.research) await writeOutput(path.join('research', r.slug, 'index.html'), renderResearchDetail(r));
  await writeOutput(path.join('about', 'index.html'), renderAbout());
  await writeOutput(path.join('contact', 'index.html'), renderContact());
  await writeOutput('404.html', renderNotFound());
  // legacy /projects/ → /ventures/
  await writeOutput(path.join('projects', 'index.html'), renderRedirect('/ventures/'));
  await writeOutput('robots.txt', renderRobots());
  await writeOutput('sitemap.xml', renderSitemap());
  await writeOutput('llms.txt', renderLlms());
  await writeOutput('CNAME', 'howardchan.me\n');
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const attr = esc;
function urlFor(route) { return route === '/' ? `${site.url}/` : `${site.url}${route}`; }

function renderHeader(current) {
  return `<header class="site-header"><div class="site-header-inner">
    <a class="brand" href="/">
      <img class="brand-mark" src="${attr(site.logo.src)}" alt="${attr(site.logo.alt)}" width="38" height="35" decoding="async">
      <span class="brand-copy"><strong>${esc(site.name)}</strong><small>${esc(site.brandSub)}</small></span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${navItems.map((n) => `<a href="${attr(n.href)}"${current === n.href ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}
    </nav>
  </div></header>`;
}

function renderFooter() {
  return `<footer class="site-footer"><div class="site-footer-inner">
    <div class="loc"><span>${esc(site.name)} — ${esc(site.location)}</span><span>© 2026 · Built static, deployed on Cloudflare Pages</span></div>
    <nav class="footer-links" aria-label="Footer">${site.footerLinks.map((l) => `<a href="${attr(l.href)}">${esc(l.label)}</a>`).join('')}</nav>
  </div></footer>`;
}

function renderPage({ title, description, canonicalPath, content, jsonLd, ogType = 'website' }) {
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
  <script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
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
  return `<article class="vcard">
    <div class="vcard-top">
      <h3><a href="/ventures/${vslug(v)}/" style="color:inherit">${esc(v.name)}</a>${v.jp ? `<span class="jp">${esc(v.jp)}</span>` : ''}</h3>
      ${statusChip(v.status)}
    </div>
    <p>${esc(v.summary)}</p>
    <ul class="vdetails">${(v.details || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    <div class="vcard-foot">
      <a class="vcard-link" href="/ventures/${vslug(v)}/">Overview →</a>
      ${v.href ? `<a class="vcard-link" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="vcard-link" style="color:var(--ink-3)">${esc(v.domain)}</span>`}
    </div>
  </article>`;
}

function ventureGrid(list) {
  return `<div class="grid">${list.map(ventureCard).join('')}</div>`;
}

function researchEntry(r) {
  return `<article class="rentry">
    <div class="rentry-head">
      <h3><a href="/research/${esc(r.slug)}/" style="color:inherit">${esc(r.title)}</a></h3>
      <span class="meta">${esc(r.meta)}</span>
    </div>
    <p class="sum">${esc(r.summary)}</p>
    <div class="body">${(r.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </article>`;
}

function secHead(num, eyebrow) {
  return `<div class="sec-head"><span class="sec-num">${esc(num)}</span><span class="eyebrow">${esc(eyebrow)}</span></div>`;
}

function renderHome() {
  const h = site.hero;
  const content = `
    <header class="page-intro" style="padding-top:clamp(20px,4vw,48px)">
      <p class="hero-eyebrow">${esc(h.eyebrow)}</p>
      <h1>${esc(h.headline)}</h1>
      <p class="intro-subtitle">${esc(h.lead)}</p>
      <div class="hero-links">${h.links.map((l) => `<a href="${attr(l.href)}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('')}</div>
      <div class="pillars">${site.pillars.map((p) => `<div class="pillar"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join('')}</div>
    </header>
    ${secHead('02', 'Selected ventures')}
    ${ventureGrid(site.ventures.slice(0, 4))}
    <a class="more-link" href="/ventures/">All ventures →</a>
    ${secHead('03', 'Published research')}
    <div class="research-list">${site.research.map(researchEntry).join('')}</div>
  `;
  return renderPage({
    title: `${site.name} — ${site.brandSub}`,
    description: site.description,
    canonicalPath: '/',
    content,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Person', name: site.fullName, alternateName: 'Howard Chan', url: site.url,
      jobTitle: 'Founder', sameAs: site.contactLinks.map((l) => l.href).filter((h) => h.startsWith('http')),
      alumniOf: ['University of Cambridge', 'K. International School Tokyo'], description: site.tagline,
      knowsAbout: ['Product Management', 'Software Engineering', 'EdTech', 'Quantitative Research', 'Operations Management', 'Regulatory Compliance'],
      worksFor: { '@type': 'Organization', name: 'ElevateOS', url: 'https://elevateos.org' },
      homeLocation: { '@type': 'Place', name: 'Tokyo, Japan' }, nationality: 'Hong Kong',
    },
  });
}

function renderVentures() {
  const content = `${secHead('02', 'Ventures')}${ventureGrid(site.ventures)}`;
  return renderPage({
    title: `Ventures · ${site.name}`, description: 'Products and ventures Howard Chan has built and shipped.',
    canonicalPath: '/ventures/', content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${site.name} — Ventures` },
  });
}

function renderResearch() {
  const content = `${secHead('03', 'Published research')}<div class="research-list">${site.research.map(researchEntry).join('')}</div>`;
  return renderPage({
    title: `Research · ${site.name}`, description: 'Published research by Howard Chan on communication, cognition, and institutional systems.',
    canonicalPath: '/research/', content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${site.name} — Research` },
  });
}

function renderAbout() {
  const a = site.about;
  const content = `${secHead('04', 'About')}
    <div class="about-grid">
      <div class="about-prose">${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <figure class="portrait"><img src="/assets/media/pfp.png" alt="Howard Chan" width="230" height="287" decoding="async"><figcaption>Sumida-ku, Tokyo</figcaption></figure>
    </div>
    <div class="timeline">
      <span class="eyebrow">Experience &amp; education</span>
      <div style="margin-top:14px">${a.timeline.map((t) => `<div class="tline"><h4>${esc(t.title)}</h4><span class="tmeta">${esc(t.meta)}</span><p class="tsum">${esc(t.sum)}</p></div>`).join('')}</div>
    </div>
    ${a.honors ? `<div class="timeline"><span class="eyebrow">Selected honors</span><div style="margin-top:14px">${a.honors.map((x) => `<div class="tline"><h4 style="font-weight:500">${esc(x)}</h4></div>`).join('')}</div></div>` : ''}`;
  return renderPage({
    title: `About · ${site.name}`, description: 'About Howard Chan — Tokyo-based builder and researcher, incoming Cambridge HSPS.',
    canonicalPath: '/about/', content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: site.fullName, description: site.tagline } },
  });
}

function renderContact() {
  const c = site.contact;
  const content = `${secHead('05', 'Contact')}
    <p class="contact-intro">${esc(c.intro)}</p>
    <div class="cgroups">${c.groups.map((g) => `<div class="cgroup"><h4>${esc(g.group)}</h4><ul>${g.items.map((it) => `<li><a href="${attr(it.href)}"${it.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(it.label)}</a></li>`).join('')}</ul></div>`).join('')}</div>
    <div class="copybar"><a class="copybtn" href="${attr(c.emailHref)}">Email me</a><span class="eyebrow" style="text-transform:none;letter-spacing:0">${esc(c.email)}</span></div>`;
  return renderPage({
    title: `Contact · ${site.name}`, description: 'Get in touch with Howard Chan — Codeberg, Wantedly, LinkedIn, email.',
    canonicalPath: '/contact/', content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'ContactPage', mainEntity: { '@type': 'Person', name: site.fullName, email: site.contact.email } },
  });
}

function renderVentureDetail(v) {
  const others = site.ventures.filter((x) => x !== v).slice(0, 3);
  const content = `
    <p class="backlink"><a href="/ventures/">← Ventures</a></p>
    <header class="page-intro" style="padding-top:8px">
      <div class="detail-meta">${statusChip(v.status)}${v.href ? `<a class="vcard-link" href="${attr(v.href)}" target="_blank" rel="noopener">${esc(v.domain)} ↗</a>` : `<span class="vcard-link" style="color:var(--ink-3)">${esc(v.domain)}</span>`}</div>
      <h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${esc(v.name)}${v.jp ? ` <span class="jp" style="font-size:0.55em;color:var(--ink-3)">${esc(v.jp)}</span>` : ''}</h1>
      <p class="intro-subtitle">${esc(v.summary)}</p>
    </header>
    <section class="page-section"><span class="eyebrow">What it does</span><ul class="vdetails" style="margin-top:14px;max-width:62ch">${(v.details || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul></section>
    <section class="page-section"><span class="eyebrow">More ventures</span><div class="grid" style="margin-top:18px">${others.map(ventureCard).join('')}</div></section>
  `;
  return renderPage({
    title: `${v.name} · ${site.name}`, description: v.summary, canonicalPath: `/ventures/${vslug(v)}/`, content, ogType: 'article',
    jsonLd: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: v.name, url: v.href || site.url, author: { '@type': 'Person', name: site.fullName }, description: v.summary },
  });
}

function renderResearchDetail(r) {
  const content = `
    <p class="backlink"><a href="/research/">← Research</a></p>
    <header class="page-intro" style="padding-top:8px">
      <p class="hero-eyebrow">${esc(r.meta)}</p>
      <h1 style="font-size:clamp(1.7rem,3.6vw,2.6rem);max-width:26ch">${esc(r.title)}</h1>
      <p class="intro-subtitle">${esc(r.summary)}</p>
      ${r.href ? `<div class="hero-links"><a href="${attr(r.href)}" target="_blank" rel="noopener">Read the paper ↗</a></div>` : ''}
    </header>
    <section class="page-section" style="max-width:68ch"><span class="eyebrow">Summary</span><div class="about-prose" style="margin-top:14px">${(r.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}</div></section>
  `;
  return renderPage({
    title: `${r.title} · ${site.name}`, description: r.summary, canonicalPath: `/research/${r.slug}/`, content, ogType: 'article',
    jsonLd: { '@context': 'https://schema.org', '@type': 'ScholarlyArticle', headline: r.title, datePublished: '2025', author: { '@type': 'Person', name: site.fullName }, description: r.summary, mainEntityOfPage: `${site.url}/research/${r.slug}/` },
  });
}

function renderNotFound() {
  const content = `<header class="page-intro"><p class="hero-eyebrow">404</p><h1>Page not found.</h1><p class="intro-subtitle">Try the <a class="vcard-link" href="/">index</a>, <a class="vcard-link" href="/ventures/">ventures</a>, or <a class="vcard-link" href="/contact/">contact</a>.</p></header>`;
  return renderPage({ title: `Not found · ${site.name}`, description: 'Page not found.', canonicalPath: '/404/', content, jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Not found' } });
}

function renderRedirect(target) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${attr(target)}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${attr(urlFor(target))}"><title>Redirecting…</title></head><body><script>location.replace(${JSON.stringify(target)});</script><p>Redirecting to <a href="${attr(target)}">${esc(target)}</a>.</p></body></html>`;
}

function renderLlms() {
  return `# ${site.name}
${site.tagline}

${site.fullName} — founder, builder, and researcher; incoming University of Cambridge HSPS (Peterhouse).

## Ventures
${site.ventures.map((v) => `- ${v.name}${v.domain && v.domain.includes('.') ? ` (${v.domain})` : ''}: ${v.summary}`).join('\n')}

## Research
${site.research.map((r) => `- ${r.title} (${r.meta})`).join('\n')}

## Pages
- ${site.url}/  — index
- ${site.url}/ventures/  — ventures
- ${site.url}/research/  — published research
- ${site.url}/about/  — about + experience
- ${site.url}/contact/  — contact

## Links
${site.contactLinks.map((l) => `- ${l.label}: ${l.href}`).join('\n')}
`;
}

function renderRobots() { return `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`; }

function renderSitemap() {
  const routes = ['/', '/ventures/', '/research/', '/about/', '/contact/',
    ...site.ventures.map((v) => `/ventures/${vslug(v)}/`), ...site.research.map((r) => `/research/${r.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${site.url}${r === '/' ? '/' : r}</loc><lastmod>${today}</lastmod><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
}

async function cleanupGeneratedRoutes() {
  const dirs = ['ventures', 'research', 'about', 'contact', 'projects', 'awards-certifications', 'portfolio', 'blog', 'guides', 'awards'];
  await Promise.all(dirs.map((d) => rm(path.join(root, d), { recursive: true, force: true })));
}

async function writeOutput(rel, content) {
  const target = path.join(root, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, String(content).replace(/[ \t]+$/gm, ''), 'utf8');
}

await main();

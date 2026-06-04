const siteUrl = 'https://howardchan.me';
const elevateosUrl = 'https://elevateos.org';
const tatemoriUrl = 'https://tatemori.com';
const priormovesUrl = 'https://priormoves.com';
const nobillUrl = 'https://nobill.app';
const crystalcenturyUrl = 'https://crystalcentury.com';
const pulseUrl = 'https://pulse-kiwanis-2026-309064718968.us-west1.run.app/';
const linkedinUrl = 'https://www.linkedin.com/in/howardchan2008/';
const codebergUrl = 'https://codeberg.org/imjusthoward';
const gitlabUrl = 'https://gitlab.com/howard53';
const wantedlyUrl = 'https://www.wantedly.com/id/chakhang_chan';
const facebookUrl = 'https://www.facebook.com/imjusthoward';
const instagramUrl = 'https://www.instagram.com/imjusthoward/';
const whatsappUrl = 'https://wa.me/85293442294';
const emailUrl = 'mailto:chakhanghowardchan2008@gmail.com';

export const site = {
  name: 'Howard Chan',
  author: 'Howard Chan',
  fullName: 'Chak Hang (Howard) Chan',
  url: siteUrl,
  brandSub: 'Builder · Researcher',
  tagline: 'Builder and researcher — Tokyo, incoming Cambridge HSPS.',
  description: 'Howard Chan — founder, builder, and researcher (incoming Cambridge HSPS, Peterhouse). Ventures, published research, and contact.',
  location: 'Sumida-ku, Tokyo, Japan',
  logo: { src: '/assets/media/hc-logo-ink.png', alt: 'HC' },

  hero: {
    eyebrow: 'Tokyo · Incoming Cambridge HSPS',
    headline: 'I build systems where coordination breaks first.',
    lead: 'Founder, builder, and researcher. I map the workflow, find the friction, and ship something people can actually use, hand off, and trust. I’d rather show you a live URL than a slide.',
    links: [
      { label: 'ElevateOS ↗', href: elevateosUrl },
      { label: 'Prior Moves ↗', href: priormovesUrl },
      { label: 'Codeberg ↗', href: codebergUrl },
      { label: 'Email →', href: emailUrl },
    ],
  },

  pillars: [
    { title: 'HSPS & institutions', body: 'I study how institutions behave under pressure and how incentives shape decisions.' },
    { title: 'Technical systems & products', body: 'I turn ambiguous workflows into tools people can actually use and hand off.' },
    { title: 'Service & coordination', body: 'I build continuity into service organizations so execution survives the next handoff.' },
  ],

  ventures: [
    { name: 'ElevateOS', status: 'live', domain: 'elevateos.org', href: elevateosUrl,
      summary: 'AI execution layer for tutoring and admissions agencies: a tutor logs a quick session note, and it becomes a parent-ready report and a clear set of next steps.',
      details: ['Hong Kong–incorporated, with a working product and partner demo.', 'First pilots launching June 2026, including a K. International School Tokyo cohort.', 'Powers agencies rather than replacing them.'] },
    { name: 'Tatemori', jp: '盾守', status: 'live', domain: 'tatemori.com', href: tatemoriUrl,
      summary: 'Compliance tooling for Japan’s customer-harassment (kasuhara) law, an employer obligation from October 2026: one-tap incident capture and an audit-ready evidence record.',
      details: ['Turns a hard regulatory deadline into a concrete operating workflow.', 'MHLW six-category classification and a one-click quarterly report.', 'Live demo; signing first design partners.'] },
    { name: 'Prior Moves', status: 'live', domain: 'priormoves.com', href: priormovesUrl,
      summary: 'A live tool that turns top investors’ 13F filings into one weekly signal of what they’re buying next, with a public track record.',
      details: ['A 23-quarter backtest beat the S&P 500 by ~5.4 points/quarter.', 'Picks now tracked on a live paper-trading account — research and education only.', 'The surface of a broader quantitative-research system.'] },
    { name: 'nobill', status: 'pilot', domain: 'nobill.app', href: nobillUrl,
      summary: 'A local-first subscription tracker that scans your own receipts for recurring charges and links straight to each merchant’s cancel page — your data never leaves your device.',
      details: ['Open source; runs on the user’s own machine.', 'Flags intro-promo hikes and overlapping tools.', 'Privacy-first alternative to cloud subscription managers.'] },
    { name: 'Kiwanis Pulse', status: 'live', domain: 'Manila 2026', href: pulseUrl,
      summary: 'A mobile convention companion surfacing schedules, venues, sessions, and announcements attendees can use instantly on their phones.',
      details: ['Built for real convention conditions — senior and non-English-first attendees.', 'A live information layer, not a replacement for official communication.', 'Mobile-first hierarchy designed for speed and clarity.'] },
    { name: 'Premier Trophy', status: 'live', domain: 'crystalcentury.com', href: crystalcenturyUrl,
      summary: 'Operations and reliability for a Hong Kong custom-awards manufacturer (founded 2008) — trophies, awards, crystal, and corporate gifts. The operational side of building.',
      details: ['Vertically integrated: own factory in mainland China, finishing in Hong Kong.', 'Thousands of business customers; a 5.0 Google rating across 220+ reviews.', 'Keeping real systems healthy under real traffic.'] },
  ],

  research: [
    { title: 'Hofstede’s Dimensions and Generational Effects on Ambiguous Emoji Semiotics: Cross-Cultural Analysis of Japanese and Chinese Digital Communication', meta: 'Preprint · 2025', slug: 'emoji-semiotics', href: 'https://www.preprints.org/',
      summary: 'How ambiguous emojis shift meaning across Japanese and Chinese digital communication.',
      body: ['Examines interpretation as a cultural and generational problem, not just a symbol problem.', 'Uses Hofstede’s dimensions to frame the JP/CN comparison.', 'Shows how small digital signals reveal larger patterns in communication and social expectation.'] },
    { title: 'Unraveling Cognitive Aging: A Comprehensive Narrative Review Integrating Six Decades of the Seattle Longitudinal Study with Contemporary Advances', meta: 'Review · 2025', slug: 'cognitive-aging',
      summary: 'Education, occupational complexity, and digital engagement in cognition.',
      body: ['Synthesizes six decades of the Seattle Longitudinal Study with newer work on education and occupational complexity.', 'A bridge between long-run cognitive-aging research and contemporary questions about learning and work.', 'Synthesis-heavy; a reference point for broader cognitive-systems thinking.'] },
  ],

  about: {
    paragraphs: [
      'I am Chak Hang (Howard) Chan, a Tokyo-based builder and incoming HSPS student at Peterhouse, University of Cambridge. I’m interested in how institutions behave under pressure, how incentives shape decisions, and how technical systems can reduce friction in the real world.',
      'Across the work, the common thread is coordination. I like problems where a better system makes the work easier to repeat, easier to hand off, and easier to trust. That’s why my projects sit across service leadership, research, and product infrastructure rather than in one narrow lane.',
      'Long term, I want to build at the point where institutions, incentives, and technical systems meet — through company-building and venture, or early-career finance paths that sharpen commercial judgment and execution.',
    ],
    timeline: [
      { title: 'Peterhouse, University of Cambridge', meta: 'HSPS · 2026–2029', sum: 'Incoming undergraduate, Human, Social, and Political Sciences. Predicted IB 45/45.' },
      { title: 'Founder Institute', meta: 'Apr 2026–Present', sum: 'Selected for the Summer 2026 (Vietnam) cohort of the pre-seed accelerator; developing ElevateOS through structured build-and-validation milestones.' },
      { title: 'Director of Operations, Premier Trophy', meta: '2024–Present', sum: 'Operations and reliability for a vertically-integrated Hong Kong custom-awards manufacturer (since 2008).' },
      { title: 'Founder & President, Kiwanis Voice Club of Nippon', meta: '2026–Present', sum: 'First Voice Club representing Japan; youth service, continuity, and stakeholder coordination.' },
      { title: 'Founder & President, KIST Key Club', meta: '2024–2026', sum: 'Scaled to 40+ members and five executives; ¥200,000+ raised; Kiwanis Dolls and Stand Tall assistive-device initiatives.' },
      { title: 'Researcher, Lumiere Education', meta: '2025', sum: 'Top-5% project (full scholarship, UCSD credit) on ambiguous-emoji interpretation across Japanese and Chinese users.' },
    ],
    honors: ['Predicted IB 45/45 · SAT 1550 · GPA 3.96', 'University offers: Cambridge (committed) · HKU · HKUST (full scholarship) · UC Berkeley · UCLA · UCSD · Edinburgh · King’s · UCL', 'Lumiere Research Scholar — full scholarship, UCSD credit', 'Harvard College Debate Union — Japan Regional Winner 2026'],
  },

  contact: {
    intro: 'Codeberg and Wantedly are the clearest proof of the work. Email is best for longer messages.',
    email: 'chakhanghowardchan2008@gmail.com',
    emailHref: emailUrl,
    groups: [
      { group: 'Core / Professional', items: [
        { label: 'Codeberg', href: codebergUrl }, { label: 'GitLab', href: gitlabUrl },
        { label: 'Wantedly', href: wantedlyUrl }, { label: 'LinkedIn', href: linkedinUrl }, { label: 'Email', href: emailUrl } ] },
      { group: 'Live / Projects', items: [
        { label: 'ElevateOS', href: elevateosUrl }, { label: 'Prior Moves', href: priormovesUrl },
        { label: 'Tatemori', href: tatemoriUrl }, { label: 'nobill', href: nobillUrl }, { label: 'Premier Trophy', href: crystalcenturyUrl } ] },
      { group: 'Social / Personal', items: [
        { label: 'WhatsApp', href: whatsappUrl }, { label: 'Facebook', href: facebookUrl }, { label: 'Instagram', href: instagramUrl } ] },
    ],
  },

  contactLinks: [
    { label: 'Codeberg', href: codebergUrl }, { label: 'GitLab', href: gitlabUrl },
    { label: 'Wantedly', href: wantedlyUrl }, { label: 'LinkedIn', href: linkedinUrl }, { label: 'Email', href: emailUrl },
  ],
  footerLinks: [
    { label: 'Codeberg', href: codebergUrl }, { label: 'GitLab', href: gitlabUrl },
    { label: 'Wantedly', href: wantedlyUrl }, { label: 'LinkedIn', href: linkedinUrl }, { label: 'Email', href: emailUrl },
  ],
};

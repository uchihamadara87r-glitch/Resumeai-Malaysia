import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
//  LOCAL ANALYSIS ENGINE  —  100% offline, no API, no keys, pure JS
// ══════════════════════════════════════════════════════════════════════════════

// ── KEYWORD LIBRARIES ──────────────────────────────────────────────────────
const TECH_SKILLS = [
  "python","javascript","typescript","java","c++","c#","php","ruby","swift","kotlin","golang","rust","scala","r",
  "react","angular","vue","node.js","nodejs","django","flask","laravel","spring","express","nextjs","next.js",
  "html","css","sql","mysql","postgresql","mongodb","redis","firebase","graphql","rest api","restful",
  "aws","azure","gcp","docker","kubernetes","git","linux","tensorflow","pytorch","machine learning","deep learning",
  "data analysis","data science","tableau","power bi","excel","microsoft office","word","powerpoint","autocad",
  "photoshop","illustrator","figma","solidworks","matlab","sap","erp","crm","salesforce",
  "accounting","bookkeeping","audit","taxation","finance","financial analysis","budgeting","forecasting",
  "project management","agile","scrum","kanban","jira","trello","ms project",
  "networking","cisco","cybersecurity","penetration testing","cloud computing",
  "digital marketing","seo","sem","google analytics","social media","content marketing",
  "bahasa malaysia","bahasa melayu","english","mandarin","chinese","tamil",
  "communication","leadership","teamwork","problem solving","time management","critical thinking",
  "microsoft word","microsoft excel","microsoft powerpoint","google workspace","google docs","google sheets",
];

const BM_SKILLS = [
  "pengaturcaraan","pembangunan web","analisa data","pemasaran digital","pengurusan projek",
  "komunikasi","kepimpinan","kerja berpasukan","penyelesaian masalah","pengurusan masa","pemikiran kritis",
  "perakaunan","audit","kewangan","belanjawan","ramalan","pengurusan akaun",
  "microsoft office","microsoft word","microsoft excel","microsoft powerpoint",
  "bahasa melayu","bahasa inggeris","bahasa mandarin","bahasa cina","bahasa tamil",
  "photoshop","ilustrasi","reka bentuk grafik","reka bentuk laman web",
  "pengurusan sumber manusia","pengambilan pekerja","latihan dan pembangunan",
  "jualan","pemasaran","perkhidmatan pelanggan","penyelarasan",
  "penyelidikan","analisis","laporan","dokumentasi","pengurus akaun",
];

const POWER_VERBS_EN = [
  "achieved","accelerated","accomplished","administered","analysed","analyzed","built","collaborated",
  "coordinated","created","delivered","designed","developed","directed","drove","executed","facilitated",
  "generated","implemented","improved","increased","launched","led","managed","optimised","optimized",
  "oversaw","planned","produced","reduced","resolved","spearheaded","streamlined","supervised",
  "trained","transformed","exceeded","established","expanded","implemented","initiated",
];

const POWER_VERBS_BM = [
  "mencapai","membangun","mengurus","memimpin","melaksana","meningkat","menyelaras",
  "merancang","menganalisa","mencipta","menghasilkan","mengurangkan","menyelesaikan",
  "melatih","menyelia","mengawas","memperkenalkan","memperbaiki","mengetuai",
  "mengoptimum","memastikan","membantu","menyediakan","mengurus","menjalankan",
];

const WEAK_PHRASES = [
  /\bresponsible for\b/gi, /\bduties include\b/gi, /\bworked on\b/gi, /\bhelped with\b/gi,
  /\bassisted in\b/gi, /\binvolved in\b/gi, /\bparticipated in\b/gi, /\bexposure to\b/gi,
  /\bfamiliar with\b/gi, /\bknowledge of\b/gi, /\bexperience with\b/gi,
  /\btanggungjawab untuk\b/gi, /\btugas-tugas\b/gi, /\bbertugas untuk\b/gi,
  /\bmembantu dengan\b/gi, /\bterlibat dalam\b/gi, /\bberkenalan dengan\b/gi,
];

const CONTACT_PATTERNS = {
  email:   /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  phone:   /(\+?6?0?1[0-9][-\s]?\d{7,8}|\+?60\s?\d{1,2}[-\s]?\d{7,8}|\b0\d{1,2}[-\s]?\d{7,8}\b)/,
  linkedin:/linkedin\.com\/in\//i,
  github:  /github\.com\//i,
  website: /https?:\/\/(?!linkedin|github)[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/i,
};

const SECTION_PATTERNS = {
  summary:    /\b(summary|profile|objective|about me|ringkasan|profil|objektif|tentang saya|career objective|professional summary)\b/i,
  experience: /\b(experience|work|employment|career|history|pengalaman|kerja|pekerjaan|kerjaya|sejarah kerja)\b/i,
  education:  /\b(education|academic|qualification|study|pendidikan|akademik|kelayakan|pengajian|sijil|diploma|degree|ijazah)\b/i,
  skills:     /\b(skills|competency|expertise|ability|kemahiran|kecekapan|kepakaran|kebolehan)\b/i,
  certifications: /\b(certification|certificate|accreditation|award|sijil|pengesahan|anugerah|pencapaian)\b/i,
  projects:   /\b(project|portfolio|assignment|projek|portfolio|tugasan)\b/i,
  languages:  /\b(language|bahasa)\b/i,
  references: /\b(reference|rujukan)\b/i,
  volunteer:  /\b(volunteer|community|sukarelawan|komuniti)\b/i,
};

const QUANTIFIER_PATTERN = /\b\d+\s*(%|percent|rm|myr|\$|k\b|thousand|million|juta|ribu|unit|team|member|orang|project|projek|year|tahun|month|bulan|week|minggu|day|hari|hour|jam|client|pelanggan|customer|record|rekod|file|fail|report|laporan|sale|jualan|staff|staf|award|anugerah)\b/i;

const DATE_PATTERN = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember|\d{4})\b/gi;

const JOB_TITLE_PATTERN = /\b(engineer|manager|executive|analyst|developer|designer|coordinator|assistant|officer|director|specialist|consultant|advisor|administrator|supervisor|clerk|technician|jurutera|pengurus|eksekutif|pembantu|pegawai|pengarah|perunding|pentadbir|penyelia|kerani|juruteknik|penolong)\b/i;

const DEGREE_PATTERN = /\b(phd|doctorate|master|degree|bachelor|diploma|certificate|spm|stpm|upsr|darjah|ijazah|sarjana|doktor|diploma|sijil|master|mba|bsc|beng|ba |bba)\b/i;

const CGPA_PATTERN = /\b(cgpa|gpa|purata)\s*:?\s*([0-9]\.[0-9]{1,2})/i;

const CURRENT_YEAR = 2025;

// ── CORE ANALYSER ──────────────────────────────────────────────────────────
function analyseResume(raw, lang) {
  const text = raw;
  const lower = text.toLowerCase();
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const words = lower.split(/\s+/);
  const isEN = lang === "en";

  // ── 1. CONTACT INFO ─────────────────────────────────────────────────────
  const contact = {
    hasEmail:    CONTACT_PATTERNS.email.test(text),
    hasPhone:    CONTACT_PATTERNS.phone.test(text),
    hasLinkedIn: CONTACT_PATTERNS.linkedin.test(text),
    hasGithub:   CONTACT_PATTERNS.github.test(text),
    hasWebsite:  CONTACT_PATTERNS.website.test(text),
    hasName:     lines.length > 0 && lines[0].length > 2 && lines[0].length < 60 && !/^(email|tel|phone|address|@)/.test(lines[0].toLowerCase()),
  };

  // ── 2. SECTIONS DETECTED ────────────────────────────────────────────────
  const sections = {};
  for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
    sections[key] = pattern.test(text);
  }

  // ── 3. SKILLS DETECTION ─────────────────────────────────────────────────
  const allSkillsLib = [...new Set([...TECH_SKILLS, ...BM_SKILLS])];
  const foundSkills = allSkillsLib.filter(skill => {
    const esc = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${esc}\\b`, "i").test(text);
  });

  // ── 4. POWER VERBS ──────────────────────────────────────────────────────
  const allVerbs = [...POWER_VERBS_EN, ...POWER_VERBS_BM];
  const foundVerbs = allVerbs.filter(v => new RegExp(`\\b${v}\\b`, "i").test(text));
  const weakPhraseCount = WEAK_PHRASES.filter(p => p.test(text)).length;

  // ── 5. QUANTIFIERS (numbers + context) ──────────────────────────────────
  const quantMatches = (text.match(/\b\d+[%]|\bRM\s*\d+|\b\d+\s*(people|orang|team|client|pelanggan|project|projek|unit|year|tahun|month|bulan|percent|%)/gi) || []);
  const hasQuantifiers = quantMatches.length > 0;
  const quantCount = quantMatches.length;

  // ── 6. DATE / TIMELINE ──────────────────────────────────────────────────
  const dateMatches = text.match(DATE_PATTERN) || [];
  const yearMatches = (text.match(/\b(19|20)\d{2}\b/g) || []).map(Number);
  const hasTimeline = yearMatches.length >= 2;
  const latestYear = yearMatches.length ? Math.max(...yearMatches) : 0;
  const isRecent = latestYear >= CURRENT_YEAR - 3;

  // ── 7. EDUCATION ────────────────────────────────────────────────────────
  const hasDegree = DEGREE_PATTERN.test(text);
  const cgpaMatch = text.match(CGPA_PATTERN);
  const cgpa = cgpaMatch ? parseFloat(cgpaMatch[2]) : null;

  // ── 8. EXPERIENCE LEVEL ─────────────────────────────────────────────────
  const expYearMatches = text.match(/\b(19|20)\d{2}\b/g) || [];
  const expYears = [...new Set(expYearMatches.map(Number))].sort();
  let totalExpYears = 0;
  if (expYears.length >= 2) totalExpYears = Math.min(expYears[expYears.length-1] - expYears[0], 30);
  const experienceLevel = totalExpYears === 0
    ? (isEN ? "Fresh Graduate / Entry Level" : "Fresh Graduate / Kemasukan")
    : totalExpYears <= 2
      ? (isEN ? "Junior (1–2 years)" : "Junior (1–2 tahun)")
      : totalExpYears <= 5
        ? (isEN ? "Mid-Level (3–5 years)" : "Pertengahan (3–5 tahun)")
        : totalExpYears <= 10
          ? (isEN ? "Senior (6–10 years)" : "Senior (6–10 tahun)")
          : (isEN ? "Expert / Director Level" : "Pakar / Pengarah");

  // ── 9. LENGTH & FORMAT ──────────────────────────────────────────────────
  const charCount = text.length;
  const wordCount = words.length;
  const lineCount = lines.length;
  const tooShort = charCount < 300;
  const tooLong = charCount > 5000;
  const goodLength = !tooShort && !tooLong;

  // Bullet point usage
  const bulletLines = lines.filter(l => /^[•\-\*►▪▸→✓✔○]/.test(l)).length;
  const hasBullets = bulletLines >= 3;

  // ALL CAPS overuse (screaming)
  const capsLines = lines.filter(l => l.length > 8 && l === l.toUpperCase()).length;
  const capsOveruse = capsLines > lineCount * 0.3;

  // ── 10. ATS CHECKLIST ───────────────────────────────────────────────────
  const atsChecklist = isEN ? [
    { label:"Name is clearly visible",          pass: contact.hasName,        note:"First line should be your full name" },
    { label:"Email address present",            pass: contact.hasEmail,       note:"No email address found" },
    { label:"Phone number present",             pass: contact.hasPhone,       note:"No Malaysian phone number found" },
    { label:"Professional summary / objective", pass: sections.summary,       note:"Add a 2–3 sentence professional summary" },
    { label:"Work experience section",          pass: sections.experience,    note:"No work experience section detected" },
    { label:"Education section",                pass: sections.education,     note:"No education section detected" },
    { label:"Skills section",                   pass: sections.skills,        note:"No dedicated skills section" },
    { label:"Date ranges / timeline present",   pass: hasTimeline,            note:"Add start–end dates for all roles" },
    { label:"Action verbs used",                pass: foundVerbs.length >= 3, note:"Use strong action verbs (achieved, led, built…)" },
    { label:"Quantified achievements",          pass: hasQuantifiers,         note:"Add numbers: % improvements, RM figures, team sizes" },
    { label:"Degree or qualification stated",   pass: hasDegree,              note:"No academic qualification detected" },
    { label:"Appropriate length (300–5000 chars)", pass: goodLength,          note: tooShort ? "Resume too short — add more detail" : "Resume too long — condense to 1–2 pages" },
    { label:"Bullet points used",               pass: hasBullets,             note:"Use bullet points for responsibilities" },
    { label:"No excessive CAPS formatting",     pass: !capsOveruse,           note:"Avoid writing full lines in ALL CAPS" },
    { label:"LinkedIn profile linked",          pass: contact.hasLinkedIn,    note:"Add your LinkedIn URL — strongly recommended" },
  ] : [
    { label:"Nama jelas kelihatan",                   pass: contact.hasName,        note:"Baris pertama sepatutnya nama penuh anda" },
    { label:"Alamat e-mel ada",                       pass: contact.hasEmail,       note:"Tiada alamat e-mel dijumpai" },
    { label:"Nombor telefon ada",                     pass: contact.hasPhone,       note:"Tiada nombor telefon Malaysia dijumpai" },
    { label:"Ringkasan / objektif profesional ada",   pass: sections.summary,       note:"Tambah 2–3 ayat ringkasan profesional" },
    { label:"Seksyen pengalaman kerja ada",           pass: sections.experience,    note:"Tiada seksyen pengalaman kerja dikesan" },
    { label:"Seksyen pendidikan ada",                 pass: sections.education,     note:"Tiada seksyen pendidikan dikesan" },
    { label:"Seksyen kemahiran ada",                  pass: sections.skills,        note:"Tiada seksyen kemahiran yang khusus" },
    { label:"Tarikh / tempoh masa ada",               pass: hasTimeline,            note:"Tambah tarikh mula–tamat untuk setiap jawatan" },
    { label:"Kata kerja tindakan digunakan",          pass: foundVerbs.length >= 3, note:"Guna kata kerja kuat (mencapai, mengetuai, membangun…)" },
    { label:"Pencapaian dengan angka ada",            pass: hasQuantifiers,         note:"Tambah angka: % peningkatan, nilai RM, saiz pasukan" },
    { label:"Kelayakan akademik dinyatakan",          pass: hasDegree,              note:"Tiada kelayakan akademik dikesan" },
    { label:"Panjang resume sesuai (300–5000 aksara)",pass: goodLength,             note: tooShort ? "Resume terlalu pendek — tambah butiran" : "Resume terlalu panjang — padatkan kepada 1–2 halaman" },
    { label:"Bullet points digunakan",                pass: hasBullets,             note:"Guna bullet points untuk tanggungjawab" },
    { label:"Tiada HURUF BESAR berlebihan",           pass: !capsOveruse,           note:"Elak tulis baris penuh dalam HURUF BESAR" },
    { label:"Profil LinkedIn dilinkkan",              pass: contact.hasLinkedIn,    note:"Tambah URL LinkedIn anda — sangat disyorkan" },
  ];

  const passingCount = atsChecklist.filter(i => i.pass).length;

  // ── 11. ATS SCORE CALCULATION ──────────────────────────────────────────
  let score = 0;

  // Contact completeness (max 15)
  if (contact.hasName)    score += 5;
  if (contact.hasEmail)   score += 5;
  if (contact.hasPhone)   score += 5;

  // Key sections (max 25)
  if (sections.summary)    score += 5;
  if (sections.experience) score += 8;
  if (sections.education)  score += 7;
  if (sections.skills)     score += 5;

  // Skills density (max 15)
  const skillScore = Math.min(foundSkills.length * 1.5, 15);
  score += skillScore;

  // Power verbs (max 10)
  score += Math.min(foundVerbs.length * 1.5, 10);

  // Quantification (max 10)
  score += Math.min(quantCount * 2, 10);

  // Timeline (max 5)
  if (hasTimeline) score += 5;

  // Education (max 5)
  if (hasDegree) score += 3;
  if (cgpa && cgpa >= 3.0) score += 2;

  // Format quality (max 10)
  if (hasBullets)     score += 4;
  if (goodLength)     score += 3;
  if (!capsOveruse)   score += 3;

  // Weak phrase penalty
  score -= weakPhraseCount * 3;

  // LinkedIn bonus
  if (contact.hasLinkedIn) score += 3;

  // Normalize
  score = Math.max(5, Math.min(100, Math.round(score)));

  // ── 12. VERDICT ─────────────────────────────────────────────────────────
  let ats_verdict;
  if (isEN) {
    if (score >= 80) ats_verdict = "Strong resume. Likely to pass ATS screening and reach a human reviewer.";
    else if (score >= 65) ats_verdict = "Acceptable resume but several areas need strengthening before submission.";
    else if (score >= 45) ats_verdict = "Resume has significant gaps. Will likely be filtered out by ATS systems.";
    else ats_verdict = "Resume does not meet minimum professional standards. Rebuild with guidance below.";
  } else {
    if (score >= 80) ats_verdict = "Resume kukuh. Kemungkinan besar lulus tapisan ATS dan sampai kepada perekrut manusia.";
    else if (score >= 65) ats_verdict = "Resume boleh diterima tetapi beberapa bahagian perlu diperkukuh sebelum menghantar.";
    else if (score >= 45) ats_verdict = "Resume mempunyai jurang ketara. Kemungkinan besar ditapis keluar oleh sistem ATS.";
    else ats_verdict = "Resume tidak memenuhi piawaian profesional minimum. Bina semula dengan panduan di bawah.";
  }

  // ── 13. FIXES (priority issues) ─────────────────────────────────────────
  const fixes = [];

  if (!contact.hasEmail) fixes.push(isEN
    ? { section:"Contact Info", severity:"Critical", problem:"No email address found", fix:"Add a professional email address — e.g. yourname@gmail.com or yourname@outlook.com", example:"ahmad.ali@gmail.com | 012-3456789 | Kuala Lumpur" }
    : { section:"Maklumat Hubungi", severity:"Kritikal", problem:"Tiada alamat e-mel dijumpai", fix:"Tambah alamat e-mel profesional — contoh: namaanda@gmail.com atau namaanda@outlook.com", example:"ahmad.ali@gmail.com | 012-3456789 | Kuala Lumpur" });

  if (!contact.hasPhone) fixes.push(isEN
    ? { section:"Contact Info", severity:"Critical", problem:"No phone number found", fix:"Add your Malaysian mobile number in the header", example:"012-3456789 or +60123456789" }
    : { section:"Maklumat Hubungi", severity:"Kritikal", problem:"Tiada nombor telefon dijumpai", fix:"Tambah nombor telefon bimbit Malaysia anda di bahagian atas", example:"012-3456789 atau +60123456789" });

  if (!sections.summary) fixes.push(isEN
    ? { section:"Professional Summary", severity:"High", problem:"No professional summary or objective", fix:"Add 2–3 sentences at the top summarising who you are, your key expertise, and what you are seeking", example:"Results-driven IT Executive with 4 years of experience in system administration and cloud infrastructure. Proven track record of reducing downtime by 30%. Seeking a senior role in a growth-oriented organisation." }
    : { section:"Ringkasan Profesional", severity:"Tinggi", problem:"Tiada ringkasan atau objektif profesional", fix:"Tambah 2–3 ayat di bahagian atas meringkaskan siapa anda, kepakaran utama, dan apa yang anda cari", example:"Eksekutif IT yang berdedikasi dengan 4 tahun pengalaman dalam pentadbiran sistem dan infrastruktur awan. Berjaya mengurangkan masa henti sebanyak 30%. Mencari peluang kanan dalam organisasi yang berkembang." });

  if (!sections.skills) fixes.push(isEN
    ? { section:"Skills", severity:"High", problem:"No dedicated skills section", fix:"Add a clear 'Skills' or 'Technical Skills' section listing your competencies as keywords — ATS scans for these", example:"Technical: Python, SQL, Excel, Power BI | Soft Skills: Leadership, Communication, Problem Solving" }
    : { section:"Kemahiran", severity:"Tinggi", problem:"Tiada seksyen kemahiran yang khusus", fix:"Tambah seksyen 'Kemahiran' atau 'Kemahiran Teknikal' yang jelas menyenaraikan kecekapan anda sebagai kata kunci — ATS mencarikan ini", example:"Teknikal: Python, SQL, Excel, Power BI | Kemahiran Insaniah: Kepimpinan, Komunikasi, Penyelesaian Masalah" });

  if (!hasQuantifiers) fixes.push(isEN
    ? { section:"Work Experience", severity:"High", problem:"No quantified achievements found", fix:"Add numbers to every bullet point — percentages, RM values, team sizes, time saved, records managed", example:"Managed a team of 8 staff → Led a team of 8 staff, improving output by 25% | Handled client files → Managed 300+ client files with 99% accuracy" }
    : { section:"Pengalaman Kerja", severity:"Tinggi", problem:"Tiada pencapaian yang dikuantifikasi dijumpai", fix:"Tambah angka pada setiap bullet point — peratusan, nilai RM, saiz pasukan, masa yang dijimatkan, rekod yang diuruskan", example:"Mengurus pasukan → Mengetuai pasukan 8 orang dengan peningkatan output 25% | Menguruskan fail pelanggan → Menguruskan lebih 300 fail pelanggan dengan ketepatan 99%" });

  if (foundVerbs.length < 3) fixes.push(isEN
    ? { section:"Language & Impact", severity:"Medium", problem:`Only ${foundVerbs.length} strong action verb(s) found`, fix:"Start every bullet point with a strong action verb to demonstrate impact and ownership", example:"❌ 'Responsible for social media' → ✅ 'Grew Instagram following by 40% through targeted content strategy'" }
    : { section:"Bahasa & Impak", severity:"Sederhana", problem:`Hanya ${foundVerbs.length} kata kerja tindakan kuat dijumpai`, fix:"Mulakan setiap bullet point dengan kata kerja tindakan yang kuat untuk menunjukkan impak dan inisiatif", example:"❌ 'Bertanggungjawab untuk media sosial' → ✅ 'Meningkatkan pengikut Instagram sebanyak 40% melalui strategi kandungan yang disasarkan'" });

  if (weakPhraseCount > 0) fixes.push(isEN
    ? { section:"Language & Impact", severity:"Medium", problem:`${weakPhraseCount} weak phrase(s) detected (e.g. 'responsible for', 'assisted in', 'familiar with')`, fix:"Replace passive, vague phrases with direct action verbs showing what YOU did", example:"❌ 'Responsible for managing the budget' → ✅ 'Managed RM500K annual budget, reducing costs by 12%'" }
    : { section:"Bahasa & Impak", severity:"Sederhana", problem:`${weakPhraseCount} frasa lemah dikesan (contoh: 'bertanggungjawab untuk', 'membantu dalam', 'berkenalan dengan')`, fix:"Gantikan frasa pasif dan kabur dengan kata kerja tindakan langsung yang menunjukkan apa yang ANDA lakukan", example:"❌ 'Bertanggungjawab untuk mengurus bajet' → ✅ 'Mengurus bajet tahunan RM500K, mengurangkan kos sebanyak 12%'" });

  if (!hasTimeline) fixes.push(isEN
    ? { section:"Work Experience", severity:"Medium", problem:"No date ranges or timeline found", fix:"Add Month/Year – Month/Year for every role, and Month/Year – Present for your current role", example:"June 2022 – March 2024 | Administrative Executive | XYZ Sdn Bhd" }
    : { section:"Pengalaman Kerja", severity:"Sederhana", problem:"Tiada julat tarikh atau tempoh masa dijumpai", fix:"Tambah Bulan/Tahun – Bulan/Tahun untuk setiap jawatan, dan Bulan/Tahun – Kini untuk jawatan semasa", example:"Jun 2022 – Mac 2024 | Eksekutif Pentadbiran | XYZ Sdn Bhd" });

  if (!hasBullets) fixes.push(isEN
    ? { section:"Formatting", severity:"Medium", problem:"No bullet points detected", fix:"Use bullet points (•) for every job responsibility — makes scanning easier for both ATS and human reviewers", example:"• Coordinated monthly reporting across 3 departments\n• Reduced processing time by 20% through workflow automation" }
    : { section:"Pemformatan", severity:"Sederhana", problem:"Tiada bullet points dikesan", fix:"Guna bullet points (•) untuk setiap tanggungjawab kerja — memudahkan imbasan oleh ATS dan perekrut", example:"• Menyelaras laporan bulanan merentas 3 jabatan\n• Mengurangkan masa pemprosesan sebanyak 20% melalui automasi aliran kerja" });

  if (!contact.hasLinkedIn) fixes.push(isEN
    ? { section:"Contact Info", severity:"Low", problem:"LinkedIn profile not included", fix:"Create or update your LinkedIn profile and add the URL — most Malaysian recruiters check LinkedIn", example:"linkedin.com/in/yourname" }
    : { section:"Maklumat Hubungi", severity:"Rendah", problem:"Profil LinkedIn tidak disertakan", fix:"Cipta atau kemaskini profil LinkedIn anda dan tambah URL — kebanyakan perekrut Malaysia semak LinkedIn", example:"linkedin.com/in/namaanda" });

  // ── 14. TIPS ────────────────────────────────────────────────────────────
  const tips = isEN ? [
    "Tailor your resume for each job application — match keywords from the job description exactly.",
    "Name your resume file professionally: FirstnameLastname_Resume_2025.pdf — never 'resume_final_v2.pdf'.",
    "Save and send as PDF unless the employer specifically asks for Word format.",
    "Keep your resume to 1 page if you have under 5 years of experience; 2 pages maximum for senior roles.",
    "Remove the 'References available upon request' line — it wastes space and is assumed.",
    "Use a clean, single-column layout for best ATS compatibility. Avoid tables and text boxes.",
    "Include your city/state in contact info — full home address is no longer necessary.",
    "Update your resume before every application, even if only small tweaks.",
    "For Malaysian government or GLC applications, follow the standard Borang Maklumat Peribadi format.",
    "Proofread with Grammarly or a trusted colleague — a single typo can disqualify you.",
  ] : [
    "Sesuaikan resume anda untuk setiap permohonan kerja — padankan kata kunci dari iklan jawatan dengan tepat.",
    "Namakan fail resume anda secara profesional: NamaAnda_Resume_2025.pdf — jangan 'resume_final_v2.pdf'.",
    "Simpan dan hantar sebagai PDF kecuali majikan secara khusus meminta format Word.",
    "Kekalkan resume 1 halaman jika anda mempunyai kurang dari 5 tahun pengalaman; maksimum 2 halaman untuk jawatan kanan.",
    "Buang baris 'Rujukan tersedia atas permintaan' — ia membuang ruang dan sudah diasumsikan.",
    "Guna susun atur satu lajur yang kemas untuk keserasian ATS terbaik. Elak jadual dan kotak teks.",
    "Masukkan bandar/negeri dalam maklumat hubungi — alamat rumah penuh tidak lagi diperlukan.",
    "Kemaskini resume anda sebelum setiap permohonan, walaupun hanya perubahan kecil.",
    "Untuk permohonan kerajaan atau GLC Malaysia, ikut format Borang Maklumat Peribadi standard.",
    "Semak semula dengan Grammarly atau rakan dipercayai — satu typo sahaja boleh menyebabkan anda ditolak.",
  ];

  // ── 15. JOB MATCHES based on detected skills ────────────────────────────
  const jobDb = getJobMatches(foundSkills, lower, totalExpYears, isEN);

  // ── 16. SKILL GAPS ──────────────────────────────────────────────────────
  const skillGaps = getSkillGaps(foundSkills, lower, isEN);

  return {
    ats_score: score,
    ats_verdict,
    experience_level: experienceLevel,
    skills_found: foundSkills.slice(0, 20),
    ats_checklist: atsChecklist,
    fixes: fixes.slice(0, 8),
    tips,
    job_matches: jobDb,
    skill_gaps: skillGaps,
    meta: { wordCount, charCount, bulletLines, foundVerbs: foundVerbs.length, quantCount, weakPhraseCount, passingCount, total: atsChecklist.length },
  };
}

// ── JOB MATCHING ENGINE ────────────────────────────────────────────────────
function getJobMatches(foundSkills, lower, expYears, isEN) {
  const sl = foundSkills.map(s => s.toLowerCase());
  const has = (...keys) => keys.some(k => sl.includes(k) || lower.includes(k));

  const jobDefs = [
    {
      title: isEN ? "Software Engineer / Developer" : "Jurutera Perisian / Pembangun",
      keywords: ["python","javascript","java","react","nodejs","typescript","c++","sql","git","api","html","css","php","angular","vue","kotlin","swift"],
      companyType: isEN ? "Tech / MNC / Startup" : "Teknologi / MNC / Startup",
      salaryBase: 3500, salaryTop: 8000,
      location: "Kuala Lumpur / Selangor",
      minExp: 0,
    },
    {
      title: isEN ? "Data Analyst" : "Penganalisis Data",
      keywords: ["python","r","sql","tableau","power bi","excel","data analysis","machine learning","statistics","pandas","numpy"],
      companyType: isEN ? "Finance / Tech / GLC" : "Kewangan / Teknologi / GLC",
      salaryBase: 3000, salaryTop: 6500,
      location: "Kuala Lumpur",
      minExp: 0,
    },
    {
      title: isEN ? "IT Executive / System Administrator" : "Eksekutif IT / Pentadbir Sistem",
      keywords: ["networking","linux","windows server","cisco","cybersecurity","cloud","aws","azure","docker","it support","network"],
      companyType: isEN ? "Any Industry" : "Semua Industri",
      salaryBase: 2800, salaryTop: 5500,
      location: isEN ? "Klang Valley" : "Lembah Klang",
      minExp: 0,
    },
    {
      title: isEN ? "Finance / Accounting Executive" : "Eksekutif Kewangan / Perakaunan",
      keywords: ["accounting","bookkeeping","audit","taxation","finance","financial analysis","budgeting","forecasting","sap","erp","quickbooks","xero","perakaunan","audit","kewangan"],
      companyType: isEN ? "Any Industry" : "Semua Industri",
      salaryBase: 2500, salaryTop: 5000,
      location: isEN ? "Kuala Lumpur / Petaling Jaya" : "Kuala Lumpur / Petaling Jaya",
      minExp: 0,
    },
    {
      title: isEN ? "Digital Marketing Executive" : "Eksekutif Pemasaran Digital",
      keywords: ["digital marketing","seo","sem","social media","google analytics","content marketing","facebook ads","instagram","tiktok","copywriting","email marketing"],
      companyType: isEN ? "Agency / E-commerce / MNC" : "Agensi / E-dagang / MNC",
      salaryBase: 2200, salaryTop: 4500,
      location: isEN ? "Kuala Lumpur" : "Kuala Lumpur",
      minExp: 0,
    },
    {
      title: isEN ? "Administrative Executive / Coordinator" : "Eksekutif Pentadbiran / Penyelaras",
      keywords: ["microsoft office","microsoft word","microsoft excel","microsoft powerpoint","administration","coordination","documentation","filing","data entry","scheduling","pentadbiran","dokumentasi"],
      companyType: isEN ? "Any Industry" : "Semua Industri",
      salaryBase: 1800, salaryTop: 3500,
      location: isEN ? "Klang Valley / Nationwide" : "Lembah Klang / Seluruh Malaysia",
      minExp: 0,
    },
    {
      title: isEN ? "HR Executive / Recruiter" : "Eksekutif HR / Perekrut",
      keywords: ["human resources","recruitment","hr","payroll","employee relations","performance management","training","sumber manusia","pengambilan","hr","latihan"],
      companyType: isEN ? "Any Industry" : "Semua Industri",
      salaryBase: 2200, salaryTop: 4500,
      location: isEN ? "Klang Valley" : "Lembah Klang",
      minExp: 0,
    },
    {
      title: isEN ? "Graphic Designer / Visual Artist" : "Pereka Grafik / Artis Visual",
      keywords: ["photoshop","illustrator","figma","adobe","indesign","canva","ui","ux","design","branding","typography","reka bentuk"],
      companyType: isEN ? "Agency / In-house / Freelance" : "Agensi / Dalaman / Bebas",
      salaryBase: 2000, salaryTop: 4500,
      location: isEN ? "Kuala Lumpur / Selangor" : "Kuala Lumpur / Selangor",
      minExp: 0,
    },
    {
      title: isEN ? "Project Manager / Coordinator" : "Pengurus Projek / Penyelaras",
      keywords: ["project management","agile","scrum","jira","ms project","stakeholder","gantt","pengurusan projek","projek"],
      companyType: isEN ? "Tech / Engineering / Construction" : "Teknologi / Kejuruteraan / Pembinaan",
      salaryBase: 4000, salaryTop: 9000,
      location: isEN ? "Kuala Lumpur" : "Kuala Lumpur",
      minExp: 3,
    },
    {
      title: isEN ? "Sales Executive / Business Development" : "Eksekutif Jualan / Pembangunan Perniagaan",
      keywords: ["sales","business development","crm","negotiation","client management","b2b","b2c","target","jualan","pelanggan","pemasaran"],
      companyType: isEN ? "Any Industry" : "Semua Industri",
      salaryBase: 2000, salaryTop: 5000,
      location: isEN ? "Nationwide" : "Seluruh Malaysia",
      minExp: 0,
    },
    {
      title: isEN ? "Customer Service Executive" : "Eksekutif Perkhidmatan Pelanggan",
      keywords: ["customer service","communication","crm","call centre","helpdesk","support","perkhidmatan pelanggan","komunikasi","sokongan"],
      companyType: isEN ? "Retail / Banking / Telco / MNC" : "Runcit / Perbankan / Telco / MNC",
      salaryBase: 1800, salaryTop: 3200,
      location: isEN ? "Klang Valley / Nationwide" : "Lembah Klang / Seluruh Malaysia",
      minExp: 0,
    },
    {
      title: isEN ? "Civil / Mechanical Engineer" : "Jurutera Awam / Mekanikal",
      keywords: ["autocad","solidworks","civil","mechanical","structural","engineering","construction","revit","matlab","jurutera","kejuruteraan","pembinaan"],
      companyType: isEN ? "Engineering / Construction / O&G" : "Kejuruteraan / Pembinaan / Minyak & Gas",
      salaryBase: 3000, salaryTop: 7000,
      location: isEN ? "Nationwide" : "Seluruh Malaysia",
      minExp: 0,
    },
  ];

  const results = jobDefs.map(job => {
    if (expYears < job.minExp) return null;
    const matched = job.keywords.filter(k => sl.includes(k) || lower.includes(k));
    const raw = matched.length / job.keywords.length;
    const match_percent = Math.min(95, Math.round(20 + raw * 75));
    if (match_percent < 25) return null;
    const expBonus = Math.min(expYears * 1, 8);
    const adjSalaryBase = Math.round((job.salaryBase + expBonus * 100) / 100) * 100;
    const adjSalaryTop  = Math.round((job.salaryTop  + expBonus * 200) / 100) * 100;
    return {
      title: job.title,
      match_percent: Math.min(95, match_percent),
      company_type: job.companyType,
      salary_range: `RM ${adjSalaryBase.toLocaleString()} – RM ${adjSalaryTop.toLocaleString()}${isEN ? "/month" : "/bulan"}`,
      key_skills_matched: matched.slice(0, 5),
      location: job.location,
    };
  })
  .filter(Boolean)
  .sort((a,b) => b.match_percent - a.match_percent)
  .slice(0, 5);

  return results.length ? results : [{
    title: isEN ? "General Administrative Role" : "Jawatan Pentadbiran Am",
    match_percent: 40,
    company_type: isEN ? "Any Industry" : "Semua Industri",
    salary_range: `RM 1,800 – RM 2,800${isEN ? "/month" : "/bulan"}`,
    key_skills_matched: ["Microsoft Office", "Communication"],
    location: isEN ? "Nationwide" : "Seluruh Malaysia",
  }];
}

// ── SKILL GAP ENGINE ───────────────────────────────────────────────────────
function getSkillGaps(foundSkills, lower, isEN) {
  const sl = foundSkills.map(s => s.toLowerCase());
  const has = (k) => sl.includes(k) || lower.includes(k);

  const gapDefs = isEN ? [
    { skill:"Advanced Microsoft Excel (Pivot Tables, VLOOKUP, Macros)", importance:"Critical",
      reason:"Required by 80%+ of Malaysian employers across all industries for data handling and reporting.",
      how_to_learn:"Free: Microsoft Learn (learn.microsoft.com), YouTube 'Excel for Beginners'. Paid: Coursera Excel certificate (RM120).",
      checkFn: () => !has("excel") && !has("microsoft excel") },
    { skill:"English Business Communication", importance:"Critical",
      reason:"MNCs, GLCs, and most professional firms require strong written and spoken English for emails, reports, and client meetings.",
      how_to_learn:"BBC Learning English (free podcast), English@Work programme via HRDC (subsidised), Duolingo daily practice.",
      checkFn: () => !has("english") && !has("business english") },
    { skill:"Digital Literacy & Microsoft Office Suite", importance:"Critical",
      reason:"Foundational requirement for almost every white-collar role in Malaysia.",
      how_to_learn:"GCFGlobal.org (free), MDEC's Digital Skills courses, Microsoft Office Specialist certification.",
      checkFn: () => !has("microsoft office") && !has("microsoft word") && !has("microsoft powerpoint") },
    { skill:"Data Analysis (SQL or Python or Power BI)", importance:"Important",
      reason:"Malaysia is undergoing digital transformation. Analysts who can query data are in high demand across banking, retail, and government.",
      how_to_learn:"Mode Analytics SQL tutorial (free), freeCodeCamp Python (free), Power BI YouTube playlist.",
      checkFn: () => !has("sql") && !has("python") && !has("power bi") && !has("tableau") },
    { skill:"Project Management (PMP or Agile basics)", importance:"Important",
      reason:"Malaysian employers increasingly expect team members to manage workloads using structured frameworks.",
      how_to_learn:"Google Project Management Certificate on Coursera (free audit), PMI's free resources, Scrum.org free Scrum guide.",
      checkFn: () => !has("project management") && !has("agile") && !has("scrum") && !has("pmp") },
    { skill:"LinkedIn Profile & Personal Branding", importance:"Important",
      reason:"70%+ of Malaysian recruiters use LinkedIn to source candidates. No profile = invisible to recruiters.",
      how_to_learn:"LinkedIn's own free guide at linkedin.com/learning, or search 'How to optimise LinkedIn profile Malaysia'.",
      checkFn: () => !lower.includes("linkedin") },
    { skill:"Cloud Computing Basics (AWS / Azure / GCP)", importance:"Useful",
      reason:"Cloud skills command 15–30% salary premium in Malaysia's tech and banking sectors.",
      how_to_learn:"AWS Free Tier with tutorials (free), Microsoft Azure Fundamentals (AZ-900) on Microsoft Learn (free).",
      checkFn: () => !has("aws") && !has("azure") && !has("gcp") && !has("cloud") },
    { skill:"Digital Marketing Fundamentals", importance:"Useful",
      reason:"Every business needs digital presence. This skill opens doors across industries, not just marketing roles.",
      how_to_learn:"Google Digital Marketing Certificate (free), Meta Blueprint (free), HubSpot Academy (free).",
      checkFn: () => !has("digital marketing") && !has("seo") && !has("social media") },
  ] : [
    { skill:"Microsoft Excel Lanjutan (Pivot Tables, VLOOKUP, Macro)", importance:"Kritikal",
      reason:"Diperlukan oleh 80%+ majikan Malaysia merentas semua industri untuk pengendalian data dan pelaporan.",
      how_to_learn:"Percuma: Microsoft Learn (learn.microsoft.com), YouTube 'Excel untuk Pemula'. Berbayar: Sijil Excel Coursera (RM120).",
      checkFn: () => !has("excel") && !has("microsoft excel") },
    { skill:"Komunikasi Bahasa Inggeris Perniagaan", importance:"Kritikal",
      reason:"MNC, GLC, dan kebanyakan firma profesional memerlukan kemahiran Bahasa Inggeris yang kuat untuk e-mel, laporan, dan mesyuarat pelanggan.",
      how_to_learn:"BBC Learning English (podcast percuma), program English@Work melalui HRDC (disubsidi), latihan harian Duolingo.",
      checkFn: () => !has("english") && !has("bahasa inggeris") },
    { skill:"Literasi Digital & Microsoft Office Suite", importance:"Kritikal",
      reason:"Keperluan asas untuk hampir setiap jawatan kolar putih di Malaysia.",
      how_to_learn:"GCFGlobal.org (percuma), kursus Kemahiran Digital MDEC, sijil Microsoft Office Specialist.",
      checkFn: () => !has("microsoft office") && !has("microsoft word") && !has("microsoft powerpoint") },
    { skill:"Analisis Data (SQL atau Python atau Power BI)", importance:"Penting",
      reason:"Malaysia sedang mengalami transformasi digital. Penganalisis yang boleh menanya data sangat diperlukan dalam perbankan, runcit, dan kerajaan.",
      how_to_learn:"Tutorial SQL Mode Analytics (percuma), Python freeCodeCamp (percuma), senarai main YouTube Power BI.",
      checkFn: () => !has("sql") && !has("python") && !has("power bi") && !has("tableau") },
    { skill:"Pengurusan Projek (PMP atau asas Agile)", importance:"Penting",
      reason:"Majikan Malaysia semakin mengharapkan ahli pasukan mengurus beban kerja menggunakan rangka kerja yang berstruktur.",
      how_to_learn:"Sijil Pengurusan Projek Google di Coursera (audit percuma), sumber percuma PMI, panduan Scrum percuma di Scrum.org.",
      checkFn: () => !has("project management") && !has("pengurusan projek") && !has("agile") && !has("scrum") },
    { skill:"Profil LinkedIn & Personal Branding", importance:"Penting",
      reason:"70%+ perekrut Malaysia menggunakan LinkedIn untuk mencari calon. Tiada profil = tidak kelihatan kepada perekrut.",
      how_to_learn:"Panduan percuma LinkedIn di linkedin.com/learning, atau cari 'Cara optima profil LinkedIn Malaysia'.",
      checkFn: () => !lower.includes("linkedin") },
    { skill:"Asas Pengkomputeran Awan (AWS / Azure / GCP)", importance:"Berguna",
      reason:"Kemahiran awan memberikan premium gaji 15–30% dalam sektor teknologi dan perbankan Malaysia.",
      how_to_learn:"AWS Free Tier dengan tutorial (percuma), Microsoft Azure Fundamentals (AZ-900) di Microsoft Learn (percuma).",
      checkFn: () => !has("aws") && !has("azure") && !has("gcp") && !has("cloud") },
    { skill:"Asas Pemasaran Digital", importance:"Berguna",
      reason:"Setiap perniagaan memerlukan kehadiran digital. Kemahiran ini membuka peluang merentas industri, bukan hanya jawatan pemasaran.",
      how_to_learn:"Sijil Pemasaran Digital Google (percuma), Meta Blueprint (percuma), HubSpot Academy (percuma).",
      checkFn: () => !has("digital marketing") && !has("pemasaran digital") && !has("seo") && !has("social media") },
  ];

  return gapDefs.filter(g => g.checkFn()).map(({checkFn, ...rest}) => rest).slice(0, 6);
}

// ══════════════════════════════════════════════════════════════════════════════
//  COLOUR & DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  navy:"#0B1B35", blue:"#1A4DB0", red:"#B91C1C", green:"#065F46",
  amber:"#92400E", white:"#FFFFFF", bg:"#F1F5FB", card:"#FFFFFF",
  border:"#DDE3EE", textPri:"#0D1B2A", textSec:"#44546A", textMut:"#8A96AB",
  greenLight:"#D1FAE5", amberLight:"#FEF3C7", redLight:"#FEE2E2",
  blueLight:"#DBEAFE",
};

const scoreColor = s => s>=80?"#065F46":s>=65?"#92400E":s>=45?"#B45309":"#B91C1C";
const scoreLabel = (s, isEN) => {
  if (isEN) return s>=80?"Excellent ✨":s>=65?"Acceptable 👍":s>=45?"Needs Work ⚠️":"Not Ready 🚨";
  return s>=80?"Cemerlang ✨":s>=65?"Boleh Diterima 👍":s>=45?"Perlu Kerja ⚠️":"Tidak Sedia 🚨";
};
const scoreBg = s => s>=80?C.greenLight:s>=65?C.amberLight:s>=45?"#FEF3C7":C.redLight;

// ══════════════════════════════════════════════════════════════════════════════
//  UI ATOMS
// ══════════════════════════════════════════════════════════════════════════════
function Card({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:14, padding:"16px", marginBottom:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 6px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, color=C.red, disabled, full=true, small, style:sx={} }) {
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ background:disabled?"#9CA3AF":color, color:"#fff", border:"none", borderRadius:10, padding:small?"9px 16px":"13px 20px", fontSize:small?13:14, fontWeight:700, cursor:disabled?"default":"pointer", width:full?"100%":"auto", letterSpacing:.2, transition:"transform .1s", ...sx }}
      onMouseDown={e=>{ if(!disabled) e.currentTarget.style.transform="scale(.97)"; }}
      onMouseUp={e=>{ e.currentTarget.style.transform="scale(1)"; }}>
      {children}
    </button>
  );
}

function Badge({ label, color=C.blue, bg=C.blueLight }) {
  return <span style={{ background:bg, color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, whiteSpace:"nowrap", display:"inline-block" }}>{label}</span>;
}

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, marginTop:4 }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <div>
        <div style={{ fontWeight:800, fontSize:15, color:C.textPri }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.textMut }}>{sub}</div>}
      </div>
    </div>
  );
}

function LangToggle({ lang, onChange }) {
  return (
    <div style={{ display:"flex", background:"rgba(255,255,255,.12)", borderRadius:8, padding:2, gap:2 }}>
      {[["my","🇲🇾 BM"],["en","🇬🇧 EN"]].map(([l,label])=>(
        <button key={l} onClick={()=>onChange(l)} style={{
          padding:"5px 10px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
          background:lang===l?"#fff":"transparent", color:lang===l?C.navy:"rgba(255,255,255,.8)", transition:"all .2s"
        }}>{label}</button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCORE RING
// ══════════════════════════════════════════════════════════════════════════════
function ScoreRing({ score, size=130 }) {
  const r=size*.39, circ=2*Math.PI*r, cx=size/2, col=scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:"block", margin:"0 auto" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E2E8F0" strokeWidth="9"/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth="9"
        strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition:"stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={cx} y={cx-5} textAnchor="middle" fontFamily="system-ui" fontSize={size*.23} fontWeight="900" fill={col}>{score}</text>
      <text x={cx} y={cx+14} textAnchor="middle" fontFamily="system-ui" fontSize={size*.09} fill={C.textMut}>/ 100</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  HR VERDICT BANNER
// ══════════════════════════════════════════════════════════════════════════════
function HRVerdict({ score, isEN }) {
  const tiers = isEN ? [
    { min:80, icon:"✅", label:"Strong Candidate", col:C.green, bg:C.greenLight, border:"#6EE7B7",
      text:"This resume meets professional standards and is likely to pass ATS. Customise per job application to maximise impact." },
    { min:65, icon:"👍", label:"Acceptable — With Action Required", col:"#065F46", bg:"#ECFDF5", border:"#A7F3D0",
      text:"Structurally sound but lacking depth. Fix all High-severity issues before submitting. Many candidates at your level are competing." },
    { min:45, icon:"⚠️", label:"Requires Significant Revision", col:C.amber, bg:C.amberLight, border:"#FCD34D",
      text:"This resume has critical gaps. Most ATS systems will filter it out before a recruiter sees it. Do not submit as-is. Address every fix below." },
    { min:0, icon:"🚨", label:"Not Submission-Ready", col:C.red, bg:C.redLight, border:"#FCA5A5",
      text:"This resume does not meet minimum professional standards. It will be rejected automatically. Rebuild it from scratch using the guidance below." },
  ] : [
    { min:80, icon:"✅", label:"Calon Kuat", col:C.green, bg:C.greenLight, border:"#6EE7B7",
      text:"Resume ini memenuhi piawaian profesional dan kemungkinan besar lulus ATS. Sesuaikan mengikut setiap permohonan untuk memaksimumkan impak." },
    { min:65, icon:"👍", label:"Boleh Diterima — Tindakan Diperlukan", col:"#065F46", bg:"#ECFDF5", border:"#A7F3D0",
      text:"Struktur kukuh tetapi kurang mendalam. Betulkan semua isu Tinggi sebelum menghantar. Ramai calon pada tahap anda sedang bersaing." },
    { min:45, icon:"⚠️", label:"Memerlukan Semakan Ketara", col:C.amber, bg:C.amberLight, border:"#FCD34D",
      text:"Resume ini mempunyai jurang kritikal. Kebanyakan sistem ATS akan menolaknya sebelum perekrut melihatnya. Jangan hantar dalam keadaan semasa. Atasi setiap pembetulan di bawah." },
    { min:0, icon:"🚨", label:"Tidak Sedia Dihantar", col:C.red, bg:C.redLight, border:"#FCA5A5",
      text:"Resume ini tidak memenuhi piawaian profesional minimum. Ia akan ditolak secara automatik. Bina semula dari awal menggunakan panduan di bawah." },
  ];
  const v = tiers.find(t => score >= t.min);
  return (
    <div style={{ background:v.bg, border:`1.5px solid ${v.border}`, borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <span style={{ fontSize:20 }}>{v.icon}</span>
        <div style={{ fontWeight:800, fontSize:14, color:v.col }}>{isEN?"HR Verdict: ":"Keputusan HR: "}{v.label}</div>
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6, fontStyle:"italic" }}>"{v.text}"</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RESULT COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function MetaBar({ meta, isEN }) {
  const items = isEN
    ? [["📝", "Words", meta.wordCount], ["💪", "Action Verbs", meta.foundVerbs], ["🔢", "Quantifiers", meta.quantCount], ["❌", "Weak Phrases", meta.weakPhraseCount], ["✅", "ATS Checks", `${meta.passingCount}/${meta.total}`]]
    : [["📝", "Kata", meta.wordCount], ["💪", "Kata Kerja", meta.foundVerbs], ["🔢", "Angka", meta.quantCount], ["❌", "Frasa Lemah", meta.weakPhraseCount], ["✅", "Semakan ATS", `${meta.passingCount}/${meta.total}`]];
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
      {items.map(([icon, label, val]) => (
        <div key={label} style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", textAlign:"center", minWidth:70, flex:1 }}>
          <div style={{ fontSize:16 }}>{icon}</div>
          <div style={{ fontSize:16, fontWeight:800, color:C.textPri }}>{val}</div>
          <div style={{ fontSize:10, color:C.textMut }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function FixItem({ item, isEN }) {
  const sevMap = {
    "Critical":  { bg:C.redLight,   text:C.red,   icon:"🔴", order:0 },
    "Kritikal":  { bg:C.redLight,   text:C.red,   icon:"🔴", order:0 },
    "High":      { bg:C.amberLight, text:C.amber, icon:"🟠", order:1 },
    "Tinggi":    { bg:C.amberLight, text:C.amber, icon:"🟠", order:1 },
    "Medium":    { bg:"#F0FDF4",    text:C.green, icon:"🟡", order:2 },
    "Sederhana": { bg:"#F0FDF4",    text:C.green, icon:"🟡", order:2 },
    "Low":       { bg:C.blueLight,  text:C.blue,  icon:"🔵", order:3 },
    "Rendah":    { bg:C.blueLight,  text:C.blue,  icon:"🔵", order:3 },
  };
  const s = sevMap[item.severity] || sevMap["Medium"];
  return (
    <div style={{ background:s.bg, borderRadius:12, padding:"13px 14px", marginBottom:9, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
        <span style={{ fontSize:15, marginTop:1 }}>{s.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:C.textPri }}>{item.section}</div>
          <Badge label={item.severity} color={s.text} bg={s.bg}/>
        </div>
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6, marginBottom:6 }}>
        <strong style={{ color:C.red }}>{isEN?"Issue: ":"Masalah: "}</strong>{item.problem}
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6 }}>
        <strong style={{ color:C.green }}>{isEN?"Fix: ":"Cara Betulkan: "}</strong>{item.fix}
      </div>
      {item.example && (
        <div style={{ marginTop:8, background:"rgba(255,255,255,.7)", borderRadius:8, padding:"8px 10px" }}>
          <div style={{ fontSize:10, color:C.textMut, fontWeight:700, marginBottom:3 }}>{isEN?"EXAMPLE:":"CONTOH:"}</div>
          <div style={{ fontSize:12, color:C.textPri, fontStyle:"italic", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{item.example}</div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, isEN }) {
  const col = job.match_percent>=80?C.green:job.match_percent>=60?C.amber:C.red;
  const bg  = job.match_percent>=80?C.greenLight:job.match_percent>=60?C.amberLight:C.redLight;
  return (
    <Card style={{ padding:"14px 15px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:C.textPri }}>{job.title}</div>
          <div style={{ fontSize:12, color:C.textMut, marginTop:2 }}>{job.company_type} · {job.location}</div>
          <div style={{ fontSize:13, color:C.blue, fontWeight:600, marginTop:5 }}>{job.salary_range}</div>
        </div>
        <div style={{ textAlign:"center", minWidth:56, background:bg, borderRadius:10, padding:"6px 8px", height:"fit-content" }}>
          <div style={{ fontSize:22, fontWeight:900, color:col, lineHeight:1 }}>{job.match_percent}</div>
          <div style={{ fontSize:11, color:col, fontWeight:700 }}>%</div>
          <div style={{ fontSize:9, color:C.textMut }}>{isEN?"match":"padan"}</div>
        </div>
      </div>
      <div style={{ background:"#EDF2F7", borderRadius:6, height:5, marginTop:10 }}>
        <div style={{ background:col, borderRadius:6, height:5, width:`${job.match_percent}%`, transition:"width 1.2s ease-out" }}/>
      </div>
      {job.key_skills_matched?.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
          {job.key_skills_matched.map(s=><Badge key={s} label={s} color={C.blue} bg={C.blueLight}/>)}
        </div>
      )}
    </Card>
  );
}

function SkillGapCard({ gap, isEN }) {
  const p = {
    "Critical":  { bg:C.redLight,   text:C.red   },
    "Kritikal":  { bg:C.redLight,   text:C.red   },
    "Important": { bg:C.amberLight, text:C.amber  },
    "Penting":   { bg:C.amberLight, text:C.amber  },
    "Useful":    { bg:C.greenLight, text:C.green  },
    "Berguna":   { bg:C.greenLight, text:C.green  },
  }[gap.importance]||{ bg:"#F7FAFC", text:C.textSec };
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"13px 14px", marginBottom:9, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
        <span style={{ fontWeight:700, fontSize:14, color:C.textPri }}>{gap.skill}</span>
        <Badge label={gap.importance} color={p.text} bg={p.bg}/>
      </div>
      <div style={{ fontSize:12, color:C.textSec, lineHeight:1.5, marginBottom:6 }}>{gap.reason}</div>
      {gap.how_to_learn && (
        <div style={{ fontSize:12, color:C.blue, lineHeight:1.6 }}>
          📚 <strong>{isEN?"How to learn: ":"Cara belajar: "}</strong>{gap.how_to_learn}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RESULT TABS
// ══════════════════════════════════════════════════════════════════════════════
function ResultTabs({ data, fileName, onNew, lang }) {
  const [tab, setTab] = useState("overview");
  const isEN = lang==="en";
  const tabs = [
    { id:"overview", label:isEN?"📊 Score":"📊 Skor" },
    { id:"fix",      label:isEN?"🔧 Fixes":"🔧 Baiki" },
    { id:"jobs",     label:isEN?"💼 Jobs":"💼 Kerja" },
    { id:"skills",   label:isEN?"📈 Gaps":"📈 Jurang" },
    { id:"tips",     label:"💡 Tips" },
  ];
  return (
    <div>
      <div style={{ position:"sticky", top:0, zIndex:10, background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"0 16px" }}>
        <div style={{ display:"flex", gap:2, overflowX:"auto", paddingTop:10 }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flexShrink:0, padding:"9px 11px", border:"none", borderRadius:"10px 10px 0 0",
              fontWeight:700, fontSize:12, cursor:"pointer", transition:"all .2s",
              background:tab===t.id?C.white:"transparent",
              color:tab===t.id?C.red:C.textMut,
              borderBottom:tab===t.id?`2.5px solid ${C.red}`:"2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 16px 60px", maxWidth:600, margin:"0 auto" }}>
        {fileName && <div style={{ fontSize:11, color:C.textMut, marginBottom:10 }}>📄 {fileName}</div>}

        {tab==="overview" && (
          <>
            <HRVerdict score={data.ats_score} isEN={isEN}/>
            <Card style={{ textAlign:"center", paddingTop:20 }}>
              <ScoreRing score={data.ats_score}/>
              <div style={{ fontWeight:800, fontSize:20, color:scoreColor(data.ats_score), marginTop:8 }}>{scoreLabel(data.ats_score,isEN)}</div>
              <div style={{ color:C.textSec, fontSize:13, marginTop:4, maxWidth:320, margin:"8px auto 10px" }}>{data.ats_verdict}</div>
              <Badge label={data.experience_level} color={C.blue} bg={C.blueLight}/>
              {data.skills_found?.length>0 && (
                <div style={{ textAlign:"left", marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:C.textMut, fontWeight:700, letterSpacing:.5, marginBottom:8 }}>
                    {isEN?"SKILLS DETECTED":"KEMAHIRAN DIKESAN"}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {data.skills_found.map(s=><Badge key={s} label={s} color={C.green} bg={C.greenLight}/>)}
                  </div>
                </div>
              )}
            </Card>
            <MetaBar meta={data.meta} isEN={isEN}/>
            {data.ats_checklist?.length>0 && (
              <Card>
                <SectionHead icon="✅" title={isEN?"ATS Checklist":"Senarai Semak ATS"} sub={isEN?"Automated filter checks — recruiters see only passing resumes":"Tapisan automatik — perekrut hanya nampak resume yang lulus"}/>
                {data.ats_checklist.map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:i<data.ats_checklist.length-1?`1px solid #F7FAFC`:"none" }}>
                    <span style={{ fontSize:15, marginTop:1, flexShrink:0 }}>{item.pass?"✅":"❌"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:C.textPri, fontWeight:600 }}>{item.label}</div>
                      {!item.pass && <div style={{ fontSize:11, color:C.red, marginTop:2 }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </Card>
            )}
            <Btn onClick={onNew} color={C.navy}>+ {isEN?"Analyse Another Resume":"Analisa Resume Lain"}</Btn>
          </>
        )}

        {tab==="fix" && (
          <>
            <SectionHead icon="🔧" title={isEN?"Priority Fixes":"Pembetulan Keutamaan"} sub={isEN?"Sorted by impact — fix red first":"Disusun mengikut keutamaan — betulkan merah dahulu"}/>
            {data.fixes?.length===0
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"No major issues detected 🎉":"Tiada isu utama dikesan 🎉"}</div></Card>
              : [...(data.fixes||[])].sort((a,b)=>{
                  const ord = {"Critical":0,"Kritikal":0,"High":1,"Tinggi":1,"Medium":2,"Sederhana":2,"Low":3,"Rendah":3};
                  return (ord[a.severity]??9)-(ord[b.severity]??9);
                }).map((f,i)=><FixItem key={i} item={f} isEN={isEN}/>)
            }
          </>
        )}

        {tab==="jobs" && (
          <>
            <SectionHead icon="💼" title={isEN?"Job Matches":"Padanan Kerja"} sub={isEN?"Based on detected skills in your resume":"Berdasarkan kemahiran yang dikesan dalam resume"}/>
            {data.job_matches?.length===0
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"No matches detected":"Tiada padanan dikesan"}</div></Card>
              : data.job_matches.map((j,i)=><JobCard key={i} job={j} isEN={isEN}/>)
            }
            <div style={{ fontSize:12, color:C.textMut, textAlign:"center", lineHeight:1.6, marginTop:8 }}>
              {isEN?"Salary ranges reflect 2025 Malaysian market data. Actual offers vary by company, location and negotiation."
                   :"Julat gaji mencerminkan data pasaran Malaysia 2025. Tawaran sebenar berbeza mengikut syarikat, lokasi dan rundingan."}
            </div>
          </>
        )}

        {tab==="skills" && (
          <>
            <SectionHead icon="📈" title={isEN?"Skill Gaps":"Jurang Kemahiran"} sub={isEN?"Missing skills that reduce your shortlist chances":"Kemahiran yang tiada mengurangkan peluang anda dipilih"}/>
            {data.skill_gaps?.length===0
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"Your skill coverage is strong 🎉":"Liputan kemahiran anda sudah mantap 🎉"}</div></Card>
              : data.skill_gaps.map((g,i)=><SkillGapCard key={i} gap={g} isEN={isEN}/>)
            }
          </>
        )}

        {tab==="tips" && (
          <>
            <SectionHead icon="💡" title={isEN?"HR Pro Tips":"Tips Pakar HR"} sub={isEN?"What strict recruiters look for in Malaysia":"Apa yang perekrut tegas cari di Malaysia"}/>
            <Card style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, border:"none" }}>
              {data.tips.map((t,i)=>(
                <div key={i} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:"#FCD34D", fontWeight:800, fontSize:14, minWidth:22, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ color:"#CBD5E0", fontSize:13, lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </Card>
            <Btn onClick={onNew} color={C.navy}>+ {isEN?"Analyse Another Resume":"Analisa Resume Lain"}</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF EXTRACTOR
// ══════════════════════════════════════════════════════════════════════════════
function usePdfJs() {
  const [ready, setReady] = useState(!!window.pdfjsLib);
  useEffect(()=>{
    if (window.pdfjsLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ()=>{
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setReady(true);
    };
    document.head.appendChild(s);
  },[]);
  return ready;
}

async function extractPdf(file, isEN) {
  for (let i=0;i<60;i++) { if (window.pdfjsLib) break; await new Promise(r=>setTimeout(r,100)); }
  if (!window.pdfjsLib) throw new Error(isEN?"PDF reader failed to load.":"PDF reader gagal dimuatkan.");
  const buf = await file.arrayBuffer();
  let pdf;
  try { pdf = await window.pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise; }
  catch(e) {
    if (e.message?.includes("password")) throw new Error(isEN?"PDF is password protected.":"PDF dilindungi kata laluan.");
    throw new Error(isEN?"PDF cannot be read.":"PDF tidak dapat dibaca.");
  }
  let out = "";
  for (let i=1;i<=Math.min(pdf.numPages,6);i++) {
    const pg = await pdf.getPage(i);
    const ct = await pg.getTextContent();
    let line = "";
    for (const item of ct.items) {
      const s=item.str||""; if(!s) continue;
      line += line.endsWith("-")?s.trimStart():(line?" ":"")+s;
    }
    out += line+"\n";
  }
  return out.replace(/\s{3,}/g,"  ").trim();
}

// ══════════════════════════════════════════════════════════════════════════════
//  ANALYSING ANIMATION
// ══════════════════════════════════════════════════════════════════════════════
function AnalysingScreen({ isEN }) {
  const [pct, setPct] = useState(0);
  const msgs = isEN
    ? ["Reading resume structure…","Detecting sections & contact info…","Scanning for skills & keywords…","Identifying action verbs…","Checking quantified achievements…","Scoring ATS compatibility…","Matching job positions…","Calculating skill gaps…","Finalising report…"]
    : ["Membaca struktur resume…","Mengesan seksyen & maklumat hubungi…","Mengimbas kemahiran & kata kunci…","Mengenal pasti kata kerja tindakan…","Memeriksa pencapaian berkuantiti…","Menilai keserasian ATS…","Memadankan jawatan kerja…","Mengira jurang kemahiran…","Memuktamadkan laporan…"];
  const [mIdx, setMIdx] = useState(0);

  useEffect(()=>{
    let p=0;
    const t = setInterval(()=>{
      p = Math.min(100, p + Math.random()*14+4);
      setPct(Math.round(p));
      setMIdx(Math.floor((p/100)*msgs.length));
      if (p>=100) clearInterval(t);
    }, 120);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:"relative", width:80, height:80, marginBottom:24 }}>
        <div style={{ position:"absolute", inset:0, border:`5px solid ${C.border}`, borderTop:`5px solid ${C.red}`, borderRadius:"50%", animation:"spin .9s linear infinite" }}/>
        <div style={{ position:"absolute", inset:12, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.blue}`, borderRadius:"50%", animation:"spin 1.5s linear infinite reverse" }}/>
        <div style={{ position:"absolute", inset:"50%", transform:"translate(-50%,-50%)", fontSize:20 }}>📋</div>
      </div>
      <div style={{ fontWeight:700, fontSize:16, color:C.textPri, marginBottom:6 }}>{msgs[Math.min(mIdx,msgs.length-1)]}</div>
      <div style={{ color:C.textMut, fontSize:13, marginBottom:20 }}>{isEN?"Local analysis engine running…":"Enjin analisa tempatan sedang berjalan…"}</div>
      <div style={{ width:"100%", maxWidth:280, background:C.border, borderRadius:20, height:8, overflow:"hidden" }}>
        <div style={{ height:"100%", background:`linear-gradient(90deg,${C.red},${C.blue})`, borderRadius:20, width:`${pct}%`, transition:"width .15s ease-out" }}/>
      </div>
      <div style={{ fontSize:13, color:C.textMut, marginTop:8 }}>{pct}%</div>
      <div style={{ marginTop:20, background:C.blueLight, border:`1px solid #BFDBFE`, borderRadius:10, padding:"10px 16px", fontSize:12, color:C.blue, maxWidth:300 }}>
        🔒 {isEN?"100% offline — your resume never leaves your device.":"100% luar talian — resume anda tidak meninggalkan peranti anda."}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN UPLOAD / ANALYSER SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function UploadScreen({ onDone, lang, onLangChange }) {
  const [mode, setMode] = useState("pdf");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | pdf-ready | analysing
  const pdfReady = usePdfJs();
  const fileRef = useRef(null);
  const isEN = lang==="en";

  async function handleFile(file) {
    setErr("");
    if (!file) return;
    const isPdf = file.type==="application/pdf"||file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setErr(isEN?"Please select a PDF file (.pdf).":"Sila pilih fail PDF (.pdf)."); return; }
    if (file.size>10*1024*1024) { setErr(isEN?"File too large. Max 10MB.":"Fail terlalu besar. Maks 10MB."); return; }
    if (file.size<200) { setErr(isEN?"PDF is empty.":"PDF kosong."); return; }
    setFileName(file.name);
    try {
      const extracted = await extractPdf(file, isEN);
      if (!extracted||extracted.length<80) { setErr(isEN?"Could not extract text — try Paste Text mode.":"Teks tidak dapat diekstrak — cuba mod Tampal Teks."); return; }
      setText(extracted);
      setPhase("pdf-ready");
    } catch(e) { setErr((isEN?"PDF error: ":"Ralat PDF: ")+e.message); }
  }

  function runAnalysis() {
    const resume = text.trim();
    if (!resume||resume.length<80) { setErr(isEN?"Text too short.":"Teks terlalu pendek."); return; }
    setErr("");
    setPhase("analysing");
    // Run in next tick so the UI renders the loader first
    setTimeout(()=>{
      try {
        const result = analyseResume(resume, lang);
        onDone(result, fileName||"Pasted Text", resume);
      } catch(e) { setErr((isEN?"Analysis error: ":"Ralat analisa: ")+e.message); setPhase("idle"); }
    }, 80);
  }

  if (phase==="analysing") return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <Header lang={lang} onLangChange={onLangChange}/>
      <AnalysingScreen isEN={isEN}/>
    </div>
  );

  const exampleBM = "AHMAD BIN ALI\nE-mel: ahmad.ali@gmail.com | Tel: 012-3456789 | Kuala Lumpur\n\nRINGKASAN PROFESIONAL\nEksekutif pentadbiran berpengalaman 3 tahun dalam pengurusan rekod dan dokumentasi. Mahir dalam Microsoft Office Suite dan komunikasi dwibahasa. Mencari peluang dalam firma yang berkembang.\n\nPENGALAMAN KERJA\nJun 2022 – Mac 2025 | Eksekutif Pentadbiran | Syarikat XYZ Sdn Bhd, Kuala Lumpur\n• Menguruskan lebih 500 fail pelanggan dengan ketepatan 99%\n• Menyelaras laporan bulanan merentas 4 jabatan\n• Mengurangkan masa pemprosesan dokumen sebanyak 20%\n\nPENDIDIKAN\n2019–2022 | Diploma Pentadbiran Perniagaan | UiTM Shah Alam | CGPA: 3.45\n\nKEMAHIRAN\nMicrosoft Office Suite, Microsoft Excel, Google Workspace\nKomunikasi Bahasa Melayu & Bahasa Inggeris\nPengurusan masa, kerja berpasukan, penyelesaian masalah\n\nSIJIL\n2023 | Sijil Microsoft Office Specialist (MOS)";
  const exampleEN = "JOHN LEE WEI MING\nEmail: john.lee@gmail.com | Phone: 016-7654321 | Petaling Jaya, Selangor\nLinkedIn: linkedin.com/in/johnleewm\n\nPROFESSIONAL SUMMARY\nResults-driven IT Executive with 4 years of experience in system administration and cloud infrastructure. Reduced system downtime by 30% through proactive monitoring. Seeking a senior IT role in a technology-focused organisation.\n\nWORK EXPERIENCE\nJan 2021 – Present | IT Executive | TechCorp Malaysia Sdn Bhd, PJ\n• Managed AWS cloud infrastructure for 200+ users, achieving 99.8% uptime\n• Led migration of on-premise servers to cloud, reducing costs by RM120,000/year\n• Trained team of 5 junior staff on cybersecurity protocols\n\nEDUCATION\n2017–2020 | Bachelor of Computer Science | Universiti Malaya | CGPA: 3.60\n\nSKILLS\nTechnical: AWS, Linux, Python, SQL, Docker, Cisco Networking, Cybersecurity\nSoft Skills: Leadership, Communication, Problem Solving, Project Management\n\nCERTIFICATIONS\n2022 | AWS Certified Solutions Architect\n2021 | Cisco CCNA";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <Header lang={lang} onLangChange={onLangChange}/>
      <div style={{ padding:"16px 16px 60px", maxWidth:600, margin:"0 auto" }}>

        {/* Mode Toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["pdf","📄 "+(isEN?"Upload PDF":"Upload PDF")],["paste","📝 "+(isEN?"Paste Text":"Tampal Teks")]].map(([m,label])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setPhase("idle");setFileName("");setText("");}} style={{
              flex:1, padding:"12px", borderRadius:12, border:`2px solid ${mode===m?C.red:C.border}`,
              fontWeight:700, fontSize:13, cursor:"pointer", background:mode===m?C.redLight:"#fff",
              color:mode===m?C.red:C.textSec, transition:"all .2s"
            }}>{label}</button>
          ))}
        </div>

        {err && <div style={{ background:C.redLight, border:`1px solid #FCA5A5`, borderRadius:12, padding:"12px 14px", marginBottom:12, color:C.red, fontSize:13 }}>⚠️ {err}</div>}

        {/* PDF Mode */}
        {mode==="pdf" && phase!=="pdf-ready" && (
          <>
            <div
              onDragOver={e=>{e.preventDefault();setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>pdfReady&&fileRef.current?.click()}
              style={{ background:drag?"#FEF2F2":"#fff", border:`2.5px dashed ${drag?C.red:C.border}`, borderRadius:16, padding:"50px 24px", textAlign:"center", cursor:pdfReady?"pointer":"default", transition:"all .2s", marginBottom:14, userSelect:"none" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>{pdfReady?"📤":"⏳"}</div>
              <div style={{ fontWeight:700, color:C.textPri, fontSize:16, marginBottom:6 }}>
                {pdfReady?(isEN?"Drag & Drop your Resume PDF":"Seret & Lepas Resume PDF anda"):(isEN?"Loading PDF engine…":"Memuatkan enjin PDF…")}
              </div>
              {pdfReady && <div style={{ color:C.textSec, fontSize:13 }}>{isEN?"or":"atau"} <span style={{ color:C.red, fontWeight:700 }}>{isEN?"click to browse":"klik untuk pilih"}</span></div>}
              <div style={{ color:C.textMut, fontSize:11, marginTop:10 }}>PDF · {isEN?"Max":"Maks"} 10MB</div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
            </div>
            <Card style={{ background:C.blueLight, border:`1px solid #BFDBFE` }}>
              <div style={{ fontWeight:700, color:C.blue, fontSize:13, marginBottom:8 }}>💡 {isEN?"For best results":"Untuk hasil terbaik"}</div>
              {(isEN
                ? ["PDF exported from Word / Google Docs works best","1–2 page resumes recommended","Remove password protection before uploading","Scanned / image PDFs cannot be read — use Paste Text"]
                : ["PDF yang dieksport dari Word / Google Docs berfungsi terbaik","Resume 1–2 halaman disyorkan","Buang perlindungan kata laluan sebelum muat naik","PDF imbasan / imej tidak boleh dibaca — guna Tampal Teks"]
              ).map((t,i)=><div key={i} style={{ fontSize:12, color:C.blue, marginBottom:4 }}>✓ {t}</div>)}
            </Card>
          </>
        )}

        {mode==="pdf" && phase==="pdf-ready" && (
          <>
            <Card style={{ background:C.greenLight, border:`1px solid #6EE7B7` }}>
              <div style={{ fontWeight:700, color:C.green, fontSize:14, marginBottom:4 }}>✅ {isEN?"PDF Successfully Read":"PDF Berjaya Dibaca"}</div>
              <div style={{ fontSize:12, color:C.textSec, marginBottom:2 }}>{fileName}</div>
              <div style={{ fontSize:12, color:C.textMut }}>{text.length} {isEN?"characters extracted":"aksara diekstrak"}</div>
            </Card>
            <Btn onClick={runAnalysis} color={C.red} style={{ marginBottom:10 }}>🔍 {isEN?"Analyse Now":"Analisa Sekarang"}</Btn>
            <Btn onClick={()=>{setPhase("idle");setFileName("");setText("");}} color={C.navy}>↩ {isEN?"Choose Another File":"Pilih Fail Lain"}</Btn>
          </>
        )}

        {/* Paste Mode */}
        {mode==="paste" && (
          <>
            <Card>
              <div style={{ fontWeight:700, color:C.textPri, marginBottom:8, fontSize:15 }}>
                {isEN?"Paste Resume Text":"Tampal Teks Resume"}
              </div>
              <textarea
                value={text}
                onChange={e=>setText(e.target.value)}
                onFocus={e=>e.target.style.borderColor=C.red}
                onBlur={e=>e.target.style.borderColor=C.border}
                placeholder={isEN
                  ? "Paste your full resume here...\n\nName: John Doe\nEmail: john@email.com | Phone: 012-3456789\n\nPROFESSIONAL SUMMARY\n...\n\nWORK EXPERIENCE\n...\n\nEDUCATION\n...\n\nSKILLS\n..."
                  : "Tampal teks resume penuh anda di sini...\n\nNama: Ahmad bin Ali\nE-mel: ahmad@gmail.com | Tel: 012-3456789\n\nRINGKASAN PROFESIONAL\n...\n\nPENGALAMAN KERJA\n...\n\nPENDIDIKAN\n...\n\nKEMAHIRAN\n..."}
                style={{ width:"100%", minHeight:240, border:`2px solid ${C.border}`, borderRadius:10, padding:"12px", fontSize:13, fontFamily:"system-ui", resize:"vertical", outline:"none", color:C.textPri, boxSizing:"border-box", lineHeight:1.7 }}
              />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <span style={{ fontSize:11, color:text.length<150?C.red:C.textMut }}>
                  {text.length} {isEN?"chars":"aksara"} {text.length>0&&text.length<150?isEN?"(need more)":"(perlu lebih)":text.length>=150?"✓":""}
                </span>
                <Btn full={false} onClick={runAnalysis} disabled={text.length<80} small>🔍 {isEN?"Analyse":"Analisa"}</Btn>
              </div>
            </Card>

            <Card style={{ background:"#FFFBEB", border:`1px solid #FCD34D` }}>
              <div style={{ fontWeight:700, color:C.amber, fontSize:13, marginBottom:8 }}>📝 {isEN?"No resume? Try a sample:":"Tiada resume? Cuba contoh:"}</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["🇲🇾 BM",exampleBM],["🇬🇧 EN",exampleEN]].map(([label,sample])=>(
                  <button key={label} onClick={()=>setText(sample)} style={{ flex:1, background:"#FEF3C7", border:`1px solid #FCD34D`, borderRadius:8, padding:"8px", fontSize:12, color:"#92400E", cursor:"pointer", fontWeight:600 }}>
                    📋 {label}
                  </button>
                ))}
              </div>
            </Card>
          </>
        )}

        <div style={{ textAlign:"center", color:C.textMut, fontSize:11, marginTop:20, lineHeight:1.8 }}>
          🔒 {isEN?"100% offline. Zero API calls. Your resume never leaves your device.":"100% luar talian. Tiada panggilan API. Resume anda tidak meninggalkan peranti anda."}<br/>
          ResumeAI Malaysia v9.0 · {isEN?"Pure local engine · No API keys needed":"Enjin tempatan tulen · Tiada API key diperlukan"}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════════════════════════════
function Header({ lang, onLangChange, onBack, backLabel, subtitle }) {
  const isEN = lang==="en";
  return (
    <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.blue} 100%)`, marginBottom:0 }}>
      <div style={{ padding:"15px 16px 13px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📋</div>
        <div style={{ flex:1 }}>
          <div style={{ color:"#fff", fontWeight:900, fontSize:17, letterSpacing:-.3 }}>ResumeAI Malaysia</div>
          <div style={{ color:"#93C5FD", fontSize:10.5 }}>
            {subtitle||(isEN?"100% Offline · No API · No Keys":"100% Luar Talian · Tiada API · Tiada Key")}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ background:"rgba(255,255,255,.1)", color:"#93C5FD", fontSize:9, padding:"3px 8px", borderRadius:20, fontWeight:700 }}>v9.0</span>
          {onLangChange && <LangToggle lang={lang} onChange={onLangChange}/>}
          {onBack && (
            <button onClick={onBack} style={{ background:"rgba(255,255,255,.14)", color:"#fff", border:"none", borderRadius:9, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              ‹ {backLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function ResumeAI() {
  const [screen, setScreen]     = useState("upload");
  const [result, setResult]     = useState(null);
  const [fileName, setFileName] = useState("");
  const [lang, setLang]         = useState("my");

  function handleDone(res, file) {
    setResult(res); setFileName(file); setScreen("results");
  }

  const isEN = lang==="en";

  if (screen==="upload") return <UploadScreen onDone={handleDone} lang={lang} onLangChange={setLang}/>;

  if (screen==="results") return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <Header
        lang={lang}
        onLangChange={setLang}
        subtitle={isEN?"Analysis Results":"Keputusan Analisa"}
        onBack={()=>setScreen("upload")}
        backLabel={isEN?"New Analysis":"Analisa Baru"}
      />
      <ResultTabs
        data={result}
        fileName={fileName}
        lang={lang}
        onNew={()=>{ setResult(null); setFileName(""); setScreen("upload"); }}
      />
    </div>
  );

  return null;
}

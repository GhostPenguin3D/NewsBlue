import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://school.webactivity.net/";
const sourceUrl = `${baseUrl}districts.php`;
const directoryUrl = `${baseUrl}schools.php`;

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "NewsBlueSchoolDirectory/1.0 (source attribution included)" },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveRetry) => setTimeout(resolveRetry, 500 * attempt));
    }
  }
  throw lastError;
}

function decodeHtml(value) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function districtSummary(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);
  return rows.map((row) => {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textContent(cell[1]));
    return { code: cells[0], name: cells[1], schoolCount: Number(cells[2]?.replace(/,/g, "")) };
  }).filter((district) => district.code && district.name && Number.isFinite(district.schoolCount));
}

function readCount(card, label, unit) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = card.match(new RegExp(`<span[^>]*>\\s*${escapedLabel}\\s*<\\/span>\\s*<span[^>]*>\\s*([\\d,]+)\\s*${unit}`));
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function schoolRecords(html) {
  const cards = [...html.matchAll(/onclick="window\.location\.href='school-detail\.php\?id=(\d+)'"/g)];
  return cards.map((marker, index) => {
    const card = html.slice(marker.index, cards[index + 1]?.index ?? html.length);
    const name = textContent(card.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
    const district = textContent(card.match(/<p class="text-sm opacity-80">([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const students = readCount(card, "นักเรียนทั้งหมด", "คน");
    const male = readCount(card, "นักเรียนชาย", "คน");
    const female = readCount(card, "นักเรียนหญิง", "คน");
    const classrooms = readCount(card, "ห้องเรียน", "ห้อง");
    if (!name || !district || [students, male, female, classrooms].some((value) => value === null)) {
      throw new Error(`Could not parse school card ${marker[1]}: ${name || "missing name"}`);
    }
    return {
      id: marker[1],
      name,
      district,
      students,
      male,
      female,
      classrooms,
      sourceUrl: `${baseUrl}school-detail.php?id=${marker[1]}`
    };
  });
}

const districtHtml = await fetchPage(sourceUrl);
const districts = districtSummary(districtHtml);
const expectedSchools = districts.reduce((total, district) => total + district.schoolCount, 0);
const pageCount = Math.ceil(expectedSchools / 50);
const schools = [];

for (let start = 1; start <= pageCount; start += 4) {
  const pages = Array.from({ length: Math.min(4, pageCount - start + 1) }, (_, index) => start + index);
  const htmlPages = await Promise.all(pages.map((page) => fetchPage(`${directoryUrl}?page=${page}`)));
  htmlPages.forEach((html) => schools.push(...schoolRecords(html)));
  console.log(`Fetched pages ${pages[0]}-${pages.at(-1)} of ${pageCount}`);
}

const schoolIds = new Set(schools.map((school) => school.id));
if (schools.length !== expectedSchools || schoolIds.size !== schools.length) {
  throw new Error(`Directory integrity check failed: expected ${expectedSchools}, found ${schools.length} records and ${schoolIds.size} unique IDs`);
}

const title = textContent(districtHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
const dataset = {
  metadata: {
    title,
    source: sourceUrl,
    directory: directoryUrl,
    snapshotDate: "2026-06-10",
    term: "ภาคเรียนที่ 1/2569",
    districtCount: districts.length,
    schoolCount: schools.length,
    importedAt: new Date().toISOString()
  },
  districts,
  schools
};

const output = resolve(root, "public/data/schools.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(dataset)}\n`);
console.log(`Wrote ${schools.length} schools across ${districts.length} districts to ${output}`);
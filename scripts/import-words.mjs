#!/usr/bin/env node
/*
 * Bulk-import word-pair cards into flashcards.
 *
 *   node scripts/import-words.mjs import-words.json [--dry] [--subject "hispaania keel"]
 *
 * Input file (JSON):
 *   {
 *     "subject": "hispaania keel",          // optional here if --subject is passed
 *     "cards": [
 *       { "topic": "verbid", "tag": "basic", "es": "hablar", "et": "rääkima" },
 *       ...
 *     ]
 *   }
 *
 * - `es` -> side 1 text, `et` -> side 2 text.
 * - Missing topics and tags are created under the subject.
 * - The subject itself must already exist.
 * - Safe to re-run: cards already present (same s1|s2|topic) are skipped.
 * - --dry  : resolve everything and print what WOULD be created, change nothing.
 */

import { readFileSync } from "node:fs";

const API = process.env.API || "https://flashcards-server-v3oq.onrender.com";

// tag colours to cycle through for freshly created tags (from src/tagColors.ts)
const TAG_COLORS = [
  "#475569", "#b91c1c", "#c2410c", "#b45309", "#4d7c0f", "#047857",
  "#0e7490", "#1d4ed8", "#6d28d9", "#a21caf", "#be185d", "#78350f",
];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const subjectOverride = valueOf("--subject");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage: node scripts/import-words.mjs <file.json> [--dry] [--subject NAME]");
  process.exit(1);
}

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

async function api(path, opts) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${opts?.method || "GET"} ${path} -> ${res.status} ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const subjectLabel = subjectOverride || raw.subject;
  const cards = raw.cards || [];
  if (!subjectLabel) throw new Error("no subject (file.subject or --subject)");
  if (!Array.isArray(cards) || cards.length === 0) throw new Error("no cards[]");

  console.log(`API      : ${API}`);
  console.log(`subject  : ${subjectLabel}`);
  console.log(`cards in : ${cards.length}${dry ? "   (DRY RUN)" : ""}\n`);

  // 1. subject
  const subjects = await api("/subjects");
  const subject = subjects.find(
    (s) => s.label.toLowerCase() === subjectLabel.toLowerCase() && !s.parentId
  );
  if (!subject) {
    console.error(`subject "${subjectLabel}" not found. Create it in the app first.`);
    console.error("available:", subjects.filter((s) => !s.parentId).map((s) => s.label).join(", "));
    process.exit(1);
  }
  const subjectId = subject._id;

  // 2. existing topics + tags
  const topics = await api(`/topics?subjectId=${encodeURIComponent(subjectId)}`);
  const tags = await api(`/tags?subjectId=${encodeURIComponent(subjectId)}`);
  const topicByName = new Map(topics.map((t) => [t.label.toLowerCase(), t]));
  // tags keyed "topicId|tagname"
  const tagKey = (topicId, name) => `${topicId}|${name.toLowerCase()}`;
  const tagByKey = new Map(tags.map((t) => [tagKey(t.topicId, t.name), t]));
  let colorIdx = tags.length;

  // 3. figure out which topics / tags are missing
  const wantTopics = new Set(cards.map((c) => c.topic.trim()));
  const missingTopics = [...wantTopics].filter(
    (name) => !topicByName.has(name.toLowerCase())
  );

  console.log(`topics   : ${topics.length} existing, ${missingTopics.length} to create`);
  if (missingTopics.length) console.log("           + " + missingTopics.join(", "));

  if (!dry) {
    for (const name of missingTopics) {
      const t = await api("/subjects", {
        method: "POST",
        body: JSON.stringify({ label: name, parentId: subjectId }),
      });
      topicByName.set(name.toLowerCase(), t);
      await sleep(120);
    }
  } else {
    for (const name of missingTopics) topicByName.set(name.toLowerCase(), { _id: `DRY:${name}`, label: name });
  }

  // tags — need topic ids resolved first
  const wantTags = new Map(); // key -> {topicId, name}
  for (const c of cards) {
    if (!c.tag) continue;
    const topic = topicByName.get(c.topic.trim().toLowerCase());
    wantTags.set(tagKey(topic._id, c.tag), { topicId: topic._id, name: c.tag.trim() });
  }
  const missingTags = [...wantTags.entries()].filter(([k]) => !tagByKey.has(k));

  console.log(`tags     : ${tags.length} existing, ${missingTags.length} to create`);

  if (!dry) {
    for (const [k, { topicId, name }] of missingTags) {
      const color = TAG_COLORS[colorIdx++ % TAG_COLORS.length];
      const t = await api("/tags", {
        method: "POST",
        body: JSON.stringify({ name, color, subjectId, topicId }),
      });
      tagByKey.set(k, t);
      await sleep(120);
    }
  } else {
    for (const [k, { name }] of missingTags) tagByKey.set(k, { _id: `DRY:${k}`, name });
  }

  // 4. existing cards -> dedup set  "topicId|s1|s2"
  const existing = await api(`/cards?subjectId=${encodeURIComponent(subjectId)}`);
  const seen = new Set(
    existing.map(
      (c) => `${c.topicId}|${(c.s1?.text || "").trim().toLowerCase()}|${(c.s2?.text || "").trim().toLowerCase()}`
    )
  );
  console.log(`cards    : ${existing.length} already on the server\n`);

  // 5. build + post the new cards
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const topic = topicByName.get(c.topic.trim().toLowerCase());
    const tag = c.tag ? tagByKey.get(tagKey(topic._id, c.tag)) : null;
    const s1 = (c.es ?? "").trim();
    const s2 = (c.et ?? "").trim();
    if (!s1 || !s2) {
      failed++;
      console.warn(`  ! line ${i + 1}: empty side (${JSON.stringify(c)})`);
      continue;
    }
    const key = `${topic._id}|${s1.toLowerCase()}|${s2.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);

    if (dry) {
      created++;
      continue;
    }

    try {
      await api("/cards/add", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          topicId: topic._id,
          progress: {},
          tagIds: tag ? [tag._id] : [],
          s1: { text: s1, text2: "", photo: "" },
          s2: { text: s2, text2: "", photo: "" },
        }),
      });
      created++;
    } catch (e) {
      failed++;
      console.warn(`  ! line ${i + 1} failed: ${e.message}`);
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${cards.length}  (+${created} / skip ${skipped} / fail ${failed})`);
      await sleep(400); // breathe — free server
    } else {
      await sleep(90);
    }
  }

  console.log(`\ndone. created ${created}, skipped ${skipped} (already there), failed ${failed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

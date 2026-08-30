#!/usr/bin/env node
/*
 * Add example phrases as the SECOND line of both sides, for existing
 * cards that carry a given tag. Matches cards by side-1 text.
 *
 *   node scripts/backfill-phrases.mjs phrases.json [--dry]
 *
 * phrases.json:
 *   {
 *     "subject": "hispaania keel",
 *     "tag": "suunad",
 *     "phrases": {
 *       "arriba": ["mira hacia arriba", "vaata üles"],
 *       "a la derecha": ["gira a la derecha", "keera paremale"]
 *     }
 *   }
 *
 * key = the card's exact side-1 text.  value = [es phrase, et phrase]
 * Only cards whose side-1 line 2 is currently empty are touched, unless
 * --force is given.
 */

import { readFileSync } from "node:fs";

const API = process.env.API || "https://flashcards-server-v3oq.onrender.com";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage: node scripts/backfill-phrases.mjs <phrases.json> [--dry] [--force]");
  process.exit(1);
}

async function api(path, opts) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${opts?.method || "GET"} ${path} -> ${res.status} ${await res.text().catch(() => "")}`);
  return res.status === 204 ? null : res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { subject: subjectLabel, tag: tagName, phrases } = JSON.parse(
    readFileSync(file, "utf8")
  );
  if (!subjectLabel || !tagName || !phrases) {
    throw new Error("file needs { subject, tag, phrases }");
  }

  const subjects = await api("/subjects");
  const subject = subjects.find(
    (s) => s.label.toLowerCase() === subjectLabel.toLowerCase() && !s.parentId
  );
  if (!subject) throw new Error(`subject "${subjectLabel}" not found`);

  const tags = await api(`/tags?subjectId=${encodeURIComponent(subject._id)}`);
  const tag = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  if (!tag) throw new Error(`tag "${tagName}" not found under ${subjectLabel}`);

  const all = await api(`/cards?subjectId=${encodeURIComponent(subject._id)}`);
  const tagged = all.filter((c) => (c.tagIds || []).includes(tag._id));
  const byS1 = new Map(tagged.map((c) => [c.s1.text.trim().toLowerCase(), c]));

  console.log(`API      : ${API}`);
  console.log(`subject  : ${subjectLabel}`);
  console.log(`tag      : ${tagName}  (${tagged.length} cards)`);
  console.log(`phrases  : ${Object.keys(phrases).length}${dry ? "   (DRY RUN)" : ""}\n`);

  let updated = 0, missing = 0, skipped = 0, failed = 0;

  for (const [word, val] of Object.entries(phrases)) {
    const [es, et] = Array.isArray(val) ? val : [val, ""];
    const card = byS1.get(word.trim().toLowerCase());
    if (!card) {
      missing++;
      console.warn(`  ? no card for "${word}"`);
      continue;
    }
    if (!force && (card.s1.text2 || card.s2.text2)) {
      skipped++;
      continue;
    }
    if (dry) {
      updated++;
      console.log(`  ~ ${card.s1.text}  ->  s1b:"${es}"  s2b:"${et}"`);
      continue;
    }
    try {
      await api(`/cards/${card._id}`, {
        method: "PUT",
        body: JSON.stringify({
          s1: { ...card.s1, text2: (es || "").trim() },
          s2: { ...card.s2, text2: (et || "").trim() },
        }),
      });
      updated++;
      await sleep(120);
    } catch (e) {
      failed++;
      console.warn(`  ! "${word}" failed: ${e.message}`);
    }
  }

  console.log(`\ndone. updated ${updated}, no-match ${missing}, skipped ${skipped} (already had line 2), failed ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

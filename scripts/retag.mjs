#!/usr/bin/env node
/*
 * Move cards from one tag to another (by side-1 text match), under a topic.
 *
 *   node scripts/retag.mjs retag.json [--dry] [--keep-old]
 *
 * retag.json:
 *   {
 *     "subject": "hispaania keel",
 *     "topic":   "verbid",
 *     "fromTag": "basic",            // optional — only used for the report
 *     "toTag":   "ebareeglipärane",  // created if missing
 *     "words":   ["ser", "estar", "tener", ...]   // exact side-1 texts
 *   }
 *
 * For each matched card: adds toTag's id, and (unless --keep-old) removes
 * every OTHER tag id that belongs to the same topic. Safe to re-run.
 */

import { readFileSync } from "node:fs";

const API = process.env.API || "https://flashcards-server-v3oq.onrender.com";
const TAG_COLORS = [
  "#475569", "#b91c1c", "#c2410c", "#b45309", "#4d7c0f", "#047857",
  "#0e7490", "#1d4ed8", "#6d28d9", "#a21caf", "#be185d", "#78350f",
];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const keepOld = args.includes("--keep-old");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node scripts/retag.mjs <retag.json> [--dry] [--keep-old]");
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
  const { subject: subjLabel, topic: topicLabel, toTag: toTagName, words } =
    JSON.parse(readFileSync(file, "utf8"));
  if (!subjLabel || !topicLabel || !toTagName || !Array.isArray(words))
    throw new Error("file needs { subject, topic, toTag, words[] }");

  const subjects = await api("/subjects");
  const subject = subjects.find(
    (s) => s.label.toLowerCase() === subjLabel.toLowerCase() && !s.parentId
  );
  if (!subject) throw new Error(`subject "${subjLabel}" not found`);

  const topics = await api(`/topics?subjectId=${encodeURIComponent(subject._id)}`);
  const topic = topics.find((t) => t.label.toLowerCase() === topicLabel.toLowerCase());
  if (!topic) throw new Error(`topic "${topicLabel}" not found`);

  let tags = await api(`/tags?subjectId=${encodeURIComponent(subject._id)}`);
  const topicTagIds = new Set(tags.filter((t) => t.topicId === topic._id).map((t) => t._id));
  let toTag = tags.find(
    (t) => t.topicId === topic._id && t.name.toLowerCase() === toTagName.toLowerCase()
  );

  console.log(`API     : ${API}`);
  console.log(`scope   : ${subjLabel} / ${topicLabel}`);
  console.log(`toTag   : ${toTagName}${toTag ? "" : "  (will create)"}`);
  console.log(`words   : ${words.length}${dry ? "   (DRY RUN)" : ""}\n`);

  if (!toTag && !dry) {
    const color = TAG_COLORS[topicTagIds.size % TAG_COLORS.length];
    toTag = await api("/tags", {
      method: "POST",
      body: JSON.stringify({ name: toTagName, color, subjectId: subject._id, topicId: topic._id }),
    });
    topicTagIds.add(toTag._id);
    await sleep(150);
  }

  const all = await api(`/cards?subjectId=${encodeURIComponent(subject._id)}`);
  const inTopic = all.filter((c) => c.topicId === topic._id);
  const byS1 = new Map(inTopic.map((c) => [c.s1.text.trim().toLowerCase(), c]));

  let moved = 0, missing = 0, noop = 0, failed = 0;
  for (const w of words) {
    const card = byS1.get(w.trim().toLowerCase());
    if (!card) { missing++; console.warn(`  ? no card for "${w}"`); continue; }

    const cur = new Set(card.tagIds || []);
    const next = new Set(cur);
    if (!keepOld) for (const id of cur) if (topicTagIds.has(id)) next.delete(id);
    if (!dry && toTag) next.add(toTag._id);
    else if (dry) next.add("DRY:" + toTagName);

    const before = [...cur].sort().join(",");
    const after = [...next].sort().join(",");
    if (before === after) { noop++; continue; }

    if (dry) { moved++; console.log(`  ~ ${w}`); continue; }
    try {
      await api(`/cards/${card._id}`, {
        method: "PUT",
        body: JSON.stringify({ tagIds: [...next] }),
      });
      moved++;
      await sleep(110);
    } catch (e) { failed++; console.warn(`  ! ${w}: ${e.message}`); }
  }

  console.log(`\ndone. moved ${moved}, unchanged ${noop}, no-match ${missing}, failed ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

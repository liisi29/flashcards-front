#!/usr/bin/env node
/*
 * One-off: in the second line of both sides, replace ", " with " · " for
 * every card carrying a given tag.
 *
 *   node scripts/dots-in-conjugation.mjs [--dry]  [--tag ebareeglipärane]
 */
const API = process.env.API || "https://flashcards-server-v3oq.onrender.com";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const tagName = (args.indexOf("--tag") >= 0 ? args[args.indexOf("--tag") + 1] : "ebareeglipärane");
const SUBJECT = "hispaania keel";

async function api(path, opts) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${opts?.method || "GET"} ${path} -> ${res.status}`);
  return res.status === 204 ? null : res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dot = (s) => (s || "").replace(/,\s+/g, " · ");

const subjects = await api("/subjects");
const subject = subjects.find((s) => s.label.toLowerCase() === SUBJECT && !s.parentId);
const tags = await api(`/tags?subjectId=${encodeURIComponent(subject._id)}`);
const tag = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
const all = await api(`/cards?subjectId=${encodeURIComponent(subject._id)}`);
const cards = all.filter((c) => (c.tagIds || []).includes(tag._id));

console.log(`tag ${tagName}: ${cards.length} cards${dry ? "   (DRY RUN)" : ""}\n`);
let changed = 0;
for (const c of cards) {
  const n1 = dot(c.s1.text2), n2 = dot(c.s2.text2);
  if (n1 === c.s1.text2 && n2 === c.s2.text2) continue;
  changed++;
  if (dry) { console.log(`  ~ ${c.s1.text}\n      ${n1}\n      ${n2}`); continue; }
  await api(`/cards/${c._id}`, {
    method: "PUT",
    body: JSON.stringify({ s1: { ...c.s1, text2: n1 }, s2: { ...c.s2, text2: n2 } }),
  });
  await sleep(110);
}
console.log(`\ndone. ${dry ? "would change" : "changed"} ${changed}.`);

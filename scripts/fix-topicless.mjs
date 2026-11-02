#!/usr/bin/env node
/*
 * Put every card that has no topic — or points at a deleted one — into a
 * "Teemata" topic of its own subject (created only where needed).
 *
 *   node scripts/fix-topicless.mjs [--dry]
 *
 * The moved cards lose their tags: tags belong to a topic, and the old
 * topic is gone. Safe to re-run — a clean subject is left alone.
 */

const API = process.env.API || "https://flashcards-server-v3oq.onrender.com";
const NO_TOPIC = "Teemata";

const dry = process.argv.includes("--dry");

// the server sometimes drops a request — retry rather than misread an
// empty/failed answer as "this subject has no topics"
async function call(path, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`${init?.method || "GET"} ${path} → ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt >= 5) throw e;
      console.warn(`  retry ${attempt} (${e.message})`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const subjects = (await call("/subjects")).filter((s) => !s.parentId);
let total = 0;

for (const subj of subjects) {
  const topics = await call(`/topics?subjectId=${subj._id}`);
  const cards = await call(`/cards?all=1&subjectId=${subj._id}`);
  const live = new Set(topics.map((tp) => tp._id));
  const orphans = cards.filter((c) => !c.topicId || !live.has(c.topicId));
  if (!orphans.length) {
    console.log(`${subj.label}: ok (${cards.length} cards)`);
    continue;
  }

  let target = topics.find((tp) => tp.label === NO_TOPIC);
  console.log(
    `${subj.label}: ${orphans.length} of ${cards.length} cards without a topic` +
      ` → "${NO_TOPIC}"${target ? "" : " (new)"}`
  );
  for (const c of orphans.slice(0, 5))
    console.log(`    ${c.s1?.text} – ${c.s2?.text}`);
  if (orphans.length > 5) console.log(`    …`);
  total += orphans.length;
  if (dry) continue;

  if (!target)
    target = await call("/subjects", {
      method: "POST",
      body: JSON.stringify({ label: NO_TOPIC, parentId: subj._id }),
    });
  const { moved } = await call("/cards/bulk-move", {
    method: "PATCH",
    body: JSON.stringify({
      cardIds: orphans.map((c) => c._id),
      subjectId: subj._id,
      topicId: target._id,
      tagIds: [],
    }),
  });
  console.log(`    moved ${moved}`);
}

console.log(`\n${dry ? "would move" : "moved"} ${total} cards`);

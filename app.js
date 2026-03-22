var API = 'http://localhost:5001';

var cards = [];
var editingId = null;
var pendingFiles = { 1: null, 2: null };
var pendingRemoved = { 1: false, 2: false };
var showOnlyUnlearned = true;

// ── Session ──
var session = JSON.parse(localStorage.getItem('fc-session') || 'null') || {
  name: '', subject: '', viewers: []
};

function saveSession() {
  localStorage.setItem('fc-session', JSON.stringify(session));
}

// ── Welcome screen ──
var welcomeName = '';

function selectName(chip) {
  document.querySelectorAll('.name-chip').forEach(function(c) { c.classList.remove('selected'); });
  chip.classList.add('selected');
  welcomeName = chip.dataset.name;
  loadWelcomeSubjects();
  checkEnterReady();
}

async function loadWelcomeSubjects() {
  if (!welcomeName) return;
  try {
    var res = await fetch(API + '/subjects?viewer=' + encodeURIComponent(welcomeName));
    var subjects = await res.json();
    var sel = document.getElementById('welcome-subject-select');
    sel.innerHTML = '<option value="">-- Vali teema --</option>';
    subjects.forEach(function(s) {
      sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
    });
  } catch(e) {}
}

function onWelcomeSubjectSelect() {
  if (document.getElementById('welcome-subject-select').value) {
    document.getElementById('welcome-subject-input').value = '';
  }
  checkEnterReady();
}

function onWelcomeSubjectInput() {
  if (document.getElementById('welcome-subject-input').value.trim()) {
    document.getElementById('welcome-subject-select').value = '';
  }
  checkEnterReady();
}

function checkEnterReady() {
  var hasName = !!welcomeName;
  var hasSubject = !!(document.getElementById('welcome-subject-select').value ||
                     document.getElementById('welcome-subject-input').value.trim());
  document.getElementById('welcome-actions').style.display = (hasName && hasSubject) ? 'flex' : 'none';
}

function enterLearn() {
  enterApp();
  openLearnConfig();
}

function enterApp() {
  var subject = document.getElementById('welcome-subject-select').value ||
                document.getElementById('welcome-subject-input').value.trim();
  session.name = welcomeName;
  session.subject = subject;
  if (session.viewers.indexOf(welcomeName) === -1) session.viewers.push(welcomeName);
  saveSession();
  restoreSession();
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadCards();
  loadSubjects();
}

function changeUser() {
  // reset welcome screen state
  welcomeName = '';
  document.querySelectorAll('.name-chip').forEach(function(c) { c.classList.remove('selected'); });
  document.getElementById('welcome-subject-select').innerHTML = '<option value="">-- Vali teema --</option>';
  document.getElementById('welcome-subject-input').value = '';
  document.getElementById('welcome-actions').style.display = 'none';
  document.getElementById('welcome').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ── Session bar ──
function onNameChange() {
  session.name = document.getElementById('session-name').value;
  if (session.name && session.viewers.indexOf(session.name) === -1) {
    session.viewers.push(session.name);
  }
  saveSession();
  renderViewerChips();
  loadCards();
  loadSubjects();
}

function onSubjectSelectChange() {
  var val = document.getElementById('subject-select').value;
  if (val) {
    document.getElementById('subject-input').value = '';
    session.subject = val;
    saveSession();
  }
}

function onSubjectInput() {
  var val = document.getElementById('subject-input').value.trim();
  if (val) {
    document.getElementById('subject-select').value = '';
    session.subject = val;
    saveSession();
  }
}

function toggleViewer(chip) {
  var name = chip.dataset.name;
  var idx = session.viewers.indexOf(name);
  if (idx === -1) {
    session.viewers.push(name);
    chip.classList.add('selected');
  } else {
    if (name === session.name) return;
    session.viewers.splice(idx, 1);
    chip.classList.remove('selected');
  }
  saveSession();
}

function renderViewerChips() {
  document.querySelectorAll('.viewer-chip').forEach(function(chip) {
    chip.classList.toggle('selected', session.viewers.indexOf(chip.dataset.name) !== -1);
  });
}

function restoreSession() {
  if (session.name) {
    document.getElementById('session-name').value = session.name;
    document.getElementById('user-label').textContent = session.name;
  }
  if (session.subject) document.getElementById('subject-input').value = session.subject;
  renderViewerChips();
}

// ── Subjects ──
async function loadSubjects() {
  if (!session.name) return;
  try {
    var res = await fetch(API + '/subjects?viewer=' + encodeURIComponent(session.name));
    var subjects = await res.json();
    var sel = document.getElementById('subject-select');
    var filterSel = document.getElementById('filter-subject');
    sel.innerHTML = '<option value="">-- Vali või lisa uus --</option>';
    filterSel.innerHTML = '<option value="">Kõik teemad</option>';
    subjects.forEach(function(s) {
      sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      filterSel.innerHTML += '<option value="' + s + '">' + s + '</option>';
    });
    if (session.subject) sel.value = session.subject;
  } catch(e) {}
}

// ── Cards ──
async function loadCards() {
  if (!session.name) return;
  try {
    var res = await fetch(API + '/cards?viewer=' + encodeURIComponent(session.name));
    cards = await res.json();
    applyFilters();
  } catch (e) {
    setStatus('Serveriga ühendamine ebaõnnestus.');
  }
}

function applyFilters() {
  var subjectFilter = document.getElementById('filter-subject').value;
  var filtered = cards.filter(function(c) {
    if (subjectFilter && c.subject !== subjectFilter) return false;
    return true;
  });
  renderCards(filtered);
}

// ── Status ──
function setStatus(msg) { document.getElementById('status').textContent = msg; }
function setBusy(busy) {
  document.getElementById('btn-submit').disabled = busy;
  setStatus(busy ? 'Palun oota...' : '');
}

// ── Photos ──
function setupPhotoInput(side) {
  document.getElementById('s' + side + '-photo').addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    pendingFiles[side] = file;
    pendingRemoved[side] = false;
    var preview = document.getElementById('s' + side + '-preview');
    var removeBtn = document.getElementById('s' + side + '-remove');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    removeBtn.style.display = 'block';
  });
}

setupPhotoInput(1);
setupPhotoInput(2);

function removePhoto(side) {
  pendingFiles[side] = null;
  pendingRemoved[side] = true;
  document.getElementById('s' + side + '-preview').src = '';
  document.getElementById('s' + side + '-preview').style.display = 'none';
  document.getElementById('s' + side + '-remove').style.display = 'none';
  document.getElementById('s' + side + '-photo').value = '';
}

async function uploadPhoto(file) {
  var formData = new FormData();
  formData.append('image', file);
  var res = await fetch(API + '/upload', { method: 'POST', body: formData });
  var data = await res.json();
  if (!data.url) throw new Error('Upload failed');
  return data.url;
}

// ── Submit ──
async function submitForm() {
  if (!session.name) { alert('Vali kõigepealt oma nimi.'); return; }
  var subject = document.getElementById('subject-input').value.trim() || document.getElementById('subject-select').value;
  if (!subject) { alert('Vali või lisa teema.'); return; }

  var s1text  = document.getElementById('s1-text').value.trim();
  var s1text2 = document.getElementById('s1-text2').value.trim();
  var s2text  = document.getElementById('s2-text').value.trim();
  var s2text2 = document.getElementById('s2-text2').value.trim();

  if (!s1text && !s1text2 && !pendingFiles[1] && !s2text && !s2text2 && !pendingFiles[2]) {
    alert('Palun täida vähemalt üks väli.');
    return;
  }

  setBusy(true);

  try {
    var existingCard = editingId ? cards.find(function(c) { return c._id === editingId; }) : null;

    async function resolvePhoto(side) {
      if (pendingFiles[side]) return await uploadPhoto(pendingFiles[side]);
      if (pendingRemoved[side]) return null;
      return existingCard ? existingCard['s' + side].photo : null;
    }

    var entry = {
      owner: session.name,
      viewers: session.viewers.slice(),
      subject: subject,
      progress: existingCard ? existingCard.progress || {} : {},
      s1: { text: s1text, text2: s1text2, photo: await resolvePhoto(1) },
      s2: { text: s2text, text2: s2text2, photo: await resolvePhoto(2) }
    };

    if (editingId) {
      await fetch(API + '/cards/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      editingId = null;
    } else {
      await fetch(API + '/cards/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    }

    resetForm();
    await loadCards();
    await loadSubjects();
  } catch (e) {
    setStatus('Viga: ' + e.message);
  } finally {
    setBusy(false);
  }
}

// ── Edit ──
function editCard(id) {
  var c = cards.find(function(c) { return c._id === id; });
  if (!c) return;
  editingId = id;
  pendingFiles = { 1: null, 2: null };
  pendingRemoved = { 1: false, 2: false };

  document.getElementById('s1-text').value  = c.s1.text || '';
  document.getElementById('s1-text2').value = c.s1.text2 || '';
  document.getElementById('s2-text').value  = c.s2.text || '';
  document.getElementById('s2-text2').value = c.s2.text2 || '';

  [1, 2].forEach(function(side) {
    var photo = c['s' + side].photo;
    var preview = document.getElementById('s' + side + '-preview');
    var removeBtn = document.getElementById('s' + side + '-remove');
    if (photo) {
      preview.src = photo;
      preview.style.display = 'block';
      removeBtn.style.display = 'block';
    } else {
      preview.src = '';
      preview.style.display = 'none';
      removeBtn.style.display = 'none';
    }
  });

  document.getElementById('form-title').textContent = 'Muuda kaarti';
  document.getElementById('btn-submit').textContent = 'Salvesta';
  document.getElementById('btn-cancel').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() { editingId = null; resetForm(); }

function resetForm() {
  ['s1-text','s1-text2','s2-text','s2-text2'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('s1-photo').value = '';
  document.getElementById('s2-photo').value = '';
  pendingFiles = { 1: null, 2: null };
  pendingRemoved = { 1: false, 2: false };
  [1, 2].forEach(function(side) {
    document.getElementById('s' + side + '-preview').src = '';
    document.getElementById('s' + side + '-preview').style.display = 'none';
    document.getElementById('s' + side + '-remove').style.display = 'none';
  });
  document.getElementById('form-title').textContent = 'Lisa uus kaart';
  document.getElementById('btn-submit').textContent = 'Lisa kaart';
  document.getElementById('btn-cancel').style.display = 'none';
  setStatus('');
}

// ── Delete ──
async function deleteCard(id) {
  if (!confirm('Kustuta kaart?')) return;
  try {
    await fetch(API + '/cards/' + id, { method: 'DELETE' });
    if (editingId === id) { editingId = null; resetForm(); }
    await loadCards();
  } catch (e) {
    setStatus('Kustutamine ebaõnnestus.');
  }
}

// ── Progress ──
var COLORS = [null, 'red', 'yellow', 'green'];

async function cycleProgress(id) {
  var card = cards.find(function(c) { return c._id === id; });
  if (!card) return;
  var current = (card.progress && card.progress[session.name]) || null;
  var next = COLORS[(COLORS.indexOf(current) + 1) % COLORS.length];
  if (!card.progress) card.progress = {};
  card.progress[session.name] = next;
  applyFilters();
  try {
    await fetch(API + '/cards/' + id + '/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: session.name, color: next })
    });
  } catch(e) {}
}

// ── Render ──
function makeFace(side, faceNum) {
  var face = document.createElement('div');
  face.className = 'card-face card-face-' + faceNum;
  var hasPhoto = !!side.photo;
  var hasText  = !!(side.text || side.text2);
  if (hasPhoto && hasText) face.classList.add('has-both');

  if (hasPhoto) {
    var img = document.createElement('img');
    img.src = side.photo;
    img.alt = side.text || '';
    face.appendChild(img);
  }
  if (hasText) {
    var txt = document.createElement('div');
    txt.className = 'card-text';
    if (side.text) {
      var line1 = document.createElement('div');
      line1.textContent = side.text;
      txt.appendChild(line1);
    }
    if (side.text2) {
      var line2 = document.createElement('div');
      line2.style.fontSize = '1.1rem';
      line2.style.fontWeight = 'normal';
      line2.style.marginTop = '8px';
      line2.style.opacity = '0.85';
      line2.textContent = side.text2;
      txt.appendChild(line2);
    }
    face.appendChild(txt);
  }
  if (!hasPhoto && !hasText) {
    var empty = document.createElement('div');
    empty.className = 'card-text';
    empty.style.opacity = '0.3';
    empty.textContent = '?';
    face.appendChild(empty);
  }
  return face;
}

function renderCards(filtered) {
  var list = filtered || cards;
  var container = document.getElementById('cards');
  container.innerHTML = '';
  document.getElementById('empty-msg').style.display = list.length === 0 ? 'block' : 'none';

  list.forEach(function(card) {
    var wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    var scene = document.createElement('div');
    scene.className = 'card-scene';
    scene.addEventListener('click', function() { this.classList.toggle('flipped'); });

    var inner = document.createElement('div');
    inner.className = 'card';
    inner.appendChild(makeFace(card.s1, 1));
    inner.appendChild(makeFace(card.s2, 2));
    scene.appendChild(inner);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = (card.subject || '') + (card.owner ? ' · ' + card.owner : '');

    var actions = document.createElement('div');
    actions.className = 'card-actions';

    var dot = document.createElement('div');
    dot.className = 'progress-dot';
    var color = card.progress && card.progress[session.name];
    if (color) dot.classList.add(color);
    dot.title = 'Vaheta progress';
    dot.addEventListener('click', (function(id) {
      return function() { cycleProgress(id); };
    })(card._id));

    var editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Muuda';
    editBtn.addEventListener('click', (function(id) {
      return function() { editCard(id); };
    })(card._id));

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Kustuta';
    deleteBtn.addEventListener('click', (function(id) {
      return function() { deleteCard(id); };
    })(card._id));

    actions.appendChild(dot);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    wrapper.appendChild(scene);
    wrapper.appendChild(meta);
    wrapper.appendChild(actions);
    container.appendChild(wrapper);
  });
}

function shuffle() {
  for (var i = cards.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
  }
  applyFilters();
}

// ── Learning mode ──
var learnCards = [];
var learnIndex = 0;

function openLearnConfig() {
  // populate subject dropdown
  var sel = document.getElementById('learn-subject');
  var subjects = Array.from(new Set(cards.map(function(c) { return c.subject; }).filter(Boolean)));
  sel.innerHTML = '<option value="">Kõik teemad</option>';
  subjects.forEach(function(s) {
    sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
  });
  // pre-select current filter subject if any
  var currentSubject = document.getElementById('filter-subject').value;
  if (currentSubject) sel.value = currentSubject;

  document.getElementById('learn-config').style.display = 'flex';
}

function closeLearnConfig() {
  document.getElementById('learn-config').style.display = 'none';
}

function getFilteredCards() {
  var subjectFilter = document.getElementById('filter-subject').value;
  return cards.filter(function(c) {
    if (subjectFilter && c.subject !== subjectFilter) return false;
    return true;
  });
}


function getLearnPool() {
  var subjectFilter = document.getElementById('learn-subject') ?
    document.getElementById('learn-subject').value : '';
  var allowNone   = document.getElementById('lp-none').checked;
  var allowRed    = document.getElementById('lp-red').checked;
  var allowYellow = document.getElementById('lp-yellow').checked;
  var allowGreen  = document.getElementById('lp-green').checked;
  return cards.filter(function(c) {
    if (subjectFilter && c.subject !== subjectFilter) return false;
    var p = (c.progress && c.progress[session.name]) || null;
    if (p === null     && allowNone)   return true;
    if (p === 'red'    && allowRed)    return true;
    if (p === 'yellow' && allowYellow) return true;
    if (p === 'green'  && allowGreen)  return true;
    return false;
  });
}

function startLearning() {
  var random = document.getElementById('learn-random').checked;
  var viewAll = document.getElementById('learn-view-all').checked;
  var pool = getLearnPool();

  if (pool.length === 0) { alert('Valitud filtritega kaarte ei leitud.'); return; }

  if (random) {
    pool = pool.slice().sort(function() { return Math.random() - 0.5; });
  }

  learnCards = pool;
  learnIndex = 0;

  closeLearnConfig();

  if (viewAll) {
    renderLearnGrid();
  } else {
    document.getElementById('learn-mode').style.display = 'flex';
    renderLearnCard();
  }
}

function renderLearnGrid() {
  var container = document.getElementById('learn-grid-cards');
  container.innerHTML = '';
  learnCards.forEach(function(card) {
    var wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    var scene = document.createElement('div');
    scene.className = 'card-scene';
    scene.addEventListener('click', function() { this.classList.toggle('flipped'); });

    var inner = document.createElement('div');
    inner.className = 'card';
    inner.appendChild(makeFace(card.s1, 1));
    inner.appendChild(makeFace(card.s2, 2));
    scene.appendChild(inner);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.style.color = '#a0aec0';
    meta.textContent = card.subject || '';

    var dotsRow = document.createElement('div');
    dotsRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';
    var currentColor = (card.progress && card.progress[session.name]) || null;

    [['none', null], ['red', 'red'], ['yellow', 'yellow'], ['green', 'green']].forEach(function(pair) {
      var label = pair[0], color = pair[1];
      var d = document.createElement('div');
      d.className = 'sem-dot sem-' + label;
      if (color === currentColor || (color === null && currentColor === null)) d.classList.add('selected');
      d.addEventListener('click', (function(c, col, dotEl, row, wrap) {
        return async function() {
          if (!c.progress) c.progress = {};
          c.progress[session.name] = col;
          row.querySelectorAll('.sem-dot').forEach(function(x) { x.classList.remove('selected'); });
          dotEl.classList.add('selected');
          // remove card if color is filtered out
          var allowNone   = document.getElementById('lp-none').checked;
          var allowRed    = document.getElementById('lp-red').checked;
          var allowYellow = document.getElementById('lp-yellow').checked;
          var allowGreen  = document.getElementById('lp-green').checked;
          var allowed = (col === null && allowNone) || (col === 'red' && allowRed) ||
                        (col === 'yellow' && allowYellow) || (col === 'green' && allowGreen);
          if (!allowed) {
            wrap.style.transition = 'opacity 0.3s';
            wrap.style.opacity = '0';
            setTimeout(function() { wrap.remove(); }, 300);
          }
          try {
            await fetch(API + '/cards/' + c._id + '/progress', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: session.name, color: col })
            });
          } catch(e) {}
        };
      })(card, color, d, dotsRow, wrapper));
      dotsRow.appendChild(d);
    });

    wrapper.appendChild(scene);
    wrapper.appendChild(meta);
    wrapper.appendChild(dotsRow);
    container.appendChild(wrapper);
  });
  document.getElementById('learn-grid-counter').textContent = learnCards.length + ' kaarti';
  document.getElementById('learn-grid').style.display = 'flex';
}

function exitLearning() {
  document.getElementById('learn-mode').style.display = 'none';
  document.getElementById('learn-scene').classList.remove('flipped');
  document.getElementById('learn-config').style.display = 'flex';
}

function renderLearnCard() {
  var card = learnCards[learnIndex];
  var scene = document.getElementById('learn-scene');
  scene.classList.remove('flipped');

  var inner = document.getElementById('learn-card');
  inner.innerHTML = '';
  inner.appendChild(makeFace(card.s1, 1));
  inner.appendChild(makeFace(card.s2, 2));

  document.getElementById('learn-counter').textContent = (learnIndex + 1) + ' / ' + learnCards.length;

  // progress dots
  var color = (card.progress && card.progress[session.name]) || null;
  ['none','red','yellow','green'].forEach(function(c) {
    var el = document.getElementById('lpd-' + c);
    el.classList.toggle('selected', (c === 'none' ? null : c) === color);
  });

  // nav dots
  var dots = document.getElementById('learn-dots');
  dots.innerHTML = '';
  learnCards.forEach(function(_, i) {
    var d = document.createElement('div');
    d.className = 'learn-dot' + (i === learnIndex ? ' current' : i < learnIndex ? ' seen' : '');
    dots.appendChild(d);
  });
}

async function setLearnProgress(color) {
  var card = learnCards[learnIndex];
  if (!card.progress) card.progress = {};
  card.progress[session.name] = color;
  ['none','red','yellow','green'].forEach(function(c) {
    document.getElementById('lpd-' + c).classList.toggle('selected', (c === 'none' ? null : c) === color);
  });
  // if color is now filtered out, remove card and move on
  var allowNone   = document.getElementById('lp-none').checked;
  var allowRed    = document.getElementById('lp-red').checked;
  var allowYellow = document.getElementById('lp-yellow').checked;
  var allowGreen  = document.getElementById('lp-green').checked;
  var allowed = (color === null && allowNone) || (color === 'red' && allowRed) ||
                (color === 'yellow' && allowYellow) || (color === 'green' && allowGreen);
  if (!allowed) {
    learnCards.splice(learnIndex, 1);
    if (learnCards.length === 0) { exitLearning(); return; }
    if (learnIndex >= learnCards.length) learnIndex = learnCards.length - 1;
    renderLearnCard();
  }
  try {
    await fetch(API + '/cards/' + card._id + '/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: session.name, color: color })
    });
  } catch(e) {}
}

function learnNext() {
  if (learnIndex < learnCards.length - 1) {
    learnIndex++;
    renderLearnCard();
  }
}

function learnPrev() {
  if (learnIndex > 0) {
    learnIndex--;
    renderLearnCard();
  }
}

// keyboard navigation
document.addEventListener('keydown', function(e) {
  var mode = document.getElementById('learn-mode');
  if (mode.style.display === 'none') return;
  if (e.key === 'ArrowRight') learnNext();
  if (e.key === 'ArrowLeft') learnPrev();
  if (e.key === ' ') { e.preventDefault(); document.getElementById('learn-scene').classList.toggle('flipped'); }
  if (e.key === 'Escape') { exitLearning(); }
});

// ── Init ──
restoreSession();
if (session.name) {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadCards();
  loadSubjects();
}

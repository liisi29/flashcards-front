// ── Main / Lisa view ──

var editingId = null;
var s1PhotoUrl = null;
var s2PhotoUrl = null;

function setStatus(msg) {
  var el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function initMain() {
  var userLabel = document.getElementById('user-label');
  if (userLabel) userLabel.textContent = session.name;

  // Set subject input from session
  var subjectInput = document.getElementById('subject-input');
  if (subjectInput && session.subject) subjectInput.value = session.subject;

  // Restore viewer chips
  document.querySelectorAll('.viewer-chip').forEach(function(chip) {
    chip.classList.toggle('active', session.viewers.includes(chip.dataset.name));
  });

  // Photo preview listeners
  document.getElementById('s1-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 1);
  });
  document.getElementById('s2-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 2);
  });
}

function onSubjectInput() {
  session.subject = document.getElementById('subject-input').value.trim();
  saveSession();
}

function toggleViewer(chip) {
  chip.classList.toggle('active');
  var name = chip.dataset.name;
  if (chip.classList.contains('active')) {
    if (!session.viewers.includes(name)) session.viewers.push(name);
  } else {
    session.viewers = session.viewers.filter(function(v) { return v !== name; });
  }
  saveSession();
}

function applyFilters() {
  var subject = document.getElementById('filter-subject').value;
  var filtered = cards.filter(function(c) {
    return !subject || c.subject === subject;
  });
  renderCards(filtered);
}

function renderCards(list) {
  var container = document.getElementById('cards');
  var emptyMsg = document.getElementById('empty-msg');
  container.innerHTML = '';
  if (!list.length) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';
  list.forEach(function(card) {
    var scene = document.createElement('div');
    scene.className = 'card-scene';
    scene.onclick = function() { scene.classList.toggle('flipped'); };

    var inner = document.createElement('div');
    inner.className = 'card';

    // Progress dot
    var prog = card.progress && card.progress[session.name];
    if (prog) inner.classList.add('prog-' + prog);

    inner.appendChild(makeFace(card.s1 || {}, 1));
    inner.appendChild(makeFace(card.s2 || {}, 2));

    // Controls
    var controls = document.createElement('div');
    controls.className = 'card-controls';
    controls.innerHTML =
      '<button onclick="event.stopPropagation();editCard(\'' + card._id + '\')">✏️</button>' +
      '<button onclick="event.stopPropagation();deleteCard(\'' + card._id + '\')">🗑️</button>';
    inner.appendChild(controls);

    scene.appendChild(inner);
    container.appendChild(scene);
  });
}

function shuffle() {
  for (var i = cards.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
  }
  applyFilters();
}

// ── Form ──

function previewPhoto(file, side) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('s' + side + '-preview').src = e.target.result;
    document.getElementById('s' + side + '-preview').style.display = 'block';
    document.getElementById('s' + side + '-remove').style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

function removePhoto(side) {
  if (side === 1) s1PhotoUrl = null;
  else s2PhotoUrl = null;
  document.getElementById('s' + side + '-photo').value = '';
  document.getElementById('s' + side + '-preview').src = '';
  document.getElementById('s' + side + '-preview').style.display = 'none';
  document.getElementById('s' + side + '-remove').style.display = 'none';
}

function resetForm() {
  editingId = null;
  s1PhotoUrl = null;
  s2PhotoUrl = null;
  ['s1-text','s1-text2','s2-text','s2-text2'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  removePhoto(1);
  removePhoto(2);
  document.getElementById('form-title').textContent = 'Lisa uus kaart';
  document.getElementById('btn-submit').textContent = 'Lisa kaart';
  document.getElementById('btn-cancel').style.display = 'none';
  setStatus('');
}

function cancelEdit() {
  resetForm();
}

async function submitForm() {
  var subject = document.getElementById('subject-input').value.trim();
  if (!subject) { setStatus('Palun sisesta teema.'); return; }
  if (!session.name) { setStatus('Palun vali oma nimi.'); return; }

  setStatus('Salvestан...');

  try {
    // Upload photos if new files selected
    var s1File = document.getElementById('s1-photo').files[0];
    var s2File = document.getElementById('s2-photo').files[0];
    if (s1File) s1PhotoUrl = await uploadPhoto(s1File);
    if (s2File) s2PhotoUrl = await uploadPhoto(s2File);

    var body = {
      owner: session.name,
      viewers: session.viewers.length ? session.viewers : [session.name],
      subject: subject,
      s1: {
        text: document.getElementById('s1-text').value.trim(),
        text2: document.getElementById('s1-text2').value.trim(),
        photo: s1PhotoUrl || ''
      },
      s2: {
        text: document.getElementById('s2-text').value.trim(),
        text2: document.getElementById('s2-text2').value.trim(),
        photo: s2PhotoUrl || ''
      }
    };

    if (editingId) {
      await apiPut('/cards/' + editingId, body);
      setStatus('Kaart salvestatud!');
    } else {
      await apiPost('/cards/add', body);
      setStatus('Kaart lisatud!');
    }

    resetForm();
    await loadCards();
    await loadSubjects();
  } catch(e) {
    setStatus('Viga: ' + e.message);
  }
}

async function editCard(id) {
  var card = cards.find(function(c) { return c._id === id; });
  if (!card) return;

  editingId = id;
  s1PhotoUrl = card.s1 && card.s1.photo || null;
  s2PhotoUrl = card.s2 && card.s2.photo || null;

  document.getElementById('subject-input').value = card.subject || '';
  session.subject = card.subject || '';
  saveSession();

  document.getElementById('s1-text').value = card.s1 && card.s1.text || '';
  document.getElementById('s1-text2').value = card.s1 && card.s1.text2 || '';
  document.getElementById('s2-text').value = card.s2 && card.s2.text || '';
  document.getElementById('s2-text2').value = card.s2 && card.s2.text2 || '';

  if (s1PhotoUrl) {
    document.getElementById('s1-preview').src = s1PhotoUrl;
    document.getElementById('s1-preview').style.display = 'block';
    document.getElementById('s1-remove').style.display = 'inline-block';
  }
  if (s2PhotoUrl) {
    document.getElementById('s2-preview').src = s2PhotoUrl;
    document.getElementById('s2-preview').style.display = 'block';
    document.getElementById('s2-remove').style.display = 'inline-block';
  }

  // Restore viewers
  document.querySelectorAll('.viewer-chip').forEach(function(chip) {
    chip.classList.toggle('active', (card.viewers || []).includes(chip.dataset.name));
  });
  session.viewers = card.viewers || [];
  saveSession();

  document.getElementById('form-title').textContent = 'Muuda kaarti';
  document.getElementById('btn-submit').textContent = 'Salvesta';
  document.getElementById('btn-cancel').style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCard(id) {
  if (!confirm('Kustutan kaardi?')) return;
  await apiDelete('/cards/' + id);
  await loadCards();
}

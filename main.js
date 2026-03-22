// ── Main / Lisa view ──

var s1PhotoUrl = null;
var s2PhotoUrl = null;

// ── Edit modal state ──
var editingId = null;
var editS1PhotoUrl = null;
var editS2PhotoUrl = null;
var editingProgress = null;
var editViewers = [];

function setAddStatus(msg) {
  document.getElementById('add-status').textContent = msg;
}

function setEditStatus(msg) {
  document.getElementById('edit-status').textContent = msg;
}

function initMain() {
  var userLabel = document.getElementById('user-label');
  if (userLabel) userLabel.textContent = session.name;

  var filterOwner = document.getElementById('filter-owner');
  if (filterOwner && session.name) filterOwner.value = session.name;

  var subjectInput = document.getElementById('subject-input');
  if (subjectInput && session.subject) subjectInput.value = session.subject;

  document.querySelectorAll('#app .viewer-chip').forEach(function(chip) {
    chip.classList.toggle('selected', session.viewers.includes(chip.dataset.name));
  });

  document.getElementById('s1-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 's1-preview', 's1-remove');
  });
  document.getElementById('s2-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 's2-preview', 's2-remove');
  });
  document.getElementById('em-s1-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 'em-s1-preview', 'em-s1-remove');
  });
  document.getElementById('em-s2-photo').addEventListener('change', function(e) {
    previewPhoto(e.target.files[0], 'em-s2-preview', 'em-s2-remove');
  });
}

function onSubjectSelect() {
  var val = document.getElementById('subject-select').value;
  if (val) {
    document.getElementById('subject-input').value = '';
    session.subject = val;
    saveSession();
  }
}

function onSubjectInput() {
  var val = document.getElementById('subject-input').value.trim();
  if (val) document.getElementById('subject-select').value = '';
  session.subject = val;
  saveSession();
}

function toggleViewer(chip) {
  chip.classList.toggle('selected');
  var name = chip.dataset.name;
  if (chip.classList.contains('selected')) {
    if (!session.viewers.includes(name)) session.viewers.push(name);
  } else {
    session.viewers = session.viewers.filter(function(v) { return v !== name; });
  }
  saveSession();
}

function applyFilters() {
  var subject = document.getElementById('filter-subject').value;
  var owner   = document.getElementById('filter-owner').value;
  var viewer  = document.getElementById('filter-viewer').value;
  var filtered = cards.filter(function(c) {
    if (subject && c.subject !== subject) return false;
    if (owner && c.owner !== owner) return false;
    if (viewer && !(c.viewers || []).includes(viewer)) return false;
    return true;
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
    var wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    var scene = document.createElement('div');
    scene.className = 'card-scene';
    scene.onclick = function() { scene.classList.toggle('flipped'); };

    var inner = document.createElement('div');
    inner.className = 'card';

    var prog = card.progress && card.progress[session.name];
    if (prog) inner.classList.add('prog-' + prog);

    inner.appendChild(makeFace(card.s1 || {}, 1));
    inner.appendChild(makeFace(card.s2 || {}, 2));
    scene.appendChild(inner);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = (card.subject || '') + ' · ' + (card.viewers || []).join(', ');

    var controls = document.createElement('div');
    controls.className = 'card-actions';
    controls.innerHTML =
      '<button class="btn-edit" onclick="openEditModal(\'' + card._id + '\')">Muuda</button>' +
      '<button class="btn-delete" onclick="deleteCard(\'' + card._id + '\')">Kustuta</button>';

    wrapper.appendChild(scene);
    wrapper.appendChild(meta);
    wrapper.appendChild(controls);
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

// ── Add form (new cards) ──

function previewPhoto(file, previewId, removeId) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById(previewId);
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById(removeId).style.display = 'inline-block';
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

function resetAddForm() {
  s1PhotoUrl = null;
  s2PhotoUrl = null;
  ['s1-text','s1-text2','s2-text','s2-text2'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  removePhoto(1);
  removePhoto(2);
  setAddStatus('');
}

async function submitForm() {
  var subject = document.getElementById('subject-input').value.trim()
    || document.getElementById('subject-select').value;
  if (!subject) { setAddStatus('Palun sisesta teema.'); return; }
  if (!session.name) { setAddStatus('Palun vali oma nimi.'); return; }

  setAddStatus('Salvestan...');
  try {
    var s1File = document.getElementById('s1-photo').files[0];
    var s2File = document.getElementById('s2-photo').files[0];
    if (s1File) s1PhotoUrl = await uploadPhoto(s1File);
    if (s2File) s2PhotoUrl = await uploadPhoto(s2File);

    await apiPost('/cards/add', {
      owner: session.name,
      viewers: session.viewers.length ? session.viewers : [session.name],
      subject: subject,
      s1: { text: document.getElementById('s1-text').value.trim(), text2: document.getElementById('s1-text2').value.trim(), photo: s1PhotoUrl || '' },
      s2: { text: document.getElementById('s2-text').value.trim(), text2: document.getElementById('s2-text2').value.trim(), photo: s2PhotoUrl || '' }
    });

    setAddStatus('Kaart lisatud!');
    resetAddForm();
    await loadCards();
    await loadSubjects();
  } catch(e) {
    setAddStatus('Viga: ' + e.message);
  }
}

// ── Edit modal ──

function openEditModal(id) {
  var card = cards.find(function(c) { return c._id === id; });
  if (!card) return;

  editingId = id;
  editS1PhotoUrl = (card.s1 && card.s1.photo) || null;
  editS2PhotoUrl = (card.s2 && card.s2.photo) || null;
  editViewers = (card.viewers || []).slice();

  document.getElementById('em-s1-text').value  = (card.s1 && card.s1.text)  || '';
  document.getElementById('em-s1-text2').value = (card.s1 && card.s1.text2) || '';
  document.getElementById('em-s2-text').value  = (card.s2 && card.s2.text)  || '';
  document.getElementById('em-s2-text2').value = (card.s2 && card.s2.text2) || '';
  document.getElementById('em-subject').value  = card.subject || '';

  // Photos
  ['em-s1-preview','em-s2-preview'].forEach(function(id) {
    document.getElementById(id).src = '';
    document.getElementById(id).style.display = 'none';
  });
  ['em-s1-remove','em-s2-remove'].forEach(function(id) {
    document.getElementById(id).style.display = 'none';
  });
  if (editS1PhotoUrl) {
    document.getElementById('em-s1-preview').src = editS1PhotoUrl;
    document.getElementById('em-s1-preview').style.display = 'block';
    document.getElementById('em-s1-remove').style.display = 'inline-block';
  }
  if (editS2PhotoUrl) {
    document.getElementById('em-s2-preview').src = editS2PhotoUrl;
    document.getElementById('em-s2-preview').style.display = 'block';
    document.getElementById('em-s2-remove').style.display = 'inline-block';
  }

  // Viewers
  document.querySelectorAll('#edit-modal .viewer-chip').forEach(function(chip) {
    chip.classList.toggle('selected', editViewers.includes(chip.dataset.name));
  });

  // Semaphore
  selectEditProgress((card.progress && card.progress[session.name]) || null);

  setEditStatus('');
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingId = null;
}

function removeEditPhoto(side) {
  if (side === 1) editS1PhotoUrl = null;
  else editS2PhotoUrl = null;
  document.getElementById('em-s' + side + '-photo').value = '';
  document.getElementById('em-s' + side + '-preview').src = '';
  document.getElementById('em-s' + side + '-preview').style.display = 'none';
  document.getElementById('em-s' + side + '-remove').style.display = 'none';
}

function toggleEditViewer(chip) {
  chip.classList.toggle('selected');
  var name = chip.dataset.name;
  if (chip.classList.contains('selected')) {
    if (!editViewers.includes(name)) editViewers.push(name);
  } else {
    editViewers = editViewers.filter(function(v) { return v !== name; });
  }
}

function selectEditProgress(color) {
  editingProgress = color;
  ['ep-none','ep-red','ep-yellow','ep-green'].forEach(function(id) {
    document.getElementById(id).classList.remove('selected');
  });
  var map = { null: 'ep-none', red: 'ep-red', yellow: 'ep-yellow', green: 'ep-green' };
  document.getElementById(map[color] || 'ep-none').classList.add('selected');
}

async function saveEditCard() {
  if (!editingId) return;
  setEditStatus('Salvestan...');
  try {
    var s1File = document.getElementById('em-s1-photo').files[0];
    var s2File = document.getElementById('em-s2-photo').files[0];
    if (s1File) editS1PhotoUrl = await uploadPhoto(s1File);
    if (s2File) editS2PhotoUrl = await uploadPhoto(s2File);

    await apiPut('/cards/' + editingId, {
      owner: session.name,
      viewers: editViewers.length ? editViewers : [session.name],
      subject: document.getElementById('em-subject').value.trim(),
      s1: { text: document.getElementById('em-s1-text').value.trim(), text2: document.getElementById('em-s1-text2').value.trim(), photo: editS1PhotoUrl || '' },
      s2: { text: document.getElementById('em-s2-text').value.trim(), text2: document.getElementById('em-s2-text2').value.trim(), photo: editS2PhotoUrl || '' }
    });
    await apiPatch('/cards/' + editingId + '/progress', { name: session.name, color: editingProgress });

    closeEditModal();
    await loadCards();
    await loadSubjects();
  } catch(e) {
    setEditStatus('Viga: ' + e.message);
  }
}

async function deleteCard(id) {
  if (!confirm('Kustutan kaardi?')) return;
  await apiDelete('/cards/' + id);
  await loadCards();
}

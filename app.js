// ── Shared state & config ──
var API = 'https://flashcards-server-v3oq.onrender.com';
var COLORS = [null, 'red', 'yellow', 'green'];

var cards = [];
var session = JSON.parse(localStorage.getItem('fc-session') || 'null') || {
  name: '', subject: '', viewers: []
};

function saveSession() {
  localStorage.setItem('fc-session', JSON.stringify(session));
}

// ── API helpers ──
async function apiGet(path) {
  var res = await fetch(API + path);
  return res.json();
}

async function apiPost(path, body) {
  var res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPut(path, body) {
  var res = await fetch(API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPatch(path, body) {
  var res = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiDelete(path) {
  var res = await fetch(API + path, { method: 'DELETE' });
  return res.json();
}

async function uploadPhoto(file) {
  var formData = new FormData();
  formData.append('image', file);
  var res = await fetch(API + '/upload', { method: 'POST', body: formData });
  var data = await res.json();
  if (!data.url) throw new Error('Upload failed');
  return data.url;
}

// ── Shared data loaders ──
async function loadCards() {
  if (!session.name) return;
  try {
    cards = await apiGet('/cards?viewer=' + encodeURIComponent(session.name));
    applyFilters();
  } catch(e) {
    setStatus('Serveriga ühendamine ebaõnnestus.');
  }
}

async function loadSubjects() {
  if (!session.name) return;
  try {
    var subjects = await apiGet('/subjects?viewer=' + encodeURIComponent(session.name));

    var filterSel = document.getElementById('filter-subject');
    if (filterSel) {
      filterSel.innerHTML = '<option value="">Kõik teemad</option>';
      subjects.forEach(function(s) {
        filterSel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      });
      if (session.subject) filterSel.value = session.subject;
      applyFilters();
    }

    var subjectSel = document.getElementById('subject-select');
    if (subjectSel) {
      subjectSel.innerHTML = '<option value="">-- Vali teema --</option>';
      subjects.forEach(function(s) {
        subjectSel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      });
      if (session.subject) subjectSel.value = session.subject;
    }
  } catch(e) {}
}

// ── Shared card renderer ──
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

// Init runs in welcome.js after all scripts are loaded

// ── Welcome screen ──

function restoreSession() {
  if (session.name) {
    document.getElementById('session-name').value = session.name;
    var userLabel = document.getElementById('user-label');
    if (userLabel) userLabel.textContent = session.name;
    document.querySelectorAll('.name-chip').forEach(function(c) {
      c.classList.toggle('selected', c.dataset.name === session.name);
    });
  }
}

function selectName(chip) {
  document.querySelectorAll('.name-chip').forEach(function(c) { c.classList.remove('selected'); });
  chip.classList.add('selected');
  session.name = chip.dataset.name;
  saveSession();
  loadWelcomeSubjects();
  checkWelcomeReady();
}

function onWelcomeSubjectSelect() {
  var val = document.getElementById('welcome-subject-select').value;
  if (val) {
    document.getElementById('welcome-subject-input').value = '';
    session.subject = val;
    saveSession();
  }
  checkWelcomeReady();
}

function onWelcomeSubjectInput() {
  var val = document.getElementById('welcome-subject-input').value.trim();
  if (val) {
    document.getElementById('welcome-subject-select').value = '';
    session.subject = val;
    saveSession();
  }
  checkWelcomeReady();
}

function checkWelcomeReady() {
  var subject = document.getElementById('welcome-subject-input').value.trim()
    || document.getElementById('welcome-subject-select').value;
  var actions = document.getElementById('welcome-actions');
  if (session.name && subject) {
    session.subject = subject;
    saveSession();
    actions.style.display = 'flex';
  } else {
    actions.style.display = 'none';
  }
}

async function loadWelcomeSubjects() {
  if (!session.name) return;
  try {
    var subjects = await apiGet('/subjects?viewer=' + encodeURIComponent(session.name));
    var sel = document.getElementById('welcome-subject-select');
    sel.innerHTML = '<option value="">-- Vali teema --</option>';
    subjects.forEach(function(s) {
      sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
    });
    if (session.subject) {
      sel.value = session.subject;
      if (!sel.value) sel.value = '';
    }
    checkWelcomeReady();
  } catch(e) {}
}

function enterApp() {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  initMain();
  loadCards();
  loadSubjects();
}

function enterLearn() {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  openLearnConfig();
}

function changeUser() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('welcome').style.display = 'flex';
  document.querySelectorAll('.name-chip').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.name === session.name);
  });
  loadWelcomeSubjects();
}

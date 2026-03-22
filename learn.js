// ── Learning mode ──

// ── Init (runs after all scripts load) ──
restoreSession();
if (session.name) {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  initMain();
  loadCards();
  loadSubjects();
} else {
  loadWelcomeSubjects();
}

var learnCards = [];
var learnIdx = 0;

function openLearnConfig() {
  // Populate subject select
  var sel = document.getElementById('learn-subject');
  sel.innerHTML = '<option value="">Kõik teemad</option>';
  var seen = {};
  cards.forEach(function(c) {
    if (c.subject && !seen[c.subject]) {
      seen[c.subject] = true;
      sel.innerHTML += '<option value="' + c.subject + '">' + c.subject + '</option>';
    }
  });
  if (session.subject) sel.value = session.subject;

  document.getElementById('learn-config').style.display = 'flex';
}

function closeLearnConfig() {
  document.getElementById('learn-config').style.display = 'none';
  // Go back: if app is hidden, show welcome
  if (document.getElementById('app').style.display === 'none') {
    document.getElementById('welcome').style.display = 'flex';
  }
}

function exitLearning() {
  document.getElementById('learn-mode').style.display = 'none';
  document.getElementById('learn-config').style.display = 'flex';
}

function startLearning() {
  var subject = document.getElementById('learn-subject').value;
  var random = document.getElementById('learn-random').checked;
  var filterNone = document.getElementById('lp-none').checked;
  var filterRed = document.getElementById('lp-red').checked;
  var filterYellow = document.getElementById('lp-yellow').checked;
  var filterGreen = document.getElementById('lp-green').checked;

  var filtered = cards.filter(function(c) {
    if (subject && c.subject !== subject) return false;
    var prog = c.progress && c.progress[session.name];
    if (!prog && filterNone) return true;
    if (prog === 'red' && filterRed) return true;
    if (prog === 'yellow' && filterYellow) return true;
    if (prog === 'green' && filterGreen) return true;
    return false;
  });

  if (!filtered.length) {
    alert('Ühtegi kaarti ei leitud valitud filtritega.');
    return;
  }

  if (random) {
    for (var i = filtered.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = filtered[i]; filtered[i] = filtered[j]; filtered[j] = tmp;
    }
  }

  learnCards = filtered;
  learnIdx = 0;

  var viewAll = document.getElementById('learn-view-all').checked;
  document.getElementById('learn-config').style.display = 'none';

  if (viewAll) {
    startLearnGrid();
  } else {
    startLearnSingle();
  }
}

// ── Single card mode ──

function startLearnSingle() {
  document.getElementById('learn-mode').style.display = 'flex';
  renderLearnCard();
  renderLearnDots();
}

function renderLearnCard() {
  var card = learnCards[learnIdx];
  var cardEl = document.getElementById('learn-card');
  var scene = document.getElementById('learn-scene');

  cardEl.innerHTML = '';
  cardEl.appendChild(makeFace(card.s1 || {}, 1));
  cardEl.appendChild(makeFace(card.s2 || {}, 2));

  scene.classList.remove('flipped');

  document.getElementById('learn-counter').textContent =
    (learnIdx + 1) + ' / ' + learnCards.length;

  // Update active sem-dot
  var prog = card.progress && card.progress[session.name];
  ['lpd-none','lpd-red','lpd-yellow','lpd-green'].forEach(function(id) {
    document.getElementById(id).classList.remove('active');
  });
  var activeMap = { null: 'lpd-none', red: 'lpd-red', yellow: 'lpd-yellow', green: 'lpd-green' };
  var activeId = activeMap[prog] || 'lpd-none';
  document.getElementById(activeId).classList.add('active');
}

function renderLearnDots() {
  var wrap = document.getElementById('learn-dots');
  wrap.innerHTML = '';
  learnCards.forEach(function(card, i) {
    var dot = document.createElement('div');
    dot.className = 'learn-dot';
    var prog = card.progress && card.progress[session.name];
    if (prog) dot.classList.add('dot-' + prog);
    if (i === learnIdx) dot.classList.add('active');
    dot.onclick = function() { learnIdx = i; renderLearnCard(); renderLearnDots(); };
    wrap.appendChild(dot);
  });
}

function learnNext() {
  if (learnIdx < learnCards.length - 1) {
    learnIdx++;
    renderLearnCard();
    renderLearnDots();
  }
}

function learnPrev() {
  if (learnIdx > 0) {
    learnIdx--;
    renderLearnCard();
    renderLearnDots();
  }
}

async function setLearnProgress(color) {
  var card = learnCards[learnIdx];
  if (!card) return;

  if (!card.progress) card.progress = {};
  card.progress[session.name] = color;

  // Also update in global cards array
  var globalCard = cards.find(function(c) { return c._id === card._id; });
  if (globalCard) {
    if (!globalCard.progress) globalCard.progress = {};
    globalCard.progress[session.name] = color;
  }

  await apiPatch('/cards/' + card._id + '/progress', { name: session.name, color: color });

  renderLearnCard();
  renderLearnDots();

  // Move to next card after short delay
  setTimeout(function() {
    if (learnIdx < learnCards.length - 1) {
      learnNext();
    }
  }, 300);
}

// ── Grid mode ──

function startLearnGrid() {
  var container = document.getElementById('learn-grid-cards');
  container.innerHTML = '';

  learnCards.forEach(function(card) {
    var scene = document.createElement('div');
    scene.className = 'card-scene';
    scene.id = 'grid-scene-' + card._id;
    scene.onclick = function() { scene.classList.toggle('flipped'); };

    var inner = document.createElement('div');
    inner.className = 'card';
    inner.id = 'grid-card-' + card._id;

    var prog = card.progress && card.progress[session.name];
    if (prog) inner.classList.add('prog-' + prog);

    inner.appendChild(makeFace(card.s1 || {}, 1));
    inner.appendChild(makeFace(card.s2 || {}, 2));

    // Sem dots inside card
    var dots = document.createElement('div');
    dots.className = 'grid-sem-dots';
    dots.innerHTML =
      '<div class="sem-dot sem-grey' + (!prog ? ' active' : '') + '" onclick="event.stopPropagation();setGridProgress(\'' + card._id + '\',null)"></div>' +
      '<div class="sem-dot sem-red' + (prog === 'red' ? ' active' : '') + '" onclick="event.stopPropagation();setGridProgress(\'' + card._id + '\',\'red\')"></div>' +
      '<div class="sem-dot sem-yellow' + (prog === 'yellow' ? ' active' : '') + '" onclick="event.stopPropagation();setGridProgress(\'' + card._id + '\',\'yellow\')"></div>' +
      '<div class="sem-dot sem-green' + (prog === 'green' ? ' active' : '') + '" onclick="event.stopPropagation();setGridProgress(\'' + card._id + '\',\'green\')"></div>';
    inner.appendChild(dots);

    scene.appendChild(inner);
    container.appendChild(scene);
  });

  document.getElementById('learn-grid-counter').textContent = learnCards.length + ' kaarti';
  document.getElementById('learn-grid').style.display = 'flex';
}

async function setGridProgress(cardId, color) {
  var card = learnCards.find(function(c) { return c._id === cardId; });
  if (!card) return;

  if (!card.progress) card.progress = {};
  card.progress[session.name] = color;

  var globalCard = cards.find(function(c) { return c._id === cardId; });
  if (globalCard) {
    if (!globalCard.progress) globalCard.progress = {};
    globalCard.progress[session.name] = color;
  }

  await apiPatch('/cards/' + cardId + '/progress', { name: session.name, color: color });

  // Update card class
  var cardEl = document.getElementById('grid-card-' + cardId);
  if (cardEl) {
    cardEl.className = 'card';
    if (color) cardEl.classList.add('prog-' + color);
  }

  // Update dots
  var dotsEl = cardEl && cardEl.querySelector('.grid-sem-dots');
  if (dotsEl) {
    var semDots = dotsEl.querySelectorAll('.sem-dot');
    semDots[0].classList.toggle('active', !color);
    semDots[1].classList.toggle('active', color === 'red');
    semDots[2].classList.toggle('active', color === 'yellow');
    semDots[3].classList.toggle('active', color === 'green');
  }
}

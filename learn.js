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
var learnActiveColors = [];

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

  learnActiveColors = [];
  if (filterNone) learnActiveColors.push(null);
  if (filterRed) learnActiveColors.push('red');
  if (filterYellow) learnActiveColors.push('yellow');
  if (filterGreen) learnActiveColors.push('green');

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

  apiPatch('/cards/' + card._id + '/progress', { name: session.name, color: color });

  // Check if this color is filtered out — if so, remove card immediately
  if (isFilteredOut(color)) {
    learnCards.splice(learnIdx, 1);
    if (!learnCards.length) {
      exitLearning();
      return;
    }
    if (learnIdx >= learnCards.length) learnIdx = learnCards.length - 1;
    renderLearnCard();
    renderLearnDots();
  } else {
    renderLearnCard();
    renderLearnDots();
    setTimeout(function() {
      if (learnIdx < learnCards.length - 1) learnNext();
    }, 300);
  }
}

function isFilteredOut(color) {
  return !learnActiveColors.includes(color);
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

    var wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    var inner = document.createElement('div');
    inner.className = 'card';
    inner.id = 'grid-card-' + card._id;

    var prog = card.progress && card.progress[session.name];
    if (prog) inner.classList.add('prog-' + prog);

    inner.appendChild(makeFace(card.s1 || {}, 1));
    inner.appendChild(makeFace(card.s2 || {}, 2));
    scene.appendChild(inner);

    var dots = document.createElement('div');
    dots.className = 'grid-sem-dots';
    dots.id = 'grid-dots-' + card._id;
    dots.innerHTML =
      '<div class="sem-dot sem-grey' + (!prog ? ' selected' : '') + '" onclick="setGridProgress(\'' + card._id + '\',null)"></div>' +
      '<div class="sem-dot sem-red' + (prog === 'red' ? ' selected' : '') + '" onclick="setGridProgress(\'' + card._id + '\',\'red\')"></div>' +
      '<div class="sem-dot sem-yellow' + (prog === 'yellow' ? ' selected' : '') + '" onclick="setGridProgress(\'' + card._id + '\',\'yellow\')"></div>' +
      '<div class="sem-dot sem-green' + (prog === 'green' ? ' selected' : '') + '" onclick="setGridProgress(\'' + card._id + '\',\'green\')"></div>';

    wrapper.appendChild(scene);
    wrapper.appendChild(dots);
    container.appendChild(wrapper);
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

  apiPatch('/cards/' + cardId + '/progress', { name: session.name, color: color });

  // If this color is filtered out, remove the card from the grid immediately
  if (isFilteredOut(color)) {
    var wrapper = document.getElementById('grid-dots-' + cardId);
    if (wrapper && wrapper.parentElement) wrapper.parentElement.remove();
    learnCards = learnCards.filter(function(c) { return c._id !== cardId; });
    document.getElementById('learn-grid-counter').textContent = learnCards.length + ' kaarti';
    return;
  }

  // Update card class
  var cardEl = document.getElementById('grid-card-' + cardId);
  if (cardEl) {
    cardEl.className = 'card';
    if (color) cardEl.classList.add('prog-' + color);
  }

  // Update dots
  var dotsEl = document.getElementById('grid-dots-' + cardId);
  if (dotsEl) {
    var semDots = dotsEl.querySelectorAll('.sem-dot');
    semDots[0].classList.toggle('selected', !color);
    semDots[1].classList.toggle('selected', color === 'red');
    semDots[2].classList.toggle('selected', color === 'yellow');
    semDots[3].classList.toggle('selected', color === 'green');
  }
}

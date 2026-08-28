export const t = {
  // App
  appName: "Flashcards",

  // Header
  navAdd: "✏️ Lisa",
  navLearn: "📖 Õpi",
  menuOpen: "Menüü",
  menuClose: "Sulge",
  menuFilters: "Filtrid",

  // User gate
  whoAreYou: "Kes sa oled?",
  switchUser: "Vaheta kasutajat",

  // Password gate
  passwordPrompt: "Sisesta parool",
  passwordPlaceholder: "Parool...",
  passwordWrong: "Vale parool",
  passwordSubmit: "Sisene",

  // Server loader
  loaderMsgs: [
    "🐌 Server ärkab üles...",
    "☕ Server joob kohvi...",
    "🦥 Server venib...",
    "🐢 Kõik head asjad võtavad aega...",
    "🧘 Server mediteerib...",
    "🌀 Bitid ja baidid veerevad...",
    "🐠 Server ujub kohale...",
    "🍵 Server keedab teed...",
    "🦔 Server siilub...",
    "🌙 Server oli uinunud, sorry...",
    "🚀 Käivitame mootorid...",
    "🧃 Server joob mahla...",
    "🐓 Server kireb...",
    "🎲 Heidame täringut...",
    "🌿 Server hingab värsket õhku...",
    "🐻 Karu ärkab talveunest...",
    "🎸 Server häälestab kitarri...",
    "🧩 Pusletükid lendavad paika...",
    "🌊 Lained uhuvad andmeid kohale...",
    "🦋 Server muutub liblikaks...",
    "🍕 Server sõi liiga palju pitsat...",
  ],
  loaderFailed: "Ühendus ebaõnnestus",
  serverError: "Serveriga ühendamine ebaõnnestus.",
  spinnerLoading: "Ühendan serveriga...",
  spinnerSlow:
    "Server ärkab üles — see on tasuta server, võib võtta kuni minuti. Palun oota.",

  // Subjects / topics
  labelSubject: "Aine",
  labelTopic: "Teema",
  placeholderSubject: "-- Vali aine --",
  placeholderTopic: "-- Vali teema --",
  placeholderNewSubject: "Uue aine nimi...",
  placeholderNewTopic: "Uue teema nimi...",
  allSubjects: "Kõik ained",
  allTopics: "Kõik teemad",
  filterSubject: "Filtreeri aine",
  filterTopic: "Filtreeri teema",
  addSubject: "Vali aine",
  addTopic: "Vali teema",

  // Welcome
  btnAddCards: "✏️ Lisa kaarte",
  btnLearn: "📖 Õpi",

  // Add page
  headingSaveUnder: "Salvestan teemasse",
  headingAddCard: "Lisa uus kaart",
  side1: "Külg 1 (ees)",
  side2: "Külg 2 (taga)",
  btnAddCard: "Lisa kaart",
  btnShuffle: "Sega kaardid",
  btnLearnShort: "Õpi",
  hintFlip: "Klõpsa kaardil, et pöörata",
  noCards: "Kaarte ei leitud.",
  confirmDelete: "Kustutan kaardi?",
  btnEdit: "Muuda",
  btnDelete: "Kustuta",
  validationSubject: "Palun vali teema.",
  validationTopic: "Palun vali alamteema.",
  validationTag: "Palun vali või lisa silt.",
  statusSaving: "Salvestan...",
  statusSaved: "Kaart lisatud!",
  newCardBanner:
    "Nimekiri ei refreshi automaatselt. Uue kaardi nägemiseks klõpsa 'Uuenda nimekirja' nupule.",
  toastCardAdded: [
    "✅ Õnnestus! Uus kaart on edukalt lisatud.",
    "🎉 Õnnestus! Kaart olemas! Aju tänab sind.",
    "🧠 Õnnestus! Üks kaart targem!",
    "📚 Õnnestus! Teadmised kasvavad.",
    "🚀 Õnnestus! Kaart läks lendu!",
    "🐣 Õnnestus! Uus kaart on maailmas!",
    "💪 Õnnestus! Kaart on kohal.",
    "🌱 Õnnestus! Väike kaart, suur samm.",
  ],
  btnRefreshList: "Uuenda nimekirja",
  statusError: "Viga: ",
  addNew: "+ Lisa uus",
  cardCount: (n: number) => `${n} kaarti`,

  // Mass move
  selectAll: "Vali kõik",
  moveSelected: (n: number) => `Tõsta valitud (${n})`,
  moveTitle: (n: number) => `Tõsta ${n} kaarti`,
  moveTargetSubject: "Sihtaine",
  moveTargetTopic: "Sihtteema",
  movePrefill: (names: string) => `Sildid ühiselt: ${names}`,
  moveNeedTarget: "Vali sihtaine ja -teema.",
  moveWorking: "Tõstan...",
  moveDone: (n: number) => `Tõstetud ${n} kaarti!`,
  moveConfirm: "Tõsta",

  // Bulk upload
  headingBulk: "Lisa sõnade nimekiri",
  bulkHint:
    "Üks kaart rea kohta. Eralda külg 1 ja külg 2 sidekriipsu ( - ) või kooloniga ( : ) — tühikud mõlemal pool. Külg 2 võib sisaldada mitut tähendust, nt: mustia - närbunud; kuivanud",
  bulkPromptLink: "kopeeri AI prompt",
  bulkPromptCopied: "Kopeeritud!",
  bulkPrompt:
    'Make me a list of flashcard word pairs. One pair per line, in the format "language 1 - language 2" (separated by " - ", a hyphen with a space on each side). If I did not specify the languages, use the topic\'s main language and Estonian. Give verbs in their basic (infinitive) form, not a conjugated form — e.g. "magama", not "magas". If a word has several meanings, put them all on side 2 separated by "; ". Do not add numbers, headings or any other text — only the lines. Give it to me as a downloadable .csv file.',
  bulkPlaceholder: "koer - dog\nkass - cat\nmustia - närbunud; kuivanud",
  bulkChooseFile: "📄 Vali fail (.txt / .csv)",
  bulkBtnAdd: "Lisa kaardid",
  bulkNoLines: "Lisa vähemalt üks rida.",
  bulkAdding: "Lisan kaarte...",
  bulkDone: (n: number) => `Lisatud ${n} kaarti!`,
  bulkPartial: (ok: number, fail: number) =>
    `Lisatud ${ok} kaarti, ${fail} ebaõnnestus.`,

  // Manage (rename / delete subjects, topics, tags) — desktop only
  manage: "✏️ Muuda nimetusi",
  manageHeading: "Muuda nimetusi",
  manageSubjects: "Ained",
  manageTopics: "Teemad",
  manageTags: "Sildid",
  manageRename: "Nimeta ümber",
  manageDelete: "Kustuta",
  manageSave: "Salvesta",
  manageDeleteBlockedSubject:
    "Aines on teemasid või kaarte — ei saa kustutada.",
  manageDeleteBlockedTopic: "Teemas on kaarte — ei saa kustutada.",
  manageDeleteBlockedTag: "Silt on kasutusel — ei saa kustutada.",
  manageDeleteConfirm: (name: string) => `Kustutan "${name}"?`,
  manageEmpty: "Vali aine ja teema, et hallata.",

  // Groups (auto-numbered per tag once a tag has > 15 cards)
  labelGroup: "Grupp",
  groups: "Grupid",
  groupDone: "tehtud",
  groupPickTag: "Vali silt",
  groupNoTags: "Selle teema kaartidel pole veel silte.",
  groupCardCount: (n: number) => `${n} kaarti`,
  groupMove: "Tõsta teise gruppi",
  groupThreshold: (n: number) =>
    `Grupid tekivad automaatselt, kui sildil on üle 15 kaardi (praegu ${n}).`,
  allGroups: "Kõik grupid",
  groupSize: "Grupi suurus",
  groupSizeOff: "grupid väljas",
  groupSizeN: (n: number) => `grupp: ${n}`,

  // Tags
  labelTags: "Sildid",
  placeholderTags: "kirjuta uus silt...",
  placeholderTagsNew: "+ uus silt",
  filterTags: "Filtreeri sildi järgi",
  allTags: "Kõik sildid",

  // Edit modal
  headingEditCard: "Muuda kaarti",
  btnSave: "Salvesta",
  btnCancel: "Tühista",
  labelSemafor: "Näita raskusastmeid",
  colorNull: "suva",
  colorRed: "raske",
  colorYellow: "6/7",
  colorGreen: "selge",

  // Card background
  cardBg: "Taust",

  // Learn page
  headingLearn: "Õpi",
  headingLearnSettings: "Õppimise vaate seaded",
  btnStart: "Alusta",
  btnBack: "Tagasi",
  btnSettings: "← Seaded",
  labelView: "Vaade",
  viewSingle: "Üks kaart korraga",
  viewGrid: "Kõik kaardid",
};

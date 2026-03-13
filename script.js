const state = {
  count: 6,
  groupALabel: "그룹 A",
  groupBLabel: "그룹 B",
  groupAItems: [],
  groupBItems: [],
  featuredBFlags: [],
  matches: [],
  isConfigured: false,
  isReady: false,
  revealStyle: "cinematic",
  teaseEnabled: false,
  revealTimerIds: [],
  overlayOpen: false,
  overlayPhase: "idle",
};

const configForm = document.querySelector("#config-form");
const itemsForm = document.querySelector("#items-form");
const inputsPanel = document.querySelector("#inputs-panel");
const enginePanel = document.querySelector("#engine-panel");
const itemsLock = document.querySelector("#items-lock");
const engineLock = document.querySelector("#engine-lock");
const groupAFields = document.querySelector("#group-a-fields");
const groupBFields = document.querySelector("#group-b-fields");
const groupATitle = document.querySelector("#group-a-title");
const groupBTitle = document.querySelector("#group-b-title");
const inputGuide = document.querySelector("#input-guide");
const buildEngineButton = document.querySelector("#build-engine");
const resetAllButton = document.querySelector("#reset-all");
const cinematicToggle = document.querySelector("#cinematic-toggle");
const teaseToggle = document.querySelector("#tease-toggle");
const engineContent = document.querySelector("#engine-content");
const engineStatus = document.querySelector("#engine-status");
const runMatchButton = document.querySelector("#run-match");
const rerollMatchButton = document.querySelector("#reroll-match");
const deckMain = document.querySelector(".deck-stack-main");


const tarotRevealBoard = document.querySelector("#tarot-reveal-board");
const resultPanel = document.querySelector("#result-panel");
const resultEmpty = document.querySelector("#result-empty");
const resultSummary = document.querySelector("#result-summary");
const resultTable = document.querySelector("#result-table");
const resultBody = resultTable.querySelector("tbody");
const resultHeadA = document.querySelector("#result-head-a");
const resultHeadB = document.querySelector("#result-head-b");
const cinemaOverlay = document.querySelector("#cinema-overlay");
const cinemaBoard = document.querySelector("#cinema-board");
const overlayStatus = document.querySelector("#overlay-status");
const overlayHint = document.querySelector("#overlay-hint");
const overlayCloseButton = document.querySelector("#overlay-close");

initialize();

function initialize() {
  configForm.addEventListener("submit", handleConfigSubmit);
  itemsForm.addEventListener("submit", handleItemsSubmit);
  runMatchButton.addEventListener("click", runMatching);
  rerollMatchButton.addEventListener("click", rerollMatching);
  resetAllButton.addEventListener("click", resetExperience);
  cinematicToggle.addEventListener("change", handleRevealStyleChange);
  teaseToggle.addEventListener("change", handleTeaseToggleChange);
  overlayCloseButton.addEventListener("click", closeOverlay);
  cinemaOverlay.addEventListener("click", handleOverlayClick);
  updateStageLocks();
  clearResults();
}

function handleConfigSubmit(event) {
  event.preventDefault();

  const formData = new FormData(configForm);
  const count = Number(formData.get("count"));
  const groupALabel = String(formData.get("groupALabel")).trim();
  const groupBLabel = String(formData.get("groupBLabel")).trim();

  if (!groupALabel || !groupBLabel || Number.isNaN(count) || count < 4 || count > 12) {
    inputGuide.textContent = "설정을 확인해 주세요.";
    return;
  }

  state.count = count;
  state.groupALabel = groupALabel;
  state.groupBLabel = groupBLabel;
  state.groupAItems = [];
  state.groupBItems = [];
  state.featuredBFlags = [];
  state.matches = [];
  state.isConfigured = true;
  state.isReady = false;

  groupATitle.textContent = groupALabel;
  groupBTitle.textContent = groupBLabel;
  inputGuide.textContent = `${groupALabel} ${count}개, ${groupBLabel} ${count}개를 입력해 주세요.`;
  createItemFields(count);
  clearResults();
  resetEngineView();
  updateStageLocks();
  buildEngineButton.disabled = false;
}

function handleItemsSubmit(event) {
  event.preventDefault();

  const groupAItems = [...groupAFields.querySelectorAll('input[type="text"]')].map((input) => input.value.trim());
  const groupBItems = [...groupBFields.querySelectorAll('input[type="text"]')].map((input) => input.value.trim());
  const featuredBFlags = [...groupBFields.querySelectorAll('input[type="checkbox"]')].map((input) => input.checked);

  if ([...groupAItems, ...groupBItems].some((value) => !value)) {
    inputGuide.textContent = "빈칸을 확인해 주세요.";
    return;
  }

  state.groupAItems = groupAItems;
  state.groupBItems = groupBItems;
  state.featuredBFlags = featuredBFlags;
  state.isReady = true;

  prepareMatching();
  clearResults();
  updateStageLocks();
}

function handleRevealStyleChange() {
  state.revealStyle = cinematicToggle.checked ? "cinematic" : "classic";
  if (!state.isReady) return;
  engineStatus.textContent = state.revealStyle === "cinematic" ? "시네마 오픈 준비 완료" : "기본 공개 준비 완료";
  clearResults();
}

function handleTeaseToggleChange() {
  state.teaseEnabled = teaseToggle.checked;
}

function prepareMatching() {
  clearAsyncState();
  state.matches = createMatches(state.groupAItems, state.groupBItems, state.featuredBFlags);
  renderDeckPreview();
  tarotRevealBoard.replaceChildren();
  engineStatus.textContent = "";
  engineContent.hidden = false;
  runMatchButton.disabled = false;
  rerollMatchButton.disabled = false;
}

function runMatching() {
  clearAsyncState();
  clearResults();
  closeOverlay({ silent: true });
  runMatchButton.disabled = true;
  rerollMatchButton.disabled = true;

  if (state.revealStyle === "cinematic") {
    runCinematicMode();
    return;
  }

  runClassicMode();
}

function runClassicMode() {
  engineStatus.textContent = "";
  tarotRevealBoard.replaceChildren();
  deckMain.classList.add("is-flipping");


  const flipTimer = window.setTimeout(() => {
    renderDeckBacks();
    deckMain.classList.remove("is-flipping");

    deckMain.classList.add("is-shuffling");

  }, 480);

  const revealTimer = window.setTimeout(() => {
    deckMain.classList.remove("is-shuffling");

    engineStatus.textContent = "";

    state.matches.forEach((match, index) => {
      const delay = match.featured ? 320 + index * 220 : index * 180;
      const timerId = window.setTimeout(() => {
        appendClassicPair(match, index);
        if (index === state.matches.length - 1) {
          finishRun("매칭 완료", { showTable: true });
        }
      }, delay);
      state.revealTimerIds.push(timerId);
    });
  }, 1280);

  state.revealTimerIds.push(flipTimer, revealTimer);
}

function runCinematicMode() {
  engineStatus.textContent = "";
  deckMain.classList.add("is-gathering");

  const timerId = window.setTimeout(() => {
    deckMain.classList.remove("is-gathering");
    renderDeckPreview();
    renderOverlayPairs();
    openOverlay();
    state.overlayPhase = "ready-a";
    overlayStatus.textContent = `${state.groupALabel} 공개`;
    overlayHint.textContent = "카드를 클릭해 계속합니다.";
    engineStatus.textContent = "";
    runMatchButton.disabled = false;
    rerollMatchButton.disabled = false;
  }, 760);

  state.revealTimerIds.push(timerId);
}

function rerollMatching() {
  if (!state.isReady) return;

  clearAsyncState();
  clearResults();
  closeOverlay({ silent: true });
  runMatchButton.disabled = true;
  rerollMatchButton.disabled = true;
  engineStatus.textContent = "";
  tarotRevealBoard.replaceChildren();
  renderDeckBacks();
  deckMain.classList.add("is-rerolling");


  const timerId = window.setTimeout(() => {
    deckMain.classList.remove("is-rerolling");

    prepareMatching();
  }, 760);

  state.revealTimerIds.push(timerId);
}

function handleOverlayClick(event) {
  if (!state.overlayOpen) return;

  const clickedBoard = event.target.closest("#cinema-board");
  const clickedTile = event.target.closest(".cinema-tile");
  const clickedBackdrop = event.target.hasAttribute("data-close-overlay");

  if (clickedBackdrop && state.overlayPhase === "complete") {
    closeOverlay();
    return;
  }

  if (!clickedBoard && !clickedTile) return;

  if (state.overlayPhase === "ready-a") {
    revealOverlaySide("left", () => {
      state.overlayPhase = "ready-b";
      overlayStatus.textContent = `${state.groupBLabel} 공개`;
      overlayHint.textContent = "카드를 한 번 더 클릭해 계속합니다.";
    });
    return;
  }

  if (state.overlayPhase === "ready-b") {
    if (state.teaseEnabled) {
      runTeaseBeforeReveal(completeCinematicReveal);
    } else {
      revealOverlaySide("right", completeCinematicReveal);
    }
  }
}

function openOverlay() {
  state.overlayOpen = true;
  cinemaOverlay.hidden = false;
  cinemaBoard.classList.add("is-clickable");
  cinemaBoard.classList.remove("is-finale", "is-teasing");
  document.body.classList.add("has-overlay");
}

function closeOverlay(options = {}) {
  const { silent = false } = options;
  state.overlayOpen = false;
  state.overlayPhase = "idle";
  cinemaOverlay.hidden = true;
  cinemaBoard.classList.remove("is-clickable", "is-finale", "is-teasing");
  document.body.classList.remove("has-overlay");
  if (!silent && state.isReady) {
    engineStatus.textContent = "";
  }
}

function completeCinematicReveal() {
  state.overlayPhase = "complete";
  cinemaBoard.classList.add("is-finale");
  overlayStatus.textContent = "모든 카드가 열렸습니다.";
  overlayHint.textContent = "";
  finishRun("매칭 완료", { showTable: true });
}

function createItemFields(count) {
  groupAFields.replaceChildren();
  groupBFields.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    groupAFields.appendChild(createInputField(index + 1, "groupAItems", index, false));
    groupBFields.appendChild(createInputField(index + 1, "groupBItems", index, true));
  }
}

function createInputField(number, name, index, allowFeatured = false) {
  const wrapper = document.createElement("div");
  const badge = document.createElement("span");
  const input = document.createElement("input");

  wrapper.className = "item-field";
  badge.className = "item-index";
  badge.textContent = String(number);
  input.name = `${name}-${index}`;
  input.type = "text";
  input.required = true;
  input.maxLength = 24;
  wrapper.append(badge, input);

  if (allowFeatured) {
    const featuredLabel = document.createElement("label");
    const featuredInput = document.createElement("input");
    const featuredText = document.createElement("span");

    featuredLabel.className = "feature-chip";
    featuredInput.type = "checkbox";
    featuredInput.name = `${name}-featured-${index}`;
    featuredText.textContent = "당첨";
    featuredLabel.append(featuredInput, featuredText);
    wrapper.appendChild(featuredLabel);
  }

  return wrapper;
}

function createMatches(groupAItems, groupBItems, featuredBFlags = []) {
  const shuffledA = shuffle([...groupAItems]);
  const groupBEntries = groupBItems.map((value, index) => ({
    value,
    featured: Boolean(featuredBFlags[index]),
  }));
  const shuffledB = shuffle([...groupBEntries]);

  return shuffledA.map((left, index) => ({
    left,
    right: shuffledB[index].value,
    featured: shuffledB[index].featured,
  }));
}

function renderDeckPreview() {
  const previewItems = state.matches.map((match) => `${match.left} · ${match.right}`);
  renderDeckStack(deckMain, previewItems, false);
}

function renderDeckBacks() {
  renderDeckStack(deckMain, ["", "", "", ""], false, true);
}

function renderDeckStack(target, items, isAlt, useBackOnly = false) {
  target.replaceChildren();
  const previewItems = useBackOnly ? items : items.slice(0, Math.min(items.length, 6));
  const cardsToRender = previewItems.length ? previewItems : ["", "", "", ""];
  const scatterPositions = [
    { x: -76, y: -28, r: -18 },
    { x: 62, y: -40, r: 14 },
    { x: -18, y: 18, r: -6 },
    { x: 86, y: 26, r: 22 },
    { x: -96, y: 52, r: -24 },
    { x: 24, y: -68, r: 7 },
  ];

  cardsToRender.forEach((item, index) => {
    const card = document.createElement("div");
    const scatter = scatterPositions[index % scatterPositions.length];
    card.className = `deck-card ${useBackOnly ? "deck-card-back" : "deck-card-front"}`;
    card.style.setProperty("--scatter-x", `${scatter.x}px`);
    card.style.setProperty("--scatter-y", `${scatter.y}px`);
    card.style.setProperty("--scatter-r", `${scatter.r}deg`);
    card.style.zIndex = String(index + 1);
    if (isAlt) card.classList.add("alt");
    if (!useBackOnly) {
      card.appendChild(createTarotFace(item, isAlt));
    }
    target.appendChild(card);
  });
}

function createTarotFace(text, isAlt) {
  const face = document.createElement("div");
  const mark = document.createElement("div");
  const topLine = document.createElement("div");
  const title = document.createElement("div");
  const bottomLine = document.createElement("div");

  face.className = "deck-card-label";
  mark.className = "deck-card-mark";
  topLine.className = "deck-card-line";
  title.className = "deck-card-title";
  bottomLine.className = "deck-card-line";

  mark.textContent = isAlt ? state.groupBLabel : state.groupALabel;
  title.textContent = text;

  face.append(mark, topLine, title, bottomLine);
  return face;
}

function appendClassicPair(match, index) {
  const tile = document.createElement("div");
  const stack = document.createElement("div");
  const leftCard = buildFlipCard(match.left, false, true);
  const rightCard = buildFlipCard(match.right, true, true);

  tile.className = `cinema-tile reveal-tile ${match.featured ? "is-featured" : ""}`.trim();
  tile.style.animationDelay = `${Math.min(index * 45, 180)}ms`;
  stack.className = "cinema-stack";
  leftCard.classList.add("stack-card", "stack-card-left");
  rightCard.classList.add("stack-card", "stack-card-right");

  stack.append(leftCard, rightCard);
  tile.append(stack);
  tarotRevealBoard.appendChild(tile);
}

function renderOverlayPairs() {
  cinemaBoard.replaceChildren();
  state.matches.forEach((match, index) => {
    const tile = document.createElement("div");
    const card = document.createElement("div");
    const topHalf = buildHalfReveal(match.left, state.groupALabel, false, "left", "top");
    const divider = document.createElement("div");
    const bottomHalf = buildHalfReveal(match.right, state.groupBLabel, true, "right", "bottom");

    tile.className = "cinema-tile cinema-single-tile";
    tile.dataset.index = String(index);
    if (match.featured) {
      tile.dataset.featured = "true";
    }
    card.className = "cinema-half-card";
    divider.className = "cinema-half-divider";

    card.append(topHalf, divider, bottomHalf);
    tile.append(card);
    cinemaBoard.appendChild(tile);
  });
}

function buildHalfReveal(text, label, isAlt, side, position) {
  const wrapper = document.createElement("div");
  const inner = document.createElement("div");
  const back = document.createElement("div");
  const front = document.createElement("div");
  const meta = document.createElement("div");
  const title = document.createElement("div");

  wrapper.className = `half-reveal ${position}`;
  wrapper.dataset.side = side;
  inner.className = "half-reveal-inner";
  back.className = `half-face half-back ${isAlt ? "alt" : ""}`.trim();
  front.className = `half-face half-front ${isAlt ? "alt" : ""}`.trim();
  meta.className = "half-label";
  title.className = "half-title";

  meta.textContent = label;
  title.textContent = text;
  front.append(meta, title);
  inner.append(back, front);
  wrapper.appendChild(inner);
  return wrapper;
}

function buildFlipCard(text, isAlt, revealed) {
  const card = document.createElement("div");
  const inner = document.createElement("div");
  const back = document.createElement("div");
  const front = document.createElement("div");

  card.className = `flip-card ${revealed ? "is-revealed" : ""}`.trim();
  inner.className = "flip-card-inner";
  back.className = `flip-card-face flip-card-back ${isAlt ? "alt" : ""}`.trim();
  front.className = `flip-card-face flip-card-front ${isAlt ? "alt" : ""}`.trim();
  front.appendChild(createTarotFace(text, isAlt));
  inner.append(back, front);
  card.appendChild(inner);
  return card;
}

function revealOverlaySide(side, onComplete) {
  const allHalves = [...cinemaBoard.querySelectorAll(`.half-reveal[data-side="${side}"]`)];

  allHalves.forEach((half, index) => {
    const tile = half.closest(".cinema-single-tile");
    const isFeatured = Boolean(tile?.dataset.featured);
    const timerId = window.setTimeout(() => {
      half.classList.add("is-revealed");
      if (side === "right" && isFeatured && tile) {
        tile.classList.add("is-featured-final");
      }
      if (index === allHalves.length - 1 && typeof onComplete === "function") {
        onComplete();
      }
    }, index * 110);
    state.revealTimerIds.push(timerId);
  });
}

function runTeaseBeforeReveal(onComplete) {
  const allHalves = [...cinemaBoard.querySelectorAll('.half-reveal[data-side="right"]')];
  cinemaBoard.classList.add("is-teasing");
  overlayStatus.textContent = "마지막 공개 준비 중";
  overlayHint.textContent = "";

  let startDelay = 0;

  allHalves.forEach((half, index) => {
    const tile = half.closest(".cinema-single-tile");
    const isFeatured = Boolean(tile?.dataset.featured);
    const teaseDuration = Math.max(420, 1500 - index * 220);
    const nextDelay = Math.max(220, Math.floor(teaseDuration * 0.55));
    half.style.setProperty("--tease-duration", `${teaseDuration}ms`);

    const teaseTimer = window.setTimeout(() => {
      half.classList.add("is-teasing");
    }, startDelay);

    const revealTimer = window.setTimeout(() => {
      half.classList.remove("is-teasing");
      half.classList.add("is-revealed");
      if (isFeatured && tile) {
        tile.classList.add("is-featured-final");
      }
      if (index === allHalves.length - 1) {
        cinemaBoard.classList.remove("is-teasing");
        onComplete();
      }
    }, startDelay + teaseDuration);

    state.revealTimerIds.push(teaseTimer, revealTimer);
    startDelay += nextDelay;
  });
}

function renderResults() {
  resultBody.replaceChildren();
  resultHeadA.textContent = state.groupALabel;
  resultHeadB.textContent = state.groupBLabel;

  state.matches.forEach(({ left, right, featured }) => {
    const row = document.createElement("tr");
    const leftCell = document.createElement("td");
    const rightCell = document.createElement("td");

    leftCell.textContent = left;
    rightCell.textContent = right;
    if (featured) {
      row.classList.add("is-featured-row");
    }
    row.append(leftCell, rightCell);
    resultBody.appendChild(row);
  });

  const featuredCount = state.matches.filter((match) => match.featured).length;
  resultSummary.textContent = featuredCount > 0
    ? `${state.groupALabel} ${state.count}개 · ${state.groupBLabel} ${state.count}개 · 당첨 ${featuredCount}개`
    : `${state.groupALabel} ${state.count}개 · ${state.groupBLabel} ${state.count}개`;
}

function finishRun(statusText, options = {}) {
  const { showTable } = options;
  renderResults();
  resultEmpty.hidden = true;
  resultSummary.hidden = !showTable;
  resultTable.hidden = !showTable;
  resultPanel.hidden = !showTable;
  resultPanel.classList.remove("is-revealed");
  if (showTable) {
    void resultPanel.offsetWidth;
    resultPanel.classList.add("is-revealed");
  }
  engineStatus.textContent = "";
  runMatchButton.disabled = false;
  rerollMatchButton.disabled = false;
}

function clearResults() {
  resultBody.replaceChildren();
  resultEmpty.hidden = false;
  resultSummary.hidden = true;
  resultTable.hidden = true;
  resultSummary.textContent = "";
  resultPanel.hidden = state.revealStyle === "cinematic";
  resultPanel.classList.remove("is-revealed");
}

function resetEngineView() {
  clearAsyncState();
  tarotRevealBoard.replaceChildren();
  deckMain.replaceChildren();

  engineContent.hidden = true;
  engineStatus.textContent = "";
  runMatchButton.disabled = true;
  rerollMatchButton.disabled = true;
}

function resetExperience() {
  clearAsyncState();
  state.groupAItems = [];
  state.groupBItems = [];
  state.featuredBFlags = [];
  state.matches = [];
  state.isConfigured = false;
  state.isReady = false;
  createItemFields(0);
  inputGuide.textContent = "설정을 먼저 완료해 주세요.";
  clearResults();
  closeOverlay({ silent: true });
  resetEngineView();
  updateStageLocks();
}

function updateStageLocks() {
  itemsForm.hidden = !state.isConfigured;
  itemsLock.hidden = state.isConfigured;
  inputsPanel.classList.toggle("is-locked", !state.isConfigured);
  engineContent.hidden = !state.isReady;
  engineLock.hidden = state.isReady;
  enginePanel.classList.toggle("is-locked", !state.isReady);
}

function clearAsyncState() {
  state.revealTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  state.revealTimerIds = [];
  cinemaBoard.classList.remove("is-teasing", "is-finale");
  cinemaBoard.querySelectorAll(".half-reveal").forEach((half) => half.classList.remove("is-teasing", "is-revealed"));
  cinemaBoard.querySelectorAll(".cinema-single-tile").forEach((tile) => tile.classList.remove("is-featured-final"));
  deckMain.classList.remove("is-shuffling", "is-rerolling", "is-flipping", "is-gathering");

}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}













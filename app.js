/* ═══════════════════════════════════════════
   app.js – Event wiring & initialization
   ═══════════════════════════════════════════ */

let currentPeriod  = 'daily';
let editingQuest   = null;
let progressTarget = null;
let timerInterval  = null;

/* ══════════════════════════════
   BOOT
══════════════════════════════ */
function boot() {
  showOnboardingIfNeeded();

  const state = loadState();
  renderHUD(state);
  renderQuestList('daily',   state.quests.daily,   state);
  renderQuestList('weekly',  state.quests.weekly,  state);
  renderQuestList('monthly', state.quests.monthly, state);
  renderRewards(state);
  wireEvents();

  /* تایمر: هر دقیقه کارت‌ها رو آپدیت می‌کنه */
  timerInterval = setInterval(() => {
    const s = loadState();
    renderQuestList('daily',   s.quests.daily,   s);
    renderQuestList('weekly',  s.quests.weekly,  s);
    renderQuestList('monthly', s.quests.monthly, s);
  }, 60 * 1000);
}

/* ── Onboarding ── */
function showOnboardingIfNeeded() {
  const seen = localStorage.getItem(ONBOARD_KEY);
  if (!seen) {
    openModal('onboardingModal');
  }
}

/* ══════════════════════════════
   WIRE EVENTS
══════════════════════════════ */
function wireEvents() {

  /* onboarding start */
  document.getElementById('onboardingStartBtn').addEventListener('click', () => {
    localStorage.setItem(ONBOARD_KEY, '1');
    closeModal('onboardingModal');
  });

  /* ── TABS ── */
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('panel--active'));
      btn.classList.add('tab--active');
      const key = btn.dataset.tab;
      document.getElementById('tab-' + key).classList.add('panel--active');
      currentPeriod = key;
    });
  });

  /* ── ADD BUTTONS ── */
  ['daily','weekly','monthly'].forEach(p => {
    document.getElementById('add' + capitalize(p) + 'Btn')
      .addEventListener('click', () => openAddModal(p));
  });

  /* ── QUEST MODAL ── */
  document.getElementById('modalClose').addEventListener('click',     closeQuestModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeQuestModal);
  document.getElementById('questModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeQuestModal();
  });
  document.getElementById('modalSaveBtn').addEventListener('click', handleQuestSave);
  document.getElementById('questPriorityInput').addEventListener('change', e => {
    updateRewardPreview(currentPeriod, e.target.value);
  });

  /* ── PROGRESS MODAL ── */
  document.getElementById('progressClose').addEventListener('click',     () => closeModal('progressModal'));
  document.getElementById('progressCancelBtn').addEventListener('click', () => closeModal('progressModal'));
  document.getElementById('progressModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('progressModal');
  });
  document.getElementById('progressSlider').addEventListener('input', e => {
    document.getElementById('progressSliderVal').textContent = e.target.value + '%';
  });
  document.getElementById('progressSaveBtn').addEventListener('click', handleProgressSave);

  /* ── CARD ACTIONS (delegation) ── */
  ['dailyList','weeklyList','monthlyList'].forEach(id => {
    document.getElementById(id).addEventListener('click', handleCardAction);
  });
}

/* ══════════════════════════════
   HANDLERS
══════════════════════════════ */
function openAddModal(period) {
  editingQuest  = null;
  currentPeriod = period;

  const state = loadState();
  const { remaining, slots } = getSlotInfo(state, period);
  if (remaining <= 0) {
    showToast(`🔒 اسلات پُره! لول بگیر تا ${slots + 1} اسلات داشته باشی`);
    return;
  }

  document.getElementById('modalTitle').textContent   = 'کوئست جدید';
  document.getElementById('questTitleInput').value    = '';
  document.getElementById('questDescInput').value     = '';
  document.getElementById('questPriorityInput').value = 'mid';
  updateRewardPreview(period, 'mid');
  openModal('questModal');
}

function openEditModal(period, quest) {
  editingQuest  = { period, id: quest.id };
  currentPeriod = period;
  document.getElementById('modalTitle').textContent   = 'ویرایش کوئست';
  document.getElementById('questTitleInput').value    = quest.title;
  document.getElementById('questDescInput').value     = quest.desc || '';
  document.getElementById('questPriorityInput').value = quest.priority;
  updateRewardPreview(period, quest.priority);
  openModal('questModal');
}

function closeQuestModal() {
  closeModal('questModal');
  editingQuest = null;
}

function handleQuestSave() {
  const title = document.getElementById('questTitleInput').value.trim();
  if (!title) { showToast('❗ نام کوئست نمیتونه خالی باشه'); return; }

  const fields = {
    title,
    desc:     document.getElementById('questDescInput').value.trim(),
    priority: document.getElementById('questPriorityInput').value,
  };

  if (editingQuest) {
    const state = updateQuest(editingQuest.period, editingQuest.id, fields);
    if (state) refreshAll(state);
    showToast('✅ کوئست ویرایش شد');
  } else {
    const { state, quest, limitReached, slots } = createQuest({ ...fields, period: currentPeriod });
    if (limitReached) {
      showToast(`🔒 اسلات پُره! با لول بالاتر ${slots + 1} اسلات داری`);
      return;
    }
    refreshAll(state);
    showToast(`✨ کوئست اضافه شد — ${quest.xp} XP در انتظارته!`);
  }
  closeQuestModal();
}

function handleCardAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;

  const card   = btn.closest('.quest-card');
  const period = card.dataset.period;
  const id     = Number(card.dataset.id);
  const action = btn.dataset.action;

  if (action === 'complete') {
    const { state, leveled, newLevel, earnedXp } = completeQuest(period, id);
    refreshAll(state);
    showToast(`🎉 آفرین! +${earnedXp} XP گرفتی`);
    if (leveled) setTimeout(() => showLevelUp(newLevel), 400);
    return;
  }

  if (action === 'progress') {
    const state = loadState();
    const quest = getQuestById(state, period, id);
    if (!quest) return;
    progressTarget = { period, id };
    document.getElementById('progressQuestName').textContent = quest.title;
    document.getElementById('progressSlider').value          = quest.progress;
    document.getElementById('progressSliderVal').textContent = quest.progress + '%';
    openModal('progressModal');
    return;
  }

  if (action === 'edit') {
    const state = loadState();
    const quest = getQuestById(state, period, id);
    if (quest) openEditModal(period, quest);
    return;
  }

  if (action === 'delete') {
    if (!confirm('این کوئست حذف بشه؟')) return;
    const state = deleteQuest(period, id);
    refreshAll(state);
    showToast('🗑️ کوئست حذف شد');
  }
}

function handleProgressSave() {
  if (!progressTarget) return;
  const pct = Number(document.getElementById('progressSlider').value);

  if (pct === 100) {
    const { state, leveled, newLevel, earnedXp } = completeQuest(progressTarget.period, progressTarget.id);
    refreshAll(state);
    showToast(`🎉 کوئست تموم شد! +${earnedXp} XP`);
    if (leveled) setTimeout(() => showLevelUp(newLevel), 400);
  } else {
    const state = setProgress(progressTarget.period, progressTarget.id, pct);
    if (state) { refreshAll(state); showToast(`📊 پیشرفت ثبت شد: ${pct}%`); }
  }
  closeModal('progressModal');
  progressTarget = null;
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function refreshAll(state) {
  renderHUD(state);
  renderQuestList('daily',   state.quests.daily,   state);
  renderQuestList('weekly',  state.quests.weekly,  state);
  renderQuestList('monthly', state.quests.monthly, state);
  renderRewards(state);
}

function getQuestById(state, period, id) {
  return state.quests[period]?.find(q => q.id === id) || null;
}

document.addEventListener('DOMContentLoaded', boot);

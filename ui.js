/* ═══════════════════════════════════════════
   ui.js – DOM rendering helpers
   ═══════════════════════════════════════════ */

/* ── HUD ── */
function renderHUD(state) {
  const { player } = state;
  const needed = XP_PER_LEVEL(player.level);
  const pct    = Math.min(100, Math.round((player.xp / needed) * 100));

  document.getElementById('playerName').textContent  = player.name;
  document.getElementById('playerLevel').textContent = player.level;
  document.getElementById('xpBar').style.width       = pct + '%';
  document.getElementById('xpText').textContent      = `${player.xp} / ${needed} XP`;
  document.getElementById('statCoins').textContent   = player.coins;
  document.getElementById('statDone').textContent    = player.totalDone;
  document.getElementById('statStreak').textContent  = player.streak;

  const avatars = ['🧙','⚔️','🛡️','🦅','🐲','👑'];
  document.getElementById('avatarDisplay').textContent =
    avatars[Math.min(Math.floor(player.level / 5), avatars.length - 1)];
}

/* ── SLOT INFO ── */
function renderSlotInfo(state, period) {
  const el = document.getElementById('slotInfo' + capitalize(period));
  if (!el) return;
  const { slots, active } = getSlotInfo(state, period);
  const remaining = slots - active;
  el.innerHTML = `
    <span class="slot-used">${active}</span>
    <span class="slot-sep">/</span>
    <span class="slot-total">${slots}</span>
    <span class="slot-label">اسلات فعال</span>
    ${remaining === 0 ? '<span class="slot-full">لول بالاتر = اسلات بیشتر 🔒</span>' : ''}
  `;
}

/* ── QUEST LIST ── */
function renderQuestList(period, quests, state) {
  const container = document.getElementById(period + 'List');
  if (!container) return;
  renderSlotInfo(state, period);

  if (!quests.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__text">هنوز کوئستی نداری! یکی اضافه کن.</div>
      </div>`;
    return;
  }
  container.innerHTML = quests.map(q => questCardHTML(period, q)).join('');
}

function questCardHTML(period, q) {
  const fillClass    = q.done ? 'quest-card__progress-fill done' : 'quest-card__progress-fill';
  const doneClass    = q.done ? 'quest-card--done' : '';
  const disabledAttr = q.done ? 'disabled' : '';

  return `
  <div class="quest-card ${doneClass}" data-priority="${q.priority}" data-id="${q.id}" data-period="${period}">
    <div class="quest-card__top">
      <div class="quest-card__meta">
        <div class="quest-card__title">${escHtml(q.title)}</div>
        ${q.desc ? `<div class="quest-card__desc">${escHtml(q.desc)}</div>` : ''}
      </div>
      <div class="quest-card__badges">
        <span class="badge badge--xp">⚡ ${q.xp} XP</span>
        <span class="badge badge--coin">💎 ${q.coins}</span>
      </div>
    </div>

    <div class="quest-card__progress-wrap">
      <div class="quest-card__progress-label">
        <span>پیشرفت</span>
        <span>${q.progress}%</span>
      </div>
      <div class="quest-card__progress-bar">
        <div class="${fillClass}" style="width:${q.progress}%"></div>
      </div>
    </div>

    <div class="quest-card__actions">
      <button class="btn-action btn-action--progress" data-action="progress" ${disabledAttr}>📊 پیشرفت</button>
      <button class="btn-action btn-action--complete" data-action="complete" ${disabledAttr}>✅ کامل شد</button>
      <button class="btn-action btn-action--edit"     data-action="edit">✏️ ویرایش</button>
      <button class="btn-action btn-action--delete"   data-action="delete">🗑️ حذف</button>
    </div>
  </div>`;
}

/* ── REWARDS ── */
function renderRewards(state) {
  const { player } = state;
  const container  = document.getElementById('rewardsGrid');
  if (!container) return;

  container.innerHTML = REWARDS.map(r => {
    const isUnlocked = isRewardUnlocked(r, player);
    const progress   = getRewardProgress(r, player);   // { current, needed, label }
    const cls        = isUnlocked ? 'reward-card--unlocked' : 'reward-card--locked';
    const pct        = Math.min(100, Math.round((progress.current / progress.needed) * 100));

    const progressBar = isUnlocked ? '' : `
      <div class="reward-progress">
        <div class="reward-progress__labels">
          <span>${progress.label}</span>
          <span>${progress.current} / ${progress.needed}</span>
        </div>
        <div class="reward-progress__bar">
          <div class="reward-progress__fill" style="width:${pct}%"></div>
        </div>
        <div class="reward-progress__remaining">${progress.needed - progress.current} مانده</div>
      </div>`;

    const prizeBox = `
      <div class="reward-prize ${isUnlocked ? 'reward-prize--unlocked' : ''}">
        <span class="reward-prize__icon">${r.prizeIcon}</span>
        <span class="reward-prize__text">${r.prize}</span>
      </div>`;

    return `
      <div class="reward-card ${cls}">
        ${isUnlocked ? '<div class="reward-card__shimmer"></div>' : ''}
        <div class="reward-card__icon">${r.icon}</div>
        <div class="reward-card__name">${r.name}</div>
        <div class="reward-card__req">${r.req}</div>
        ${prizeBox}
        ${progressBar}
        <div class="reward-card__status">${isUnlocked ? '✨ باز شده' : '🔒 قفل'}</div>
      </div>`;
  }).join('');
}

/* ── reward helpers ── */
function isRewardUnlocked(r, player) {
  if (r.level && player.level      >= r.level) return true;
  if (r.tasks && player.totalDone  >= r.tasks) return true;
  if (r.coins && player.coins      >= r.coins) return true;
  return false;
}

function getRewardProgress(r, player) {
  if (r.level) return { current: player.level,     needed: r.level, label: '🏅 لول' };
  if (r.tasks) return { current: player.totalDone, needed: r.tasks, label: '✅ کوئست' };
  if (r.coins) return { current: player.coins,     needed: r.coins, label: '💎 سکه' };
  return { current: 0, needed: 1, label: '' };
}

/* ── LEVEL-UP BANNER ── */
function showLevelUp(level) {
  const banner = document.getElementById('levelupBanner');
  document.getElementById('levelupNum').textContent = level;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 2800);
}

/* ── MODAL: reward preview ── */
function updateRewardPreview(period, priority) {
  const xp    = AUTO_XP[period][priority]    || 0;
  const coins = AUTO_COINS[period][priority] || 0;
  document.getElementById('previewXp').textContent    = `⚡ ${xp} XP`;
  document.getElementById('previewCoins').textContent = `💎 ${coins} سکه`;
}

/* ── TOAST ── */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

/* ── MODAL helpers ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ── util ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

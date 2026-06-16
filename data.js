/* ═══════════════════════════════════════════
   data.js – State management & persistence
   ═══════════════════════════════════════════ */

const STORAGE_KEY = 'questlog_v1';

/* ── Quest slot limits per period per level ──
   daily:   lv1→3  lv3→4  lv5→5  lv8→6  lv12→7  lv17→8  (سقف 8)
   weekly:  lv1→2  lv4→3  lv8→4  lv13→5  lv18→6  (سقف 6)
   monthly: lv1→1  lv5→2  lv10→3  lv16→4  (سقف 4)          */
const QUEST_SLOTS = {
  daily:   (lv) => lv >= 17 ? 8 : lv >= 12 ? 7 : lv >= 8 ? 6 : lv >= 5 ? 5 : lv >= 3 ? 4 : 3,
  weekly:  (lv) => lv >= 18 ? 6 : lv >= 13 ? 5 : lv >= 8 ? 4 : lv >= 4 ? 3 : 2,
  monthly: (lv) => lv >= 16 ? 4 : lv >= 10 ? 3 : lv >= 5 ? 2 : 1,
};

/* ── XP needed to reach NEXT level ──
   lv1→2: 80   lv2→3: 104   lv3→4: 135 ...
   ضریب 1.3 — نه خیلی سخت، نه خیلی راحت        */
const XP_PER_LEVEL = (lv) => Math.floor(80 * Math.pow(1.3, lv - 1));

/* ── Auto XP per priority + period ── (کاربر نمی‌تونه دستی وارد کنه) */
const AUTO_XP = {
  daily:   { low: 15,  mid: 25,  high: 40  },
  weekly:  { low: 40,  mid: 65,  high: 100 },
  monthly: { low: 90,  mid: 140, high: 200 },
};
const AUTO_COINS = {
  daily:   { low: 3,  mid: 6,  high: 10 },
  weekly:  { low: 8,  mid: 15, high: 25 },
  monthly: { low: 18, mid: 30, high: 50 },
};

const REWARDS = [
  {
    id: 'r1', icon: '🗡️', name: 'شمشیر مبتدی',
    req: 'لول 2', level: 2,
    prize: '+1 اسلات روزانه',
    prizeIcon: '📅',
    slotBonus: { period: 'daily', note: 'اسلات چهارم روزانه باز میشه' },
  },
  {
    id: 'r2', icon: '🛡️', name: 'سپر آهنین',
    req: 'لول 4', level: 4,
    prize: '+1 اسلات هفتگی',
    prizeIcon: '📆',
    slotBonus: { period: 'weekly', note: 'اسلات سوم هفتگی باز میشه' },
  },
  {
    id: 'r3', icon: '🧙', name: 'جادوگر کوچک',
    req: 'لول 5', level: 5,
    prize: '+1 اسلات ماهانه',
    prizeIcon: '🗓️',
    slotBonus: { period: 'monthly', note: 'اسلات دوم ماهانه باز میشه' },
  },
  {
    id: 'r4', icon: '⚡', name: 'صاعقه',
    req: 'لول 8', level: 8,
    prize: '+1 اسلات روزانه',
    prizeIcon: '📅',
    slotBonus: { period: 'daily', note: 'اسلات پنجم روزانه باز میشه' },
  },
  {
    id: 'r5', icon: '🏆', name: 'قهرمان دره',
    req: 'لول 10', level: 10,
    prize: '+1 اسلات هفتگی',
    prizeIcon: '📆',
    slotBonus: { period: 'weekly', note: 'اسلات چهارم هفتگی باز میشه' },
  },
  {
    id: 'r6', icon: '🔥', name: 'آتش‌بازی',
    req: '20 کوئست', tasks: 20,
    prize: '+1 اسلات روزانه',
    prizeIcon: '📅',
    slotBonus: { period: 'daily', note: 'اسلات ششم روزانه باز میشه' },
  },
  {
    id: 'r7', icon: '💎', name: 'الماس خالص',
    req: '100 سکه', coins: 100,
    prize: '+1 اسلات ماهانه',
    prizeIcon: '🗓️',
    slotBonus: { period: 'monthly', note: 'اسلات سوم ماهانه باز میشه' },
  },
  {
    id: 'r8', icon: '🌟', name: 'ستاره طلایی',
    req: 'لول 13', level: 13,
    prize: '+1 اسلات هفتگی',
    prizeIcon: '📆',
    slotBonus: { period: 'weekly', note: 'اسلات پنجم هفتگی باز میشه' },
  },
  {
    id: 'r9', icon: '👑', name: 'تاج پادشاهی',
    req: 'لول 16', level: 16,
    prize: '+1 اسلات ماهانه',
    prizeIcon: '🗓️',
    slotBonus: { period: 'monthly', note: 'اسلات چهارم ماهانه باز میشه' },
  },
  {
    id: 'r10', icon: '🐉', name: 'تسخیر اژدها',
    req: 'لول 20', level: 20,
    prize: '+1 اسلات هفتگی',
    prizeIcon: '📆',
    slotBonus: { period: 'weekly', note: 'اسلات ششم هفتگی باز میشه' },
  },
];

/* ══════════════════════════════
   CORE STATE
══════════════════════════════ */
function defaultState() {
  return {
    player: { name: 'ماجراجو', level: 1, xp: 0, coins: 0, totalDone: 0, streak: 0 },
    quests: { daily: [], weekly: [], monthly: [] },
    nextId: 1,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch { return defaultState(); }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ══════════════════════════════
   QUEST CRUD
══════════════════════════════ */
function createQuest({ title, desc, priority, period }) {
  const state = loadState();
  const slots = QUEST_SLOTS[period](state.player.level);
  const active = state.quests[period].filter(q => !q.done).length;

  if (active >= slots) {
    return { state, quest: null, limitReached: true, slots };
  }

  const p = priority || 'mid';
  const quest = {
    id: state.nextId++,
    title,
    desc: desc || '',
    priority: p,
    xp:    AUTO_XP[period][p],
    coins: AUTO_COINS[period][p],
    progress: 0,
    done: false,
    createdAt: Date.now(),
  };

  state.quests[period].push(quest);
  saveState(state);
  return { state, quest, limitReached: false };
}

function updateQuest(period, id, fields) {
  const state = loadState();
  const list  = state.quests[period];
  const idx   = list.findIndex(q => q.id === id);
  if (idx === -1) return null;

  // اگه priority عوض شده XP/coin رو هم آپدیت کن
  const updated = { ...list[idx], ...fields };
  if (fields.priority && fields.priority !== list[idx].priority) {
    updated.xp    = AUTO_XP[period][fields.priority];
    updated.coins = AUTO_COINS[period][fields.priority];
  }

  list[idx] = updated;
  saveState(state);
  return state;
}

function deleteQuest(period, id) {
  const state = loadState();
  state.quests[period] = state.quests[period].filter(q => q.id !== id);
  saveState(state);
  return state;
}

function completeQuest(period, id) {
  const state = loadState();
  const quest = state.quests[period].find(q => q.id === id);
  if (!quest || quest.done) return { state, leveled: false };

  quest.done     = true;
  quest.progress = 100;

  state.player.totalDone += 1;
  state.player.coins     += quest.coins;
  state.player.xp        += quest.xp;

  let leveled = false;
  while (state.player.xp >= XP_PER_LEVEL(state.player.level)) {
    state.player.xp    -= XP_PER_LEVEL(state.player.level);
    state.player.level += 1;
    leveled = true;
  }

  saveState(state);
  return { state, leveled, newLevel: state.player.level, earnedXp: quest.xp };
}

function setProgress(period, id, pct) {
  return updateQuest(period, id, { progress: pct });
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function getSlotInfo(state, period) {
  const slots  = QUEST_SLOTS[period](state.player.level);
  const active = state.quests[period].filter(q => !q.done).length;
  return { slots, active, remaining: slots - active };
}

function getUnlockedRewardIds(state) {
  return REWARDS.filter(r => {
    if (r.level && state.player.level      >= r.level) return true;
    if (r.tasks && state.player.totalDone  >= r.tasks) return true;
    if (r.coins && state.player.coins      >= r.coins) return true;
    return false;
  }).map(r => r.id);
}

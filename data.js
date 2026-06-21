/* ═══════════════════════════════════════════
   data.js – State management & persistence
   ═══════════════════════════════════════════ */

const STORAGE_KEY    = 'questlog_v2';
const ONBOARD_KEY    = 'questlog_onboarded';

/* ── Expiry durations (ms) ── */
const EXPIRY_MS = {
  daily:   24 * 60 * 60 * 1000,       // 24 ساعت
  weekly:   7 * 24 * 60 * 60 * 1000,  // 7 روز
  monthly: 30 * 24 * 60 * 60 * 1000,  // 30 روز
};

/* ── Slot limits ── */
const QUEST_SLOTS = {
  daily:   (lv) => lv >= 17 ? 8 : lv >= 12 ? 7 : lv >= 8 ? 6 : lv >= 5 ? 5 : lv >= 3 ? 4 : 3,
  weekly:  (lv) => lv >= 18 ? 6 : lv >= 13 ? 5 : lv >= 8 ? 4 : lv >= 4 ? 3 : 2,
  monthly: (lv) => lv >= 16 ? 4 : lv >= 10 ? 3 : lv >= 5 ? 2 : 1,
};

/* ── XP curve ── */
const XP_PER_LEVEL = (lv) => Math.floor(80 * Math.pow(1.3, lv - 1));

/* ── Auto XP (no coins) ── */
const AUTO_XP = {
  daily:   { low: 15,  mid: 25,  high: 40  },
  weekly:  { low: 40,  mid: 65,  high: 100 },
  monthly: { low: 90,  mid: 140, high: 200 },
};

const REWARDS = [
  { id:'r1',  icon:'🗡️', name:'شمشیر مبتدی',  req:'لول 2',    level:2,  prize:'+1 اسلات روزانه',  prizeIcon:'📅' },
  { id:'r2',  icon:'🛡️', name:'سپر آهنین',     req:'لول 4',    level:4,  prize:'+1 اسلات هفتگی',   prizeIcon:'📆' },
  { id:'r3',  icon:'🧙', name:'جادوگر کوچک',   req:'لول 5',    level:5,  prize:'+1 اسلات ماهانه',  prizeIcon:'🗓️' },
  { id:'r4',  icon:'⚡', name:'صاعقه',         req:'لول 8',    level:8,  prize:'+1 اسلات روزانه',  prizeIcon:'📅' },
  { id:'r5',  icon:'🏆', name:'قهرمان دره',    req:'لول 10',   level:10, prize:'+1 اسلات هفتگی',   prizeIcon:'📆' },
  { id:'r6',  icon:'🔥', name:'آتش‌بازی',      req:'20 کوئست', tasks:20, prize:'+1 اسلات روزانه',  prizeIcon:'📅' },
  { id:'r7',  icon:'🌟', name:'ستاره طلایی',   req:'لول 13',   level:13, prize:'+1 اسلات هفتگی',   prizeIcon:'📆' },
  { id:'r8',  icon:'💎', name:'الماس خالص',    req:'لول 16',   level:16, prize:'+1 اسلات ماهانه',  prizeIcon:'🗓️' },
  { id:'r9',  icon:'👑', name:'تاج پادشاهی',  req:'لول 20',   level:20, prize:'+1 اسلات هفتگی',   prizeIcon:'📆' },
  { id:'r10', icon:'🐉', name:'تسخیر اژدها',  req:'لول 30',   level:30, prize:'+1 اسلات ماهانه',  prizeIcon:'🗓️' },
];

/* ══════════════════════════════
   CORE STATE
══════════════════════════════ */
function defaultState() {
  return {
    player: { name:'ماجراجو', level:1, xp:0, totalDone:0, streak:0 },
    quests: { daily:[], weekly:[], monthly:[] },
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
   EXPIRY
══════════════════════════════ */
function isExpired(quest, period) {
  if (quest.done) return false;
  return Date.now() > quest.createdAt + EXPIRY_MS[period];
}

function timeLeft(quest, period) {
  const remaining = (quest.createdAt + EXPIRY_MS[period]) - Date.now();
  if (remaining <= 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h/24)} روز`;
  if (h >= 1)  return `${h} ساعت`;
  return `${m} دقیقه`;
}

/* ══════════════════════════════
   QUEST CRUD
══════════════════════════════ */
function createQuest({ title, desc, priority, period }) {
  const state  = loadState();
  const slots  = QUEST_SLOTS[period](state.player.level);
  const active = state.quests[period].filter(q => !q.done && !isExpired(q, period)).length;

  if (active >= slots) return { state, quest:null, limitReached:true, slots };

  const p = priority || 'mid';
  const quest = {
    id: state.nextId++,
    title, desc: desc || '',
    priority: p,
    xp: AUTO_XP[period][p],
    progress: 0,
    done: false,
    createdAt: Date.now(),
  };

  state.quests[period].push(quest);
  saveState(state);
  return { state, quest, limitReached:false };
}

function updateQuest(period, id, fields) {
  const state = loadState();
  const list  = state.quests[period];
  const idx   = list.findIndex(q => q.id === id);
  if (idx === -1) return null;

  const updated = { ...list[idx], ...fields };
  if (fields.priority && fields.priority !== list[idx].priority) {
    updated.xp = AUTO_XP[period][fields.priority];
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
  if (!quest || quest.done) return { state, leveled:false };

  quest.done = true;
  quest.progress = 100;
  state.player.totalDone += 1;
  state.player.xp        += quest.xp;

  let leveled = false;
  while (state.player.xp >= XP_PER_LEVEL(state.player.level)) {
    state.player.xp    -= XP_PER_LEVEL(state.player.level);
    state.player.level += 1;
    leveled = true;
  }

  saveState(state);
  return { state, leveled, newLevel:state.player.level, earnedXp:quest.xp };
}

function setProgress(period, id, pct) {
  return updateQuest(period, id, { progress: pct });
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function getSlotInfo(state, period) {
  const slots  = QUEST_SLOTS[period](state.player.level);
  const active = state.quests[period].filter(q => !q.done && !isExpired(q, period)).length;
  return { slots, active, remaining: slots - active };
}

function isRewardUnlocked(r, player) {
  if (r.level && player.level     >= r.level) return true;
  if (r.tasks && player.totalDone >= r.tasks) return true;
  return false;
}

function getRewardProgress(r, player) {
  if (r.level) return { current:player.level,     needed:r.level, label:'🏅 لول' };
  if (r.tasks) return { current:player.totalDone, needed:r.tasks, label:'✅ کوئست' };
  return { current:0, needed:1, label:'' };
}

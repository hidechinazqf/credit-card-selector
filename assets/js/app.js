/* 信用卡选卡助手 —— 纯静态前端逻辑，零依赖、零后端。
   数据来自 data/cards.json；想换成你自己的卡，改这个文件即可。 */

const TIERS = {
  1: { label: '低门槛 / 学生', cls: 't1' },
  2: { label: '免年费', cls: 't2' },
  3: { label: '积分抵年费', cls: 't3' },
  4: { label: '刚性年费 · 高端', cls: 't4' },
};

let CARDS = [];
let compareSet = []; // 存卡片对象，最多 3 张

/* ---------- 场景榜：回答「哪个卡最好」 ---------- */
// 编辑精选，基于 2026-08-15 联网调研；每张均已在卡库内，可点开详情。
const LEADERBOARD = {
  '攒航空里程': [
    { name: '兴业银行东航万事达白金卡', why: '线上有分，约 6:1 兑东航里程，年上限 10 万里程，比例行业最佳' },
    { name: '中信国航世界卡', why: '8:1 兑国航凤凰知音，国航金卡会员免年费' },
    { name: '中信易卡白金卡(尊贵版)', why: '资产达标+9 倍积分，综合可逼近 2.78:1（需 20 万资产）' },
    { name: '交通银行标准白金卡(白麒麟)', why: '18:1 兑主流航司，活动多、易参与' },
  ],
  '攒酒店积分': [
    { name: '中信万豪精逸白金卡', why: '980 元/年，性价比最高，直攒万豪积分' },
    { name: '广发凯悦联名卡(臻选白金)', why: '直攒凯悦积分，冲环球客首选' },
    { name: '工商银行香格里拉白金卡', why: '直攒香格里拉积分，常消费达标免年费' },
    { name: '运通百夫长白金', why: '积分转万豪/希尔顿，并送金会籍' },
  ],
  '外卡在内地用': [
    { name: '汇丰香港Pulse银联双币钻石信用卡', why: '内地/澳门云闪付+Apple Pay 常设 4.4% 返现、人民币免货币转换费' },
    { name: '汇丰中国信用卡', why: '银联钻石+万事达世界之极套卡，内地银联好刷、海外也强' },
  ],
  '腾讯/京东返现': [
    { name: '中信腾讯超V联名信用卡', why: '微信支付笔笔返现 1%-10%，全年最高 360 元' },
    { name: '民生美运京东联名信用卡', why: '京东支付笔笔返现 1 元，年最高 520 元' },
    { name: '中信京东PLUS联名信用卡', why: '每周日京东满 99 减 10' },
  ],
};
function findCardByName(n) { return CARDS.find(c => c.cardName === n); }

/* ---------- 工具 ---------- */
function costNum(c) {
  const s = (c && c.realCost) || '0';
  if (/极高|高/.test(s)) return 99999;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
function isStudentFriendly(c) {
  return c.tier === 1 || /校园|青年|毕业|学生|零额度|大专/.test(c.eligibility || '');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}
function uniq(arr) { return [...new Set(arr)]; }

/* ---------- 启动 ---------- */
async function boot() {
  try {
    const res = await fetch('./data/cards.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    CARDS = await res.json();
    CARDS.forEach((c, i) => { c._i = i; });
  } catch (e) {
    document.getElementById('app').innerHTML =
      '<div class="warn">⚠️ 无法加载 <code>data/cards.json</code>。' +
      '浏览器禁止用 <code>file://</code> 直接读取本地数据，请通过本地服务器访问：' +
      '<br><br><code>python3 -m http.server 8000</code><br>然后打开 <code>http://localhost:8000</code>。' +
      '<br>（部署到 GitHub Pages / 任意静态托管则无此问题）</div>';
    return;
  }
  goHome();
}

/* ---------- 视图：首页 ---------- */
function goHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="hero">
      <h1>按你的需求，挑一张合适的信用卡</h1>
      <p class="sub">纯信息对比，不代办、不跳申卡、不收费。数据可改、可开源。</p>
      <div class="entries">
        <button class="entry" onclick="renderFilter()">
          <div class="entry-ico">🔎</div>
          <div class="entry-t">按条件筛选</div>
          <div class="entry-d">银行 / 档位 / 年费 / 权益，自己挑</div>
        </button>
        <button class="entry" onclick="renderQuestionnaire()">
          <div class="entry-ico">🧭</div>
          <div class="entry-t">做问卷推荐</div>
          <div class="entry-d">回答几个问题，帮你选出合适的</div>
        </button>
        <button class="entry" onclick="goLeaderboard()">
          <div class="entry-ico">🏆</div>
          <div class="entry-t">场景榜 · 哪个卡最好</div>
          <div class="entry-d">攒里程 / 攒酒店 / 外卡内地用 / 腾讯京东返现</div>
        </button>
      </div>
      <p class="hint">当前卡库共 ${CARDS.length} 张（${CARDS.filter(c => c.verifyStatus === '✅在售').length} 在售 / ${CARDS.filter(c => c.verifyStatus !== '✅在售').length} 待复核），覆盖四档：从学生低门槛到高端刚性年费。数据由社区维护，初始于 2026-08-15 经联网核验，权益请以银行官方为准。</p>
    </section>`;
}

/* ---------- 视图：场景榜 ---------- */
function goLeaderboard() {
  const app = document.getElementById('app');
  const sections = Object.keys(LEADERBOARD).map(title => {
    const items = LEADERBOARD[title].map((row, i) => {
      const c = findCardByName(row.name);
      const idx = c ? c._i : -1;
      const detail = c
        ? `<button class="btn-mini" onclick="showDetail(${idx})">查看详情</button>`
        : '';
      return `<li class="lb-item">
        <span class="lb-rank">${i + 1}</span>
        <div class="lb-body">
          <div class="lb-name">${esc(row.name)}</div>
          <div class="lb-why">${esc(row.why)}</div>
        </div>
        ${detail}
      </li>`;
    }).join('');
    return `<div class="lb-section">
      <h3 class="lb-title">${esc(title)}</h3>
      <ul class="lb-list">${items}</ul>
    </div>`;
  }).join('');
  app.innerHTML = `
    <section class="view">
      <div class="view-head"><h2>🏆 场景榜 · 哪个卡最好</h2><button class="link" onclick="goHome()">← 首页</button></div>
      <p class="hint">编辑基于 2026-08-15 联网调研精选，卡库内均可点开详情。权益缩水频繁，比例以银行当期公告为准。</p>
      <div class="lb-wrap">${sections}</div>
    </section>`;
}

/* ---------- 视图：筛选 ---------- */
const FILTER = { banks: [], tiers: [], fee: 'all', orgs: [], kw: '', studentOnly: false, perks: [], onSaleOnly: false, perkMode: 'or', scenes: [], regions: [] };

// 卡库里实际出现的权益类目（按 PERK_ORDER 顺序，便于筛选区稳定展示）
function perkCats() {
  const present = new Set();
  CARDS.forEach(c => (c.perks || []).forEach(p => present.add(p.cat)));
  return PERK_ORDER.filter(cat => present.has(cat))
    .concat([...present].filter(cat => !PERK_ORDER.includes(cat)));
}

// 卡库里实际出现的使用场景（动态生成，便于筛选区稳定展示）
function sceneList() {
  const present = new Set();
  CARDS.forEach(c => (c.scenes || []).forEach(s => present.add(s)));
  return [...present];
}

function renderFilter() {
  const banks = uniq(CARDS.map(c => c.bank)).sort();
  const orgs = uniq(CARDS.map(c => c.cardOrg)).sort();
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h2>🔎 按条件筛选</h2>
        <button class="link" onclick="goHome()">← 首页</button>
      </div>
      <div class="layout">
        <aside class="filters">
          <div class="frow"><label>档位</label>
            <div class="chips">
              ${[1,2,3,4].map(t => `<label class="chip"><input type="checkbox" value="${t}" onchange="onTier(this)"> ${TIERS[t].label}</label>`).join('')}
            </div>
          </div>
          <div class="frow"><label>年费承受</label>
            <div class="chips">
              ${[['all','不限'],['0','必须免年费'],['1000','≤1000'],['3000','≤3000'],['high','不介意']].map(([v,l]) =>
                `<label class="chip"><input type="radio" name="fee" value="${v}" ${FILTER.fee===v?'checked':''} onchange="onFee('${v}')"> ${l}</label>`).join('')}
            </div>
          </div>
          <div class="frow"><label>仅看学生可办</label>
            <label class="chip"><input type="checkbox" onchange="onStudent(this)" ${FILTER.studentOnly?'checked':''}> 在校生 / 毕业不久也能办</label>
          </div>
          <div class="frow"><label>仅看在售</label>
            <label class="chip"><input type="checkbox" onchange="onSale(this)" ${FILTER.onSaleOnly?'checked':''}> 隐藏待复核卡片</label>
          </div>
          <div class="frow"><label>发卡地区</label>
            <div class="chips">${['大陆','香港'].map(r => `<label class="chip"><input type="checkbox" class="region-cb" value="${r}" onchange="onRegion(this)" ${FILTER.regions.includes(r)?'checked':''}> ${r==='香港'?'🇭🇰 香港 / 外卡':'大陆'}</label>`).join('')}</div>
          </div>
          <div class="frow"><label>权益类型</label>
            <div class="chips">${perkCats().map(cat => `<label class="chip"><input type="checkbox" class="perk-cb" value="${esc(cat)}" onchange="onPerk(this)" ${FILTER.perks.includes(cat)?'checked':''}> ${esc(cat)}</label>`).join('')}</div>
            <div class="mode"><span>匹配</span>
              <label class="chip"><input type="radio" name="perkMode" value="or" ${FILTER.perkMode==='or'?'checked':''} onchange="onPerkMode('or')"> 满足其一</label>
              <label class="chip"><input type="radio" name="perkMode" value="and" ${FILTER.perkMode==='and'?'checked':''} onchange="onPerkMode('and')"> 满足全部</label>
            </div>
          </div>
          <div class="frow"><label>使用场景</label>
            <div class="chips">${sceneList().map(s => `<label class="chip"><input type="checkbox" class="scene-cb" value="${esc(s)}" onchange="onScene(this)" ${FILTER.scenes.includes(s)?'checked':''}> ${esc(s)}</label>`).join('')}</div>
          </div>
          <div class="frow"><label>关键词（权益/卡名）</label>
            <input type="text" id="kw" placeholder="如：贵宾厅 / 返现 / 里程" value="${esc(FILTER.kw)}" oninput="onKw(this)">
          </div>
          <div class="frow"><label>银行</label>
            <div class="chips">${banks.map(b => `<label class="chip"><input type="checkbox" value="${esc(b)}" onchange="onBank(this)"> ${esc(b)}</label>`).join('')}</div>
          </div>
          <div class="frow"><label>卡组织</label>
            <div class="chips">${orgs.map(o => `<label class="chip"><input type="checkbox" value="${esc(o)}" onchange="onOrg(this)"> ${esc(o)}</label>`).join('')}</div>
          </div>
          <button class="btn-ghost" onclick="resetFilter()">重置筛选</button>
        </aside>
        <main class="results">
          <div class="result-bar"><span id="count"></span>
            <button id="cmpBtn" class="btn-cmp" style="display:none" onclick="renderCompare()">对比已选 (<span id="cmpN">0</span>)</button>
          </div>
          <div id="list" class="list"></div>
        </main>
      </div>
    </section>`;
  applyFilter();
}

function onTier(el){ toggleArr(FILTER.tiers, +el.value, el.checked); applyFilter(); }
function onBank(el){ toggleArr(FILTER.banks, el.value, el.checked); applyFilter(); }
function onOrg(el){ toggleArr(FILTER.orgs, el.value, el.checked); applyFilter(); }
function onPerk(el){ toggleArr(FILTER.perks, el.value, el.checked); applyFilter(); }
function onScene(el){ toggleArr(FILTER.scenes, el.value, el.checked); applyFilter(); }
// 点击卡片正面使用场景标签：把该场景加入筛选并同步勾选框
function addSceneFilter(s) {
  if (!FILTER.scenes.includes(s)) FILTER.scenes.push(s);
  const cb = document.querySelector('.filters input.scene-cb[value="' + s.replace(/"/g, '\\"') + '"]');
  if (cb) cb.checked = true;
  applyFilter();
}
function onPerkMode(v){ FILTER.perkMode = v; applyFilter(); }
// 点击卡片正面权益标签：把该类目加入筛选并同步勾选框
function addPerkFilter(cat) {
  if (!FILTER.perks.includes(cat)) FILTER.perks.push(cat);
  const cb = document.querySelector('.filters input.perk-cb[value="' + cat.replace(/"/g, '\\"') + '"]');
  if (cb) cb.checked = true;
  applyFilter();
}
function onFee(v){ FILTER.fee = v; applyFilter(); }
function onStudent(el){ FILTER.studentOnly = el.checked; applyFilter(); }
function onSale(el){ FILTER.onSaleOnly = el.checked; applyFilter(); }
function onRegion(el){ toggleArr(FILTER.regions, el.value, el.checked); applyFilter(); }
function onKw(el){ FILTER.kw = el.value.trim(); applyFilter(); }
function toggleArr(a, v, on){ const i = a.indexOf(v); if(on && i<0) a.push(v); if(!on && i>=0) a.splice(i,1); }
function resetFilter(){ FILTER.banks=[]; FILTER.tiers=[]; FILTER.orgs=[]; FILTER.fee='all'; FILTER.kw=''; FILTER.studentOnly=false; FILTER.perks=[]; FILTER.onSaleOnly=false; FILTER.scenes=[]; FILTER.regions=[]; renderFilter(); }

function applyFilter() {
  let list = CARDS.filter(c => {
    if (FILTER.tiers.length && !FILTER.tiers.includes(c.tier)) return false;
    if (FILTER.banks.length && !FILTER.banks.includes(c.bank)) return false;
    if (FILTER.orgs.length && !FILTER.orgs.includes(c.cardOrg)) return false;
    if (FILTER.studentOnly && !isStudentFriendly(c)) return false;
    if (FILTER.onSaleOnly && c.verifyStatus !== '✅在售') return false;
    if (FILTER.regions.length && !FILTER.regions.includes(c.region || '大陆')) return false;
    if (FILTER.perks.length) {
      const cats = (c.perks || []).map(p => p.cat);
      const hit = FILTER.perks.filter(pc => cats.includes(pc));
      if (FILTER.perkMode === 'and' ? hit.length < FILTER.perks.length : hit.length === 0) return false;
    }
    if (FILTER.scenes.length) {
      const sc = (c.scenes || []);
      if (!FILTER.scenes.some(s => sc.includes(s))) return false;
    }
    if (FILTER.fee !== 'all') {
      const cost = costNum(c);
      if (FILTER.fee === '0' && cost > 0) return false;
      if (FILTER.fee === '1000' && cost > 1000) return false;
      if (FILTER.fee === '3000' && cost > 3000) return false;
    }
    if (FILTER.kw) {
      const hay = (c.cardName + ' ' + c.benefits + ' ' + c.bank + ' ' + (c.perks || []).map(p => p.text).join(' ') + ' ' + (c.scenes || []).join(' ')).toLowerCase();
      if (!hay.includes(FILTER.kw.toLowerCase())) return false;
    }
    return true;
  });
  list.sort((a, b) => a.tier - b.tier || costNum(a) - costNum(b));
  document.getElementById('count').textContent = `共 ${list.length} 张`;
  const listEl = document.getElementById('list');
  if (!list.length) { listEl.innerHTML = '<div class="empty">没有符合条件的卡，试试放宽筛选。</div>'; return; }
  listEl.innerHTML = list.map(c => cardHTML(c)).join('');
  updateCmpBtn();
}

function cardHTML(c) {
  const inCmp = compareSet.some(x => x._i === c._i);
  const vBadge = c.verifyStatus === '✅在售' ? 'ok' : (c.verifyStatus === '⚠️需更新' ? 'warn' : 'stop');
  const _pcats = uniq((c.perks || []).map(p => p.cat));
  const _prio = ['贵宾厅', '接送机', '代驾', '返现', '航空里程', '酒店会籍', '酒店积分', '平台返现', '健康医疗', '运动健身', '出行保障', '生活礼遇', '其他'];
  const pcats = _prio.filter(cat => _pcats.includes(cat)).concat(_pcats.filter(cat => !_prio.includes(cat))).slice(0, 4);
  return `
    <article class="card">
      <div class="card-top">
        <span class="badge ${TIERS[c.tier].cls}">${TIERS[c.tier].label}</span>
        <span class="verify ${vBadge}" title="核验状态">${esc(c.verifyStatus)}</span>
      </div>
      <h3 class="card-name" onclick="showDetail(${c._i})">${esc(c.cardName)}</h3>
      <div class="card-bank">${esc(c.bank)} · ${esc(c.cardOrg)}${c.cardOrg.includes('/') ? ' <span class="set-tag">套卡</span>' : ''}</div>
      ${c.region && c.region !== '大陆' ? `<div class="card-region">🇭🇰 ${esc(c.region)} / 外卡</div>` : ''}
      <div class="card-line"><span>年费</span>${esc(c.annualFee)}</div>
      <div class="card-line"><span>实际成本</span>${esc(c.realCost)}</div>
      <div class="card-line"><span>核心权益</span>${esc(c.benefits)}</div>
      <div class="card-line"><span>办卡门槛</span>${esc(c.eligibility)}</div>
      ${pcats.length ? `<div class="card-perks">${pcats.map(cat => `<span class="pc" title="按「${esc(cat)}」筛选" onclick="addPerkFilter('${esc(cat)}')">${esc(cat)}</span>`).join('')}</div>` : ''}
      ${(c.scenes || []).length ? `<div class="card-scenes">${c.scenes.map(s => `<span class="sc" title="按使用场景筛选" onclick="addSceneFilter('${esc(s)}')">🤖 ${esc(s)}</span>`).join('')}</div>` : ''}
      ${c.note ? `<div class="card-note">📌 ${esc(c.note)}</div>` : ''}
      <div class="card-actions">
        <button class="btn-mini ${inCmp?'on':''}" onclick="toggleCompare(${c._i})">${inCmp?'✓ 已加入对比':'+ 加入对比'}</button>
      </div>
    </article>`;
}

/* ---------- 对比 ---------- */
function toggleCompare(i) {
  const c = CARDS[i];
  const j = compareSet.findIndex(x => x._i === i);
  if (j >= 0) compareSet.splice(j, 1);
  else { if (compareSet.length >= 3) { alert('最多对比 3 张'); return; } compareSet.push(c); }
  applyFilter();
}
function updateCmpBtn() {
  const btn = document.getElementById('cmpBtn');
  const n = document.getElementById('cmpN');
  if (!btn) return;
  if (compareSet.length >= 2) { btn.style.display = ''; n.textContent = compareSet.length; }
  else btn.style.display = 'none';
}
function renderCompare() {
  if (compareSet.length < 2) { alert('至少选 2 张再对比'); return; }
  const fields = [
    ['银行', c => c.bank], ['卡组织', c => c.cardOrg], ['档位', c => TIERS[c.tier].label],
    ['年费', c => c.annualFee], ['实际成本', c => c.realCost], ['核心权益', c => c.benefits],
    ['办卡门槛', c => c.eligibility], ['核验状态', c => c.verifyStatus], ['备注', c => c.note || '—'],
  ];
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <div class="view-head"><h2>⚖️ 卡片对比</h2><button class="link" onclick="renderFilter()">← 返回筛选</button></div>
      <div class="cmp-wrap">
        <table class="cmp">
          <thead><tr><th>维度</th>${compareSet.map(c => `<th>${esc(c.cardName)}</th>`).join('')}</tr></thead>
          <tbody>${fields.map(([name, fn]) => `<tr><th>${name}</th>${compareSet.map(c => `<td>${esc(fn(c))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <button class="btn-ghost" onclick="compareSet=[];renderFilter()">清空对比</button>
    </section>`;
}

/* ---------- 完整权益清单 ---------- */
const PERK_ORDER = ['贵宾厅','接送机','代驾','酒店会籍','酒店积分','航空里程','健康医疗','运动健身','返现','平台返现','出行保障','生活礼遇','其他'];
function renderPerks(c) {
  if (!c.perks || !c.perks.length) return '';
  const groups = {};
  c.perks.forEach(p => { (groups[p.cat] = groups[p.cat] || []).push(p.text); });
  const cats = PERK_ORDER.filter(cat => groups[cat])
    .concat(Object.keys(groups).filter(cat => !PERK_ORDER.includes(cat)));
  return cats.map(cat => {
    const items = groups[cat].map(t => `<li>${esc(t)}</li>`).join('');
    return `<div class="perk-group"><div class="perk-cat">${esc(cat)}</div><ul>${items}</ul></div>`;
  }).join('');
}

/* ---------- 详情 ---------- */
function showDetail(i) {
  const c = CARDS[i];
  const v = c.verifyStatus === '✅在售' ? 'ok' : (c.verifyStatus === '⚠️需更新' ? 'warn' : 'stop');
  const overlay = document.createElement('div');
  overlay.className = 'modal-mask';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-x" onclick="this.closest('.modal-mask').remove()">✕</button>
      <span class="badge ${TIERS[c.tier].cls}">${TIERS[c.tier].label}</span>
      <h2>${esc(c.cardName)}</h2>
      <div class="card-bank">${esc(c.bank)} · ${esc(c.cardOrg)}${c.cardOrg.includes('/') ? ' <span class="set-tag">套卡</span>' : ''}</div>
      <div class="card-line"><span>年费</span>${esc(c.annualFee)}</div>
      <div class="card-line"><span>实际成本</span>${esc(c.realCost)}</div>
      <div class="card-line"><span>核心权益</span>${esc(c.benefits)}</div>
      ${(c.scenes || []).includes('海外AI订阅') ? `<div class="scene-tip">🤖 <b>可用于海外订阅 ChatGPT / Grok / Claude / Gemini 等</b>：需为 Visa / Mastercard / 运通（单标或双标）外币卡，并在银行 App 开通「境外无卡支付」。纯银联单标卡（62 开头）通常无法订阅；运通卡建议先用小额测试，成功率略低于 Visa / Mastercard。</div>` : ''}
      <div class="perk-wrap"><div class="perk-title">完整权益清单</div>${renderPerks(c)}</div>
      <div class="card-line"><span>办卡门槛</span>${esc(c.eligibility)}</div>
      <div class="card-line"><span>核验状态</span><span class="verify ${v}">${esc(c.verifyStatus)}</span> <small>（${esc(c.verifyDate)}）</small></div>
      ${c.note ? `<div class="card-note">📌 ${esc(c.note)}</div>` : ''}
      <p class="modal-foot">仅供参考，以银行官方为准。</p>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

/* ---------- 视图：问卷推荐 ---------- */
const Q = { identity: '', fee: '', usage: '', values: [], travel: '' };
function renderQuestionnaire() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <div class="view-head"><h2>🧭 做问卷推荐</h2><button class="link" onclick="goHome()">← 首页</button></div>
      <div class="quiz">
        ${qBlock('identity','你的身份？',[['student','在校学生'],['grad','毕业生 / 刚工作(≤3年)'],['emp','在职稳定'],['free','自由职业']])}
        ${qBlock('fee','年费你能接受多少？',[['0','必须免年费'],['1k','几百元可接受'],['3k','几千元换权益'],['any','不介意']])}
        ${qBlock('usage','主要用在哪？',[['cn','境内为主'],['os','境外为主'],['both','境内外都有']])}
        ${qBlockMulti('values','你最看重什么？',[
          ['free','免年费省钱'],['lounge','贵宾厅'],['transfer','接送机'],['daijia','代驾'],
          ['cash','返现'],['mile','航空里程'],['hotelpts','酒店积分'],['platcash','腾讯/京东返现'],
          ['health','健康医疗'],['fitness','运动健身'],['safeguard','出行保障'],['lifestyle','生活礼遇'],
          ['overseasAI','订阅海外AI(GPT等)/海淘'],['starter','低门槛攒信用']
        ], 3)}
        ${qBlock('travel','你出行频繁吗？',[['rare','很少'],['some','偶尔'],['often','经常']])}
        <button class="btn-primary" onclick="runRecommend()">查看推荐</button>
      </div>
      <div id="rec"></div>
    </section>`;
}
function qBlock(key, title, opts) {
  return `<div class="q"><p>${title}</p><div class="chips">${opts.map(([v,l]) =>
    `<label class="chip"><input type="radio" name="${key}" value="${v}" onchange="Q.${key}='${v}'"> ${l}</label>`).join('')}</div></div>`;
}
// 多选（可勾选多个，最多 max 项），结果写入 Q.values
function qBlockMulti(key, title, opts, max) {
  return `<div class="q"><p>${title} <span class="q-hint">（最多选 ${max} 项）</span></p><div class="chips">${opts.map(([v,l]) =>
    `<label class="chip"><input type="checkbox" name="${key}" value="${v}" onchange="toggleValue('${v}', ${max})"> ${l}</label>`).join('')}</div></div>`;
}
function toggleValue(v, max) {
  const i = Q.values.indexOf(v);
  if (i >= 0) { Q.values.splice(i, 1); return; }
  if (Q.values.length >= max) {
    const box = document.querySelector(`input[name="values"][value="${v}"]`);
    if (box) box.checked = false;
    return;
  }
  Q.values.push(v);
}
function runRecommend() {
  const rec = document.getElementById('rec');
  if (!Q.identity || !Q.fee || !Q.usage || !Q.values.length || !Q.travel) { rec.innerHTML = '<div class="warn">请先答完所有问题。</div>'; return; }
  const all = CARDS.map(c => scoreCard(c)).filter(x => x.pass);
  const scored = all.slice().sort((a,b) => b.score - a.score).slice(0, 3);
  if (!scored.length) { rec.innerHTML = '<div class="empty">没有特别匹配的卡，试试放宽年费或身份条件。</div>'; return; }
  let html = `<h3 class="rec-h">为你推荐的 ${scored.length} 张</h3>` + scored.map(s => `
    <div class="rec-card">
      <div class="rec-top"><span class="badge ${TIERS[s.c.tier].cls}">${TIERS[s.c.tier].label}</span><b>${esc(s.c.cardName)}</b><span class="card-bank">${esc(s.c.bank)}</span></div>
      <div class="card-line"><span>年费</span>${esc(s.c.annualFee)}　<span>成本</span>${esc(s.c.realCost)}</div>
      ${(s.c.scenes||[]).length ? `<div class="card-perks">${s.c.scenes.map(x=>`<span class="pc">${esc(x)}</span>`).join('')}</div>` : ''}
      <ul class="reasons">${s.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <button class="btn-mini" onclick="showDetail(${s.c._i})">查看详情</button>
    </div>`).join('');
  const combo = buildCombo(all);
  if (combo) html += renderCombo(combo);
  rec.innerHTML = html;
  rec.scrollIntoView({ behavior: 'smooth' });
}
// 问卷「看重」维度评分规则：命中即 +18，reason 展示给用户
const VALUE_RULES = {
  free:      [(c) => costNum(c) === 0, '年费成本为 0'],
  lounge:    [(c, b) => /贵宾厅|龙腾|cip|机场/.test(b), '含贵宾厅权益'],
  transfer:  [(c, b) => /接送|礼宾车|高铁站/.test(b), '含接送机权益'],
  daijia:    [(c, b) => (c.perks || []).some(p => p.cat === '代驾') || /代驾/.test(b), '含代驾权益'],
  cash:      [(c, b) => /返现/.test(b), '有返现'],
  mile:      [(c, b) => /里程|万豪|希尔顿|积分/.test(b), '适合攒里程 / 积分'],
  hotelpts:  [(c, b) => /酒店积分|酒店会籍|万豪|希尔顿/.test(b), '含酒店积分 / 会籍'],
  platcash:  [(c, b) => /腾讯|京东|平台返现|刷卡金/.test(b), '含腾讯 / 京东等平台返现'],
  health:    [(c, b) => /医疗|洁牙|陪诊|挂号|健康/.test(b), '含健康医疗权益'],
  fitness:   [(c, b) => /健身|滑雪|马术|运动/.test(b), '含运动健身权益'],
  safeguard: [(c, b) => /延误险|意外险|救援|保障|道路救援/.test(b), '含出行保障'],
  lifestyle: [(c, b) => /生活礼遇|视频|星巴克|礼遇/.test(b), '含生活礼遇'],
  starter:   [(c) => c.tier <= 1, '低门槛，适合起步攒信用'],
};
function scoreCard(c) {
  let score = 0; const reasons = []; const cost = costNum(c);
  // 年费硬门槛
  if (Q.fee === '0' && cost > 0) return { pass: false };
  if (Q.fee === '1k' && cost > 1000) return { pass: false };
  if (Q.fee === '3k' && cost > 3000) return { pass: false };
  // 身份
  if (Q.identity === 'student') {
    if (c.tier === 4) return { pass: false };
    if (isStudentFriendly(c)) { score += 40; reasons.push('适合在校生 / 低门槛易批'); }
    else { score -= 10; }
  } else if (Q.identity === 'grad') {
    if (c.tier <= 2 || isStudentFriendly(c)) { score += 20; reasons.push('毕业不久也能轻松办理'); }
  } else if (Q.identity === 'emp' || Q.identity === 'free') {
    if (c.tier >= 2) { score += 10; }
  }
  // 用途
  const b = (c.benefits + ' ' + c.cardName + ' ' + (c.perks || []).map(p => p.cat + ' ' + p.text).join(' ')).toLowerCase();
  if (Q.usage === 'cn' && /境内|银联/.test(c.benefits + c.cardOrg)) { score += 12; reasons.push('境内使用友好'); }
  if (Q.usage === 'os' && /境外|visa|运通|万事达|龙腾|环球|货币/.test(b + c.cardOrg)) { score += 14; reasons.push('境外 / 出行权益强'); }
  if (Q.usage === 'both') { score += 8; reasons.push('境内外通用'); }
  // 海外 AI 订阅 / 海淘：勾选即视为硬需求，仅保留支持外币通道的卡
  if (Q.values.includes('overseasAI')) {
    if ((c.scenes || []).includes('海外AI订阅')) { score += 22; reasons.push('支持订阅海外 AI / 外币在线支付'); }
    else { return { pass: false }; }
  }
  // 看重点（可多选，每项命中 +18）
  Q.values.forEach(v => {
    const rule = VALUE_RULES[v];
    if (rule && rule[0](c, b)) { score += 18; reasons.push(rule[1]); }
  });
  // 出行频率
  if (Q.travel === 'often' && /贵宾厅|接送|龙腾/.test(b)) score += 8;
  if (Q.travel === 'rare' && cost === 0) score += 6;
  if (!reasons.length) reasons.push('综合条件较均衡，可作备选');
  return { pass: true, c, score, reasons };
}

// 用户勾选的需求维度（用于组合互补判断）
const DIM_LABEL = { free: '免年费', lounge: '贵宾厅', transfer: '接送机', daijia: '代驾', cash: '返现', mile: '里程/积分', hotelpts: '酒店积分', platcash: '平台返现', health: '健康医疗', fitness: '运动健身', safeguard: '出行保障', lifestyle: '生活礼遇', overseasAI: '海外AI/海淘', starter: '低门槛起步' };
function userDims() {
  return new Set(Q.values);
}
// 卡片自身覆盖的维度
function cardDims(c) {
  const b = (c.benefits + ' ' + (c.perks || []).map(p => p.cat + ' ' + p.text).join(' ')).toLowerCase();
  const d = new Set();
  if (costNum(c) === 0) d.add('free');
  if (/贵宾厅|龙腾|cip|机场/.test(b)) d.add('lounge');
  if (/接送|礼宾车|高铁站/.test(b)) d.add('transfer');
  if ((c.perks || []).some(p => p.cat === '代驾') || /代驾/.test(b)) d.add('daijia');
  if (/返现/.test(b)) d.add('cash');
  if (/里程|万豪|希尔顿|积分/.test(b)) d.add('mile');
  if (/酒店积分|酒店会籍|万豪|希尔顿/.test(b)) d.add('hotelpts');
  if (/腾讯|京东|平台返现|刷卡金/.test(b)) d.add('platcash');
  if (/医疗|洁牙|陪诊|挂号|健康/.test(b)) d.add('health');
  if (/健身|滑雪|马术|运动/.test(b)) d.add('fitness');
  if (/延误险|意外险|救援|保障|道路救援/.test(b)) d.add('safeguard');
  if (/生活礼遇|视频|星巴克|礼遇/.test(b)) d.add('lifestyle');
  if ((c.scenes || []).includes('海外AI订阅') || /境外|外币|货币转换|visa|运通|万事达/.test(b)) d.add('overseasAI');
  if (c.tier <= 1) d.add('starter');
  return d;
}
// 组合：选 2 张互补卡，覆盖用户更多需求维度
function buildCombo(scored) {
  if (scored.length < 2) return null;
  const A = scored.slice().sort((x, y) => y.score - x.score)[0];
  const A_dims = cardDims(A.c);
  const ud = userDims();
  let best = null, bestGain = 0;
  for (const s of scored) {
    if (s.c === A.c) continue;
    const d = cardDims(s.c);
    let gain = 0;
    ud.forEach(k => { if (d.has(k) && !A_dims.has(k)) gain++; });
    if (s.c.bank === A.c.bank) gain -= 0.5; // 轻微偏好跨行
    if (gain > bestGain) { bestGain = gain; best = s; }
  }
  if (!best || bestGain <= 0) return null; // 单卡已够覆盖就不硬凑
  return [A, best];
}
function renderCombo([a, b]) {
  const da = cardDims(a.c), db = cardDims(b.c), ud = userDims();
  const label = k => DIM_LABEL[k] || k;
  const aCovered = [...ud].filter(k => da.has(k)).map(label);
  const bCovered = [...ud].filter(k => db.has(k)).map(label);
  const newBy = [...ud].filter(k => db.has(k) && !da.has(k)).map(label);
  const mini = (s, role, covered) => `
    <div class="combo-card">
      <div class="rec-top"><span class="badge ${TIERS[s.c.tier].cls}">${TIERS[s.c.tier].label}</span><b>${esc(s.c.cardName)}</b><span class="card-bank">${esc(s.c.bank)}</span></div>
      <div class="card-line"><span>年费</span>${esc(s.c.annualFee)}　<span>成本</span>${esc(s.c.realCost)}</div>
      <div class="card-perks">${([...cardDims(s.c)].filter(k => DIM_LABEL[k]).map(k => `<span class="pc">${label(k)}</span>`)).join('')}</div>
      <div class="combo-role">${role}：${covered.join('、') || '通用消费'}</div>
      <button class="btn-mini" onclick="showDetail(${s.c._i})">查看详情</button>
    </div>`;
  const coverAll = [...new Set([...aCovered, ...bCovered])];
  return `<div class="combo">
    <h3 class="rec-h">💡 组合方案：2 张搭配更省心</h3>
    <p class="combo-desc">日常消费用「主力卡」无脑刷，出行 / 贵宾厅 / 海外等场景用「权益卡」补位，两张互补覆盖你更多需求。</p>
    <div class="combo-row">${mini(a, '日常主力', aCovered)}${mini(b, '权益补充', newBy.length ? newBy : bCovered)}</div>
    <div class="combo-note">✅ 组合覆盖：${coverAll.join('、')}</div>
  </div>`;
}

/* ---------- 启动 ---------- */
boot();

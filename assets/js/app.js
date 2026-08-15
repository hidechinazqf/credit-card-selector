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
      </div>
      <p class="hint">当前卡库共 ${CARDS.length} 张（${CARDS.filter(c => c.verifyStatus === '✅在售').length} 在售 / ${CARDS.filter(c => c.verifyStatus !== '✅在售').length} 待复核），覆盖四档：从学生低门槛到高端刚性年费。数据由社区维护，初始于 2026-08-15 经联网核验，权益请以银行官方为准。</p>
    </section>`;
}

/* ---------- 视图：筛选 ---------- */
const FILTER = { banks: [], tiers: [], fee: 'all', orgs: [], kw: '', studentOnly: false, perks: [], onSaleOnly: false, perkMode: 'or', scenes: [] };

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
function onKw(el){ FILTER.kw = el.value.trim(); applyFilter(); }
function toggleArr(a, v, on){ const i = a.indexOf(v); if(on && i<0) a.push(v); if(!on && i>=0) a.splice(i,1); }
function resetFilter(){ FILTER.banks=[]; FILTER.tiers=[]; FILTER.orgs=[]; FILTER.fee='all'; FILTER.kw=''; FILTER.studentOnly=false; FILTER.perks=[]; FILTER.onSaleOnly=false; FILTER.scenes=[]; renderFilter(); }

function applyFilter() {
  let list = CARDS.filter(c => {
    if (FILTER.tiers.length && !FILTER.tiers.includes(c.tier)) return false;
    if (FILTER.banks.length && !FILTER.banks.includes(c.bank)) return false;
    if (FILTER.orgs.length && !FILTER.orgs.includes(c.cardOrg)) return false;
    if (FILTER.studentOnly && !isStudentFriendly(c)) return false;
    if (FILTER.onSaleOnly && c.verifyStatus !== '✅在售') return false;
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
  const pcats = uniq((c.perks || []).map(p => p.cat)).slice(0, 4);
  return `
    <article class="card">
      <div class="card-top">
        <span class="badge ${TIERS[c.tier].cls}">${TIERS[c.tier].label}</span>
        <span class="verify ${vBadge}" title="核验状态">${esc(c.verifyStatus)}</span>
      </div>
      <h3 class="card-name" onclick="showDetail(${c._i})">${esc(c.cardName)}</h3>
      <div class="card-bank">${esc(c.bank)} · ${esc(c.cardOrg)}</div>
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
const PERK_ORDER = ['贵宾厅','接送机','酒店会籍','健康医疗','运动健身','返现','里程积分','出行保障','生活礼遇','其他'];
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
      <div class="card-bank">${esc(c.bank)} · ${esc(c.cardOrg)}</div>
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
const Q = { identity: '', fee: '', usage: '', value: '', travel: '' };
function renderQuestionnaire() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <div class="view-head"><h2>🧭 做问卷推荐</h2><button class="link" onclick="goHome()">← 首页</button></div>
      <div class="quiz">
        ${qBlock('identity','你的身份？',[['student','在校学生'],['grad','毕业生 / 刚工作(≤3年)'],['emp','在职稳定'],['free','自由职业']])}
        ${qBlock('fee','年费你能接受多少？',[['0','必须免年费'],['1k','几百元可接受'],['3k','几千元换权益'],['any','不介意']])}
        ${qBlock('usage','主要用在哪？',[['cn','境内为主'],['os','境外为主'],['both','境内外都有']])}
        ${qBlock('value','你最看重什么？',[['free','免年费省钱'],['lounge','贵宾厅 / 机场'],['cash','返现'],['mile','里程 / 积分'],['credit','攒信用起步']])}
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
function runRecommend() {
  const rec = document.getElementById('rec');
  if (!Q.identity || !Q.fee || !Q.usage || !Q.value || !Q.travel) { rec.innerHTML = '<div class="warn">请先答完所有问题。</div>'; return; }
  const scored = CARDS.map(c => scoreCard(c)).filter(x => x.pass).sort((a,b) => b.score - a.score).slice(0, 3);
  if (!scored.length) { rec.innerHTML = '<div class="empty">没有特别匹配的卡，试试放宽年费或身份条件。</div>'; return; }
  rec.innerHTML = `<h3 class="rec-h">为你推荐的 ${scored.length} 张</h3>` + scored.map(s => `
    <div class="rec-card">
      <div class="rec-top"><span class="badge ${TIERS[s.c.tier].cls}">${TIERS[s.c.tier].label}</span><b>${esc(s.c.cardName)}</b><span class="card-bank">${esc(s.c.bank)}</span></div>
      <div class="card-line"><span>年费</span>${esc(s.c.annualFee)}　<span>成本</span>${esc(s.c.realCost)}</div>
      <ul class="reasons">${s.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <button class="btn-mini" onclick="showDetail(${s.c._i})">查看详情</button>
    </div>`).join('');
  rec.scrollIntoView({ behavior: 'smooth' });
}
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
  const b = (c.benefits + c.cardName).toLowerCase();
  if (Q.usage === 'cn' && /境内|银联/.test(c.benefits + c.cardOrg)) { score += 12; reasons.push('境内使用友好'); }
  if (Q.usage === 'os' && /境外|visa|运通|万事达|龙腾|环球|货币/.test(b + c.cardOrg)) { score += 14; reasons.push('境外 / 出行权益强'); }
  if (Q.usage === 'both') { score += 8; reasons.push('境内外通用'); }
  // 看重点
  if (Q.value === 'free' && cost === 0) { score += 18; reasons.push('年费成本为 0'); }
  if (Q.value === 'lounge' && /贵宾厅|龙腾|cip|接送|机场/.test(b)) { score += 18; reasons.push('含贵宾厅 / 接送机权益'); }
  if (Q.value === 'cash' && /返现/.test(b)) { score += 18; reasons.push('有返现'); }
  if (Q.value === 'mile' && /里程|万豪|积分|希尔顿/.test(b)) { score += 18; reasons.push('适合攒里程 / 积分'); }
  if (Q.value === 'credit' && c.tier === 1) { score += 18; reasons.push('低门槛，适合起步攒信用'); }
  // 出行频率
  if (Q.travel === 'often' && /贵宾厅|接送|龙腾/.test(b)) score += 8;
  if (Q.travel === 'rare' && cost === 0) score += 6;
  if (!reasons.length) reasons.push('综合条件较均衡，可作备选');
  return { pass: true, c, score, reasons };
}

/* ---------- 启动 ---------- */
boot();

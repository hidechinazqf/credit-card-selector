#!/usr/bin/env python3
# 生成小红书图文：中信万豪新增「金卡」「白金卡」两张卡 + 选卡器推广
# 只保留"内容"（卡片详情 / 工具信息），不烤标题，避免标题压字。竖图 1080x1350。
import json, html

D = json.load(open('data/cards.json', encoding='utf-8'))
TIERS = {1: '低门槛 / 学生', 2: '免年费', 3: '积分抵年费', 4: '刚性年费 · 高端'}
TCLS = {1: 't1', 2: 't2', 3: 't3', 4: 't4'}
ESC = html.escape

def find(name):
    for c in D:
        if c.get('cardName') == name:
            return c
    raise SystemExit('card not found: ' + name)

gold = find('中信万豪金卡')
plat = find('中信万豪白金卡')

COMMON_CSS = """
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { width: 1080px; height: 1350px; background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    display: flex; flex-direction: column; overflow: hidden; }
  #app { flex: 1 1 auto; background: #fff; overflow: hidden; }
  .cap { flex: 1 1 auto; color: #fff;
    display: flex; flex-direction: column; justify-content: center; padding: 0 80px;
    background: linear-gradient(135deg, #0f172a, #1e293b); }
  .cap .k { font-size: 30px; color: #fbbf24; letter-spacing: 4px; margin-bottom: 16px; }
  .cap .t { font-size: 84px; font-weight: 800; line-height: 1.2; }
  .cap .bullets { margin-top: 48px; }
  .cap .bullets div { font-size: 32px; color: #e2e8f0; margin: 16px 0; }
  .cap .foot { margin-top: 60px; font-size: 28px; color: #fbbf24; letter-spacing: 2px; }
"""

def perk_groups(c):
    groups = {}
    for p in (c.get('perks') or []):
        groups.setdefault(p['cat'], []).append(p['text'])
    out = []
    for cat, items in groups.items():
        lis = ''.join(f'<li>{ESC(t)}</li>' for t in items)
        out.append(f'<div class="perk-group"><div class="perk-cat">{ESC(cat)}</div><ul>{lis}</ul></div>')
    return ''.join(out)

def detail_html(c):
    scene_tip = ''
    if '海外AI订阅' in (c.get('scenes') or []):
        scene_tip = ('<div class="scene-tip">🤖 <b>可用于海外订阅 ChatGPT / Grok / Claude 等</b>：'
                     '需 Visa / 万事达 / 运通外币卡，并在银行 App 开通「境外无卡支付」。</div>')
    note = f'<div class="card-note">📌 {ESC(c["note"])}</div>' if c.get('note') else ''
    return f"""
  <div class="modal-mask">
    <div class="modal">
      <span class="badge {TCLS[c['tier']]}">{TIERS[c['tier']]}</span>
      <h2>{ESC(c['cardName'])}</h2>
      <div class="card-bank">{ESC(c['bank'])} · {ESC(c['cardOrg'])}</div>
      <div class="card-line"><span>年费</span>{ESC(c.get('annualFee',''))}</div>
      <div class="card-line"><span>实际成本</span>{ESC(c.get('realCost',''))}</div>
      <div class="card-line"><span>核心权益</span>{ESC(c.get('benefits',''))}</div>
      {scene_tip}
      <div class="perk-wrap"><div class="perk-title">完整权益清单</div>{perk_groups(c)}</div>
      <div class="card-line"><span>办卡门槛</span>{ESC(c.get('eligibility',''))}</div>
      <div class="card-line"><span>核验状态</span><span class="verify ok">{ESC(c.get('verifyStatus',''))}</span> <small>({ESC(c.get('verifyDate',''))})</small></div>
      {note}
    </div>
  </div>"""

MODAL_CSS = """
  #app .modal-mask { background: #f8fafc; display:flex; align-items:center; justify-content:center; }
  #app .modal { width: 960px; max-height: 1300px; overflow:auto; }
  #app .modal h2 { font-size: 46px; }
  #app .card-line { font-size: 27px; }
  #app .perk-cat { font-size: 27px; }
  #app .perk-group li { font-size: 23px; }
  #app .scene-tip { font-size: 24px; }
"""

# ---------- 金卡（仅卡片内容，无标题） ----------
gold_img = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<link rel="stylesheet" href="../assets/css/style.css">
<style>{COMMON_CSS}{MODAL_CSS}</style></head><body>
  <div id="app">{detail_html(gold)}</div>
</body></html>"""

# ---------- 白金卡（仅卡片内容，无标题） ----------
plat_img = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<link rel="stylesheet" href="../assets/css/style.css">
<style>{COMMON_CSS}{MODAL_CSS}</style></head><body>
  <div id="app">{detail_html(plat)}</div>
</body></html>"""

# ---------- 选卡器推广（仅内容，无标题） ----------
PROMO_CSS = """
  #app { padding: 90px 100px; color:#0f172a; display:flex; flex-direction:column; justify-content:center; }
  #app .feat { font-size: 32px; line-height: 1.8; margin: 10px 0 40px; }
  #app .feat div { margin: 20px 0; }
  #app .linkbox { background:#f1f5f9; border:2px dashed #64748b; border-radius:16px; padding:30px 34px; }
  #app .linkbox .lab { font-size:24px; color:#64748b; margin-bottom:12px; }
  #app .linkbox .url { font-size:27px; font-weight:700; color:#0f172a; word-break:break-all; }
  #app .git { font-size:24px; color:#475569; margin-top:30px; word-break:break-all; }
"""
promo = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>{COMMON_CSS}{PROMO_CSS}</style></head><body>
  <div id="app">
    <div class="feat">
      <div>✅ 按银行 / 档位 / 年费 / 权益 / 场景筛选</div>
      <div>✅ 卡片详情含年费、实际成本、完整权益、核验状态</div>
      <div>✅ 两张卡并排对比，差异一眼看清</div>
      <div>✅ 数据开源可改，纯分享不引流</div>
    </div>
    <div class="linkbox">
      <div class="lab">国内可直连访问地址</div>
      <div class="url">https://1eef16fab2ac4107bb3f8b99daaec076.app.workbuddy.link/</div>
    </div>
    <div class="git">开源仓库（数据可改）：github.com/hidechinazqf/credit-card-selector</div>
  </div>
</body></html>"""

cover = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>{COMMON_CSS}</style></head><body>
  <div class="cap">
    <div class="k">信用卡选卡助手 · 数据更新</div>
    <div class="t">中信万豪联名卡<br>新增 2 张！</div>
    <div class="bullets">
      <div>🟢 <b>金卡</b>：免年费，送 5 房晚 + 银卡会籍</div>
      <div>🟡 <b>白金卡</b>：6800 刚性，15 房晚 + 2 晚 35000 分免房券</div>
    </div>
    <div class="foot">45 张卡 · 免费开源 · 一键对比</div>
  </div>
</body></html>"""

for name, content in [('xhs_cover', cover), ('xhs_gold', gold_img), ('xhs_plat', plat_img), ('xhs_promo', promo)]:
    open(f'promo/{name}.html', 'w', encoding='utf-8').write(content)
print('wrote xhs_cover / xhs_gold / xhs_plat / xhs_promo html')

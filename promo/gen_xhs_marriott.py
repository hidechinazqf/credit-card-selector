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

INFO_CSS = """
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { width: 1080px; height: 1350px; background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    overflow: hidden; }
  .wrap { padding: 84px 92px; height: 1350px; display: flex; flex-direction: column; }
  .tag { display: inline-block; font-size: 25px; color: #fff; background: var(--accent);
    border-radius: 10px; padding: 8px 18px; margin-bottom: 22px; }
  .title { font-size: 64px; font-weight: 800; color: #0f172a; }
  .sub { font-size: 30px; color: #64748b; margin-top: 14px; }
  .chips { display: flex; gap: 18px; margin: 42px 0 38px; flex-wrap: wrap; }
  .chip { background: #f1f5f9; border-radius: 16px; padding: 18px 26px; }
  .chip .lab { font-size: 23px; color: #94a3b8; }
  .chip .val { font-size: 31px; font-weight: 700; color: #0f172a; margin-top: 6px; }
  .pts { list-style: none; padding: 0; margin: 0; }
  .pts li { font-size: 29px; line-height: 1.6; color: #1e293b; margin: 20px 0;
    padding-left: 38px; position: relative; }
  .pts li::before { content: "•"; position: absolute; left: 6px; color: var(--accent); font-size: 34px; }
  .foot { margin-top: auto; font-size: 25px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 26px; }
"""

def infographic(c, accent, tag, subtitle, chips, points, foot):
    chip_html = ''.join(
        f'<div class="chip"><div class="lab">{lab}</div><div class="val">{val}</div></div>'
        for lab, val in chips)
    pts_html = ''.join(f'<li>{p}</li>' for p in points)
    return f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>{INFO_CSS}</style></head><body style="--accent:{accent}">
  <div class="wrap">
    <span class="tag">{tag}</span>
    <div class="title">{c['cardName']}</div>
    <div class="sub">{subtitle}</div>
    <div class="chips">{chip_html}</div>
    <ul class="pts">{pts_html}</ul>
    <div class="foot">{foot}</div>
  </div>
</body></html>"""

# ---------- 金卡（精简信息图，内容写进图里，不截断） ----------
gold_img = infographic(
    gold, '#047857', '新卡 ①', '免年费入门万豪',
    [('年费', '200 刷卡免'), ('会籍', '银卡'), ('房晚', '5 个')],
    ['年费 200 元：核卡 30 天内消费/取现 1 次免首年，首年再 5 次免次年 → 实际成本 0',
     '自动匹配万豪银卡会籍 + 5 个定级房晚',
     '酒店消费每 18 元得 2 分，其他合格消费每 18 元得 1 分',
     '万豪旗下住宿 / 购物 / 餐饮 9 折',
     '银联单币，无外币通道（不能海外订阅）'],
    '适合想低成本入门万豪、攒房晚保级的人')

# ---------- 白金卡（精简信息图，内容写进图里，不截断） ----------
plat_img = infographic(
    plat, '#b45309', '新卡 ②', '6800 刚性 · 保级神器',
    [('年费', '6800 刚性'), ('会籍', '金卡'), ('房晚', '15 个')],
    ['年费 6800 元，刚性不减免',
     '金卡会籍 + 15 个定级房晚',
     '每年 2 晚免房券（各 35000 分，京沪奢华酒店易用出 4000+）',
     '年合格消费满 50 万再送 1 晚 + 尊贵白金会籍',
     '酒店消费每 10 元得 3 分；每年 16 次机场 / 32 次高铁贵宾厅',
     'Visa 版可海外订阅 ChatGPT / Grok / Claude 等'],
    '适合高频住万豪、需要保级 / 冲刺白金会籍的人')

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

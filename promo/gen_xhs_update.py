#!/usr/bin/env python3
# 小红书单图：只说「选卡神器更新」，不提具体卡名/费用/外链，规避金融高风险审核。
# 竖图 1080x1350，纯静态 HTML，无 JS 依赖。
import json

N = len(json.load(open('data/cards.json', encoding='utf-8')))

HTML = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{ width: 1080px; height: 1350px; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }}
  .bg {{ width: 1080px; height: 1350px; background:
    linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
    display: flex; flex-direction: column; justify-content: center; padding: 0 96px; color: #fff; }}
  .k {{ display: inline-block; font-size: 26px; letter-spacing: 4px; color: #fbbf24;
    border: 2px solid #fbbf24; border-radius: 999px; padding: 8px 22px; margin-bottom: 30px; }}
  .t {{ font-size: 92px; font-weight: 800; line-height: 1.2; }}
  .t .em {{ color: #fbbf24; }}
  .sub {{ font-size: 32px; color: #cbd5e1; margin-top: 22px; line-height: 1.5; }}
  .card {{ margin-top: 56px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
    border-radius: 22px; padding: 40px 44px; }}
  .pts {{ list-style: none; padding: 0; margin: 0; }}
  .pts li {{ font-size: 31px; color: #e2e8f0; line-height: 1.5; margin: 22px 0;
    padding-left: 46px; position: relative; }}
  .pts li::before {{ content: "✓"; position: absolute; left: 6px; color: #34d399; font-size: 30px; font-weight: 800; }}
  .foot {{ margin-top: 52px; font-size: 28px; color: #fbbf24; letter-spacing: 2px; }}
</style></head><body>
  <div class="bg">
    <span class="k">选卡神器</span>
    <div class="t">更新啦 <span class="em">🎉</span></div>
    <div class="sub">本次新收录 2 张卡<br>卡库已扩至 {N} 张，持续维护中</div>
    <div class="card">
      <ul class="pts">
        <li>按银行 / 档位 / 权益 / 场景一键筛选</li>
        <li>每张卡都标清费用、权益、核验状态</li>
        <li>两张卡并排对比，差异一眼看清</li>
        <li>数据开源可改，纯分享不引流</li>
      </ul>
    </div>
    <div class="foot">关注我，评论区聊聊你手上的卡 👇</div>
  </div>
</body></html>"""

open('promo/xhs_update.html', 'w', encoding='utf-8').write(HTML)
print('wrote promo/xhs_update.html, total cards =', N)

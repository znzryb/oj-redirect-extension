/*
 * OJ Redirect content script (MV3)
 * 迁移自 tampermonkey userscript v1.5，改用 fetch 代替 GM_xmlhttpRequest。
 * 新增 clist 跳转按钮（仅 Codeforces / CodeChef）。
 */
(function () {
  'use strict';

  const BUTTON_STYLE_BASE = {
    position: 'fixed',
    right: '20px',
    padding: '10px 15px',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    zIndex: 10000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
  };

  const COLOR = {
    vjudge: '#28a745',
    luogu:  '#28a745',
    clist:  '#28a745',
    grayed: '#6c757d',
  };

  function createJumpButton({ url, label, id, top, color = COLOR.vjudge, grayed = false }) {
    if (!url) return;
    if (document.getElementById(id)) return;
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = label;
    Object.assign(btn.style, BUTTON_STYLE_BASE, {
      top,
      backgroundColor: grayed ? COLOR.grayed : color,
      opacity: grayed ? '0.6' : '1',
      cursor: grayed ? 'not-allowed' : 'pointer',
    });
    if (grayed) {
      btn.title = '目标 OJ 上未找到该题目';
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.addEventListener('mouseenter', () => (btn.style.opacity = '0.9'));
      btn.addEventListener('mouseleave', () => (btn.style.opacity = '1'));
      btn.addEventListener('click', () => window.open(url, '_blank'));
    }
    document.body.appendChild(btn);
  }

  async function checkLuoguProblemExists(luoguUrl) {
    // Luogu 的 SPA 首屏 HTML 里没有"出错啦"文本（那段是 Vue 运行时渲染的），
    // 只能靠 HTTP 状态码判断：200 = 存在，404 = 不存在。
    // 关键：luogu 有 302 反爬（第一次返回 302 到自己 + set-cookie C3VK），必须
    // credentials:'include' 保留 cookie 走完重定向才能拿到真实 status；
    // host_permissions 里已列入 https://www.luogu.com.cn/* 覆盖 CORS。
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(luoguUrl, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
        redirect: 'follow',
      });
      clearTimeout(to);
      if (resp.status === 404) return false;
      if (resp.ok) return true;
      console.warn('[OJ-Redirect] luogu unexpected status:', resp.status, luoguUrl);
      return true; // 保守：未知状态不误伤
    } catch (e) {
      console.warn('[OJ-Redirect] luogu probe failed:', e);
      return true;
    }
  }

  async function createLuoguButtonWithCheck(luoguUrl, id, top) {
    const exists = await checkLuoguProblemExists(luoguUrl);
    if (exists) {
      createJumpButton({ url: luoguUrl, label: 'Jump to Luogu', id, top, color: COLOR.luogu });
    } else {
      createJumpButton({ url: luoguUrl, label: 'luogu 未找到', id, top, color: COLOR.luogu, grayed: true });
    }
  }

  // clist 跳转 URL 构造
  // CF (含 gym) 走 codeforces.com + atcoder resource=64 双搜（沿用 OJBetter 惯例，含 gym 时命中率更好）
  //   resource=1 = codeforces.com
  //   resource=64 = atcoder.jp（保留 OJBetter 的用法，不影响，主命中还是 CF）
  // CodeChef 直接全站 search，不加 resource（避免 resource id 记错）
  function clistUrlForCf(contestId, index) {
    const q = encodeURIComponent(`${contestId}${index}`);
    return `https://clist.by/problems/?search=${q}&resource=1&resource=64`;
  }
  function clistUrlForCodeChef(code) {
    return `https://clist.by/problems/?search=${encodeURIComponent(code)}`;
  }

  // —— Div2 → Div1 转换辅助 ————————————————————————————
  function isStandaloneDivision2() {
    const el = document.querySelector('.contest-name') || document.querySelector('#sidebar .rtable a');
    if (!el) return false;
    const name = el.textContent.trim();
    if (name.includes('Div. 2') && !name.includes('+')) {
      if (name.includes('Div. 3') || name.includes('Div. 4')) return false;
      return true;
    }
    return false;
  }

  function extractRoundIdentifier(name) {
    const eduMatch = name.match(/Educational.*?Round\s+(\d+)/i);
    if (eduMatch) return `Educational Round ${eduMatch[1]}`;
    const roundMatch = name.match(/Round\s+(\d+)/i);
    if (roundMatch) return `Round ${roundMatch[1]}`;
    return null;
  }

  async function verifyDiv1Contest(div1ContestId, div2ContestName) {
    try {
      const resp = await fetch(`https://codeforces.com/contest/${div1ContestId}`, { credentials: 'omit' });
      if (!resp.ok) return false;
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const el = doc.querySelector('.contest-name') || doc.querySelector('#sidebar .rtable a');
      if (!el) return false;
      const div1Name = el.textContent.trim();
      const a = extractRoundIdentifier(div2ContestName);
      const b = extractRoundIdentifier(div1Name);
      return !!(a && b && a === b);
    } catch (e) {
      console.warn('[OJ-Redirect] verify Div1 failed:', e);
      return false;
    }
  }

  async function fetchDiv1Problems(div1ContestId) {
    try {
      const api = `https://codeforces.com/api/contest.standings?contestId=${div1ContestId}&from=1&count=1`;
      const resp = await fetch(api, { credentials: 'omit' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'OK' && data.result && data.result.problems) {
          return data.result.problems.map(p => ({ index: p.index, name: p.name }));
        }
      }
    } catch (e) {
      console.warn('[OJ-Redirect] api fetch failed:', e);
    }
    // 备用：抓 contest 页面
    try {
      const resp = await fetch(`https://codeforces.com/contest/${div1ContestId}`, { credentials: 'omit' });
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const list = [];
      doc.querySelectorAll('.problems td.id a').forEach(link => {
        const idx = link.textContent.trim();
        const row = link.closest('tr');
        const nameEl = row && row.querySelector('td:nth-child(2) a');
        if (nameEl) list.push({ index: idx, name: nameEl.textContent.trim() });
      });
      return list;
    } catch (e) {
      console.warn('[OJ-Redirect] scrape contest page failed:', e);
      return [];
    }
  }

  function findMatchingDiv1Problem(currentName, div1Problems) {
    const clean = s => s.replace(/^[A-Z]\d?\.\s*/, '').trim();
    const target = clean(currentName);
    for (const p of div1Problems) if (clean(p.name) === target) return p.index;
    return null;
  }

  // —— 路由 ————————————————————————————
  const { host, pathname } = window.location;

  // CodeChef
  if (host.includes('codechef.com')) {
    const parts = pathname.split('/').filter(Boolean); // ['problems', 'CODE']
    const code = (parts[1] || '').split('?')[0];
    if (!code) return;
    createJumpButton({
      url: `https://vjudge.net/problem/CodeChef-${code}`,
      label: 'Jump to VJudge', id: 'vj-redirect-btn', top: '100px', color: COLOR.vjudge,
    });
    createJumpButton({
      url: clistUrlForCodeChef(code),
      label: 'Jump to clist', id: 'clist-redirect-btn', top: '150px', color: COLOR.clist,
    });
    return;
  }

  // QOJ
  if (host === 'qoj.ac') {
    let pid = '';
    let m = pathname.match(/^\/problem\/(\d+)\/?$/);
    if (m) pid = m[1];
    else {
      m = pathname.match(/^\/contest\/(\d+)\/problem\/(\d+)\/?$/);
      if (m) pid = m[2];
    }
    if (!pid) return;
    createJumpButton({
      url: `https://vjudge.net/problem/QOJ-${pid}`,
      label: 'Jump to VJudge', id: 'vj-redirect-btn', top: '100px', color: COLOR.vjudge,
    });
    return;
  }

  // Codeforces
  if (host === 'codeforces.com') {
    let contestId = '', problemIndex = '', isGym = false, isContest = false;

    let m = pathname.match(/^\/contest\/(\d+)\/problem\/([A-Z]\d?)\/?$/i);
    if (m) { contestId = m[1]; problemIndex = m[2].toUpperCase(); isContest = true; }
    else {
      m = pathname.match(/^\/problemset\/problem\/(\d+)\/([A-Z]\d?)\/?$/i);
      if (m) { contestId = m[1]; problemIndex = m[2].toUpperCase(); }
      else {
        m = pathname.match(/^\/gym\/(\d+)\/problem\/([A-Z]\d?)\/?$/i);
        if (m) { contestId = m[1]; problemIndex = m[2].toUpperCase(); isGym = true; }
      }
    }
    if (!contestId || !problemIndex) return;

    const buildButtons = async (cfContestId, cfIndex) => {
      const luoguUrl = `https://www.luogu.com.cn/problem/CF${cfContestId}${cfIndex}`;
      const vjudgeUrl = isGym
        ? `https://vjudge.net/problem/Gym-${contestId}${problemIndex}`
        : `https://vjudge.net/problem/CodeForces-${contestId}${problemIndex}`;
      const clistUrl = clistUrlForCf(cfContestId, cfIndex);
      await createLuoguButtonWithCheck(luoguUrl, 'luogu-redirect-btn', '100px');
      createJumpButton({ url: vjudgeUrl, label: 'Jump to VJudge', id: 'vj-redirect-btn', top: '150px', color: COLOR.vjudge });
      createJumpButton({ url: clistUrl,  label: 'Jump to clist',  id: 'clist-redirect-btn', top: '200px', color: COLOR.clist });
    };

    (async () => {
      if (isContest && isStandaloneDivision2()) {
        try {
          const titleEl = document.querySelector('.problem-statement .title') || document.querySelector('.header .title');
          const contestEl = document.querySelector('.contest-name') || document.querySelector('#sidebar .rtable a');
          if (titleEl && contestEl) {
            const currentName = titleEl.textContent.trim();
            const div2Name = contestEl.textContent.trim();
            const div1Id = String(parseInt(contestId) - 1);
            if (await verifyDiv1Contest(div1Id, div2Name)) {
              const div1Problems = await fetchDiv1Problems(div1Id);
              if (div1Problems.length) {
                const idx = findMatchingDiv1Problem(currentName, div1Problems);
                if (idx) {
                  console.log(`[OJ-Redirect] Div2→Div1: ${div1Id}${idx}`);
                  await buildButtons(div1Id, idx);
                  return;
                }
              }
            }
          }
        } catch (e) {
          console.warn('[OJ-Redirect] Div2→Div1 failed:', e);
        }
      }
      await buildButtons(contestId, problemIndex);
    })();
    return;
  }
})();

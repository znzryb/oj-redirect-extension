/*
 * OJ Redirect background service worker (MV3)
 * luogu 题目存在性探测必须在这里做：content script 的 fetch 受页面 origin 的
 * CORS 限制（Chrome 85+ host_permissions 不再豁免 content script），luogu 不回
 * Access-Control-Allow-Origin，content script 里 fetch 直接抛 Failed to fetch。
 * 只有 service worker 的 fetch 走 host_permissions 豁免，等价油猴 GM_xmlhttpRequest。
 */

async function probeLuogu(url) {
  // luogu 有 302 反爬（首跳 set-cookie C3VK 再重定向回自己），credentials:'include'
  // 带上 cookie 走完重定向才能拿到真实 status：200 = 存在，404 = 不存在。
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'include',
      redirect: 'follow',
    });
    clearTimeout(to);
    if (resp.status === 404) return false;
    if (resp.ok) return true;
    console.warn('[OJ-Redirect] luogu unexpected status:', resp.status, url);
    return true; // 保守：未知状态不误伤
  } catch (e) {
    console.warn('[OJ-Redirect] luogu probe failed:', e);
    return true;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'probeLuogu' && typeof msg.url === 'string') {
    probeLuogu(msg.url).then(exists => sendResponse({ exists }));
    return true; // 异步 sendResponse
  }
});

# luogu 探测永远绿色：content script fetch 过不了 CORS（2026-07-15）

**现象**：CF2244A（洛谷上不存在）的题目页，扩展仍显示绿色「Jump to Luogu」；同逻辑的油猴脚本 v1.5 却能正确显示灰色「luogu 未找到」。此前多轮修复（换 DOM 文本检测、加 `credentials:'include'` 走 302 反爬）都没用。

**根因**：MV3 下 **content script 的 `fetch` 受宿主页面 origin 的 CORS 限制**——Chrome 85 起 `host_permissions` 只豁免 background service worker，不再豁免 content script。luogu 不返回 `Access-Control-Allow-Origin`，所以在 codeforces.com 页面里对 `www.luogu.com.cn` 的 fetch 根本拿不到响应，直接抛 `TypeError: Failed to fetch`，落进 catch 的保守分支 `return true` → 按钮永远绿。油猴的 `GM_xmlhttpRequest` 由扩展进程代发、天生绕 CORS，所以脚本版没这个问题。

**为什么之前的修复全部无效**：302 反爬、DOM 检测、credentials 这些都是在调「响应怎么解读」，而真实故障在传输层——请求压根没成功过。控制台里其实一直有 `[OJ-Redirect] luogu probe failed: TypeError: Failed to fetch` 的 warn，只是没人看。

**修法**（`4ca1555`）：探测下沉到 background service worker——新增 `background.js` 注册 `chrome.runtime.onMessage` 处理 `{type:'probeLuogu', url}`，在 SW 里 fetch（`credentials:'include'` + `redirect:'follow'` 走完 luogu 302 反爬），content script 改为 `chrome.runtime.sendMessage` 拿结果。状态码判定不变：404 = 不存在，200 = 存在，其它保守按存在处理。

**验证**：curl 带 cookie 走完重定向，CF2244A → 404、CF1000A → 200，与判定口径一致。

**教训**：
1. MV3 扩展里凡是要跨域请求第三方站点（无 CORS 头），**必须走 background service worker**，content script 直接 fetch 是死路——这是油猴脚本移植到 MV3 扩展的头号陷阱。
2. 探测类逻辑失效时，先看 console 里 catch 分支的 warn 输出确认「请求到底成功没有」，再去调响应解析。
3. 「保守策略默认 true」会把传输层故障静默吞成功能性错觉（按钮绿但其实从没探测成功过）——保守分支必须配 console.warn，且排查时第一个看它。

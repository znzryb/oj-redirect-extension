# Project CLAUDE.md — oj-redirect-extension

给未来自己 / AI 看的项目级硬规则，不是给最终用户看的（这些细节**不**写进 README）。

## Chrome 加载路径：`~/chrome-extensions/oj-redirect-extension/`

Chrome / Edge 里加载的是 **`~/chrome-extensions/oj-redirect-extension/`**，**不是**本仓库目录 `~/Documents/GitHub/oj-redirect-extension/`。

对齐全局 `~/.claude/CLAUDE.md`「浏览器插件 build 后必须覆盖到用户级 Chrome extensions 目录」：

- 首次装：
  ```bash
  mkdir -p ~/chrome-extensions/oj-redirect-extension
  cp -R manifest.json content.js background.js icons ~/chrome-extensions/oj-redirect-extension/
  ```
  然后 `chrome://extensions` → 开发者模式 → 加载已解压 → 选 `~/chrome-extensions/oj-redirect-extension/`。
- **每次改 `manifest.json` / `content.js` / `background.js` / `icons/` 之后**都要重跑上面那条 `cp -R` 覆盖过去，再让用户在 `chrome://extensions` 点该扩展的**重新加载**按钮（弯箭头），改动才真正生效。**只改仓库不 cp = 用户 Chrome 里跑的还是旧代码**。
- 拿不准 Chrome 实际加载路径时，读 `~/Library/Application Support/Google/Chrome/<Profile>/Secure Preferences` 里 `extensions.settings.<id>.path` 字段确认。

## 需要同步的文件清单

只 cp 扩展运行时需要的东西，其它（README、LICENSE、third-party/、.git/、.claude/ 等）不进用户级目录：

```
manifest.json
content.js
background.js    # service worker：luogu 探测（content script fetch 过不了 CORS）
icons/           # 16/48/128 png
```

新增运行时文件（例如加 `background.js` / `styles.css` / `popup.html`）时要**同时更新本清单**和 cp 命令。

## Bug 记录惯例：`docs/bug/`

每个排查过的 bug 记一个文件到 `docs/bug/<YYYY-MM-DD>-<slug>.md`，内容含：现象、根因、为什么之前的修复无效（如适用）、修法（带 commit hash）、验证、教训。修完非平凡 bug 后主动补一条，这是项目传统。

## 参考项目

`third-party/OJBetter/`（beijixiaohu/OJBetter）已被 `.gitignore` 挡住。抄 clist / rating / CF-Better 相关实现时先看 `third-party/OJBetter/script/release/codeforces-better.user.js`。

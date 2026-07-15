# OJ Redirect Extension

在 **CodeChef / QOJ / Codeforces** 题目页添加悬浮跳转按钮，一键跳到：

| 平台 | VJudge | Luogu | clist |
|---|:---:|:---:|:---:|
| Codeforces（含 problemset / gym） | ✅ | ✅（探测题目是否存在，不存在灰显）| ✅ |
| CodeChef | ✅ | — | ✅ |
| QOJ（含 contest 内） | ✅ | — | — |

Codeforces Div. 2 单独场（不含 `Div. 3/4` / `+`）会自动尝试匹配到对应的 Div. 1 contest，找到同名题目后按 Div. 1 编号跳转 Luogu / clist。

## 安装（本地开发版 unpacked）

> **加载路径不是这个仓库目录**，是用户级 `~/chrome-extensions/oj-redirect-extension/`（跟本机其它 unpacked 插件同放一处，规则见全局 CLAUDE.md「浏览器插件 build 后必须覆盖到用户级 Chrome extensions 目录」）。

1. 把仓库产物同步到用户级目录：
   ```bash
   mkdir -p ~/chrome-extensions/oj-redirect-extension
   cp -R manifest.json content.js icons ~/chrome-extensions/oj-redirect-extension/
   ```
2. 打开 `chrome://extensions`（或 Edge `edge://extensions`）
3. 右上角打开「开发者模式 / Developer mode」
4. 点「加载已解压的扩展程序 / Load unpacked」，选中 `~/chrome-extensions/oj-redirect-extension/`
5. 打开任意 CodeChef / QOJ / Codeforces 题目页，右上应出现悬浮按钮

## 修改仓库后同步（否则改动不生效）

Chrome 加载的是 `~/chrome-extensions/...` 那份，不是仓库。改完仓库要覆盖：
```bash
cp -R manifest.json content.js icons ~/chrome-extensions/oj-redirect-extension/
```
然后在 `chrome://extensions` 里对本扩展点「重新加载」按钮。

## 从旧的 tampermonkey 脚本迁移

原脚本：Greasy Fork `CodeChef/QOJ/Codeforces → VJudge/Luogu Redirect` v1.5。
本仓库以 MV3 扩展形式重写，用 `fetch` 替换 `GM_xmlhttpRequest`，功能等价并新增 clist 跳转按钮。**装完扩展记得先禁用旧的油猴脚本**，避免两份按钮同时出现。

## clist 跳转 URL 约定

- CF：`https://clist.by/problems/?search=<contest_id><index>&resource=1&resource=64`
- CodeChef：`https://clist.by/problems/?search=<code>`（不加 resource，跨全站搜）

参考项目：[beijixiaohu/OJBetter](https://github.com/beijixiaohu/OJBetter) 里 Codeforces-Better 对 clist 的用法。

## 目录结构

```
manifest.json      # MV3 manifest
content.js         # 主逻辑（原油猴脚本迁移版）
icons/             # 16/48/128 占位图标
third-party/       # 参考项目本地 clone，被 .gitignore
```

## License

GPL-3.0（与原油猴脚本一致）。

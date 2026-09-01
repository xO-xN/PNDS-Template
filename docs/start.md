# 开始一件新作品（初始化流程）

触发：创作者把崭新的 PNDS Template 交给你并说「开始 / 开始工作 / start / 新建作品」。本流程做**身份转正与骨架验证**，不删示例代码——示例在创作中被逐步替换，期间的参照与运行价值保留（开始后仍可 `npm run dev:none` 试跑示例）。

作者名落在 `package.json` 的 `author`（npm 标准字段）：`manifest.json` 的 schema 由 PNDS App 校验，当前没有 author 字段，不自行添加。

## 1. 采集作品身份

向创作者要三样：**作品名**、**作者名**、**一句话简介**；顺带问创作构想（可空，占位即可）。

完成判据：作品名与作者名在手。

## 2. 身份转正（一次改全）

- `manifest.json`：`id`（kebab-case，与作品名对应）、`name`、`description`、`version` 重置为 `0.1.0`。字段规则见 AGENTS.md 指针表的 manifest.md。
- `package.json`：`name`、`description`、`author`。
- `public/shared.js`：`tokenKey` 改为与 `id` 一致（如 `"<id>-token"`），避免不同工程共用 localStorage 键。
- `README.md`：标题与两语简介换成新作品。
- `AGENTS.md` 与 `docs/implementation.md` 导语中的「PNDS Template」字样换成作品名（指针表、骨架不变量原样保留）。

`.github/workflows/package.yml` 的发布身份（BUNDLE 目录名、产物名）**此刻不改**——发布前再改，见第 5 步。

完成判据：`grep -ri "pnds-template\|PNDS Template"` 除 `.github/workflows/package.yml` 与示例决策记录外零命中。

## 3. 文档转正

- `docs/implementation.md`：「作品规格」节替换为创作者构想；没有构想就写「初始规格待定——与创作者共同定义后回填」占位，别保留示例规格冒充当前规格。
- `AGENTS.md`「示例的决策记录」横幅已在，无需逐条清理——随作品分叉自然改写。

完成判据：implementation.md 不再把双推子示例描述为本作品的规格。

## 4. 安装与验证

```sh
npm install
npm run check
npm test
```

完成判据：三条命令零失败（模板不预装 `node_modules/`，PNDS App 也不执行安装）。

## 5. 交接

请创作者在 PNDS App 里 **Open** 本目录，确认 preflight 通过、health ready（真机验证由创作者做）。汇报：改了哪些身份位置、作品规格现状（占位 / 初稿）、建议下一步——从 implementation.md「创作时改什么」表入手，或先定 `manifest.json` 的 `audio.outputChannels`。

发布前再回来：把 `.github/workflows/package.yml` 里的 BUNDLE 目录名与产物名改为作品名（发布流程与检查清单见创作指南）。

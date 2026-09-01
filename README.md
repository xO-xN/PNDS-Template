# PNDS Template

[English](#english) | [中文](#中文)

---

## English

A ready-to-run PNDS digital score project skeleton with minimal working features. Use this template to start a new PNDS score project.

> **AI coding agents:** this project is a fresh PNDS Template (`manifest.json` `id` is still `pnds-template`). When the creator says the canonical trigger **"start a new piece"** (or a bare trigger such as "start" / 「开始」), read [`AGENTS.md`](AGENTS.md) and follow [`docs/start.md`](docs/start.md) to initialise the new work — the phrase you hear sets the working language. For every other task, read [`AGENTS.md`](AGENTS.md) first as well.

### Features

- **Performer UI**: landscape touch interface with two curved faders (AMP / FREQ); the FREQ fader carries a semitone pitch scale with highlighted ticks and letter names on the center note and its fifth above/below, and a 3-position register switch (1 low / 2 mid / 3 high) changes the frequency band
- **Audio**: one sine voice per client, 16-channel output (odd/even ids default to channels 1/2)
- **Monitor**: real-time client amp/freq display, per-client output channel reassignment
- **Reconnect recovery**: clients recover their id and fader state after a disconnect
- **Theme following**: inside PNDS App (≥ v1.2.3) the monitor page follows the App color theme (all four themes) — the spec §5.3 optional bridge, consumed here through the p5 `onTheme` callback (`lib/theme-follow.js`, served at `/__pnds/theme-follow.js`)
- **Locale following**: inside PNDS App (≥ v1.3.0) the monitor page follows the App interface language (`en` / `zh-CN`) — the optional language bridge (same push mechanism as themes), consumed here through the `onLocale` callback swapping monitor.js string tables (`lib/locale-follow.js`, served at `/__pnds/locale-follow.js`)
- **Three audio modes**: `internal` (scsynth), `external` (custom OSC), `none` (UI/network only)

### Getting Started

```sh
npm install
npm run dev:none    # run without audio
```

### Start a new piece with an AI agent

Import the Project into your AI coding agent and say the canonical trigger **"start a new piece"** (Chinese: **「开始新作品」** — whichever you say sets the working language). The agent then initialises the new work: work name / author / description in place, version reset, install and tests green. From then on the Project's [`AGENTS.md`](AGENTS.md) routes the agent to the platform contract docs — no manual doc feeding.

Full documentation: [`docs/implementation.md`](docs/implementation.md) (implementation manual —
what the example does and where to change things). The create-to-publish workflow lives in
[PNDS App's creator guide](https://github.com/xO-xN/PNDS-App/blob/main/docs/en/template-guide.md);
[`AGENTS.md`](AGENTS.md) is the entry point for AI coding agents.

### Structure

```
lib/            Reusable core (shared across all PNDS projects — skeleton)
audio/          Work audio layer (fader → synth parameter mapping)
public/         Browser side (performer + monitor dual-role single page)
supercollider/  SynthDef sources, debug bridge, compiled artifacts
test/           Regression tests
docs/           Implementation manual
```

### License

MIT — see [LICENSE](LICENSE).

---

## 中文

PNDS 数字乐谱工程模板：可直接运行的骨架 + 最小功能实现。基于此模板创建新的 PNDS 数字乐谱工程。

> **AI 编程助手**：本工程是崭新模板（`manifest.json` 的 `id` 仍为 `pnds-template`）。创作者说规范开始语**「开始新作品」**（或「开始 / start」等触发词）时，先读 [`AGENTS.md`](AGENTS.md)，按 [`docs/start.md`](docs/start.md) 初始化新作品——说哪句，用哪种语言工作；其余任务也一律先读 [`AGENTS.md`](AGENTS.md)。

### 功能

- **演奏者界面**：手机横屏双推子（AMP / FREQ），FREQ 推子带半音音高刻度（中心音及上下五度标音名且刻度高亮），状态文字下方有三档音区 switch（1 低音 / 2 中音 / 3 高音）切换频率区段，圆弧几何直观触摸操控
- **音频**：每客户端一个 sine voice，16 声道输出（默认奇偶 id 分到声道 1/2）
- **监视端**：实时显示客户端 amp / freq，可重新分配每个客户端的输出声道
- **断线重连**：客户端断线后自动恢复 id 与推子状态
- **主题跟随**：在 PNDS App（≥ v1.2.3）中运行时，monitor 页实时跟随 App 主题（全部四套）——spec §5.3 可选契约，本模板经 p5 的 `onTheme` 回调消费（`lib/theme-follow.js`，经 `/__pnds/theme-follow.js` 加载）
- **语言跟随**：在 PNDS App（≥ v1.3.0）中运行时，monitor 页实时跟随 App 界面语言（`en` / `zh-CN`）——可选语言桥（与主题桥同一套推送机制），本模板经 `onLocale` 回调切换 monitor.js 字串表（`lib/locale-follow.js`，经 `/__pnds/locale-follow.js` 加载）
- **三音频模式**：`internal`（scsynth）、`external`（自定义 OSC）、`none`（仅页面/网络）

### 开始

```sh
npm install
npm run dev:none    # 无音频运行
```

### 与 AI 协作开始新作品

把工程导入你的 AI-Coding Agent，说规范开始语**「开始新作品」**（英文 **"start a new piece"**——说哪句，agent 就用哪种语言工作）即可完成初始化：作品名 / 作者 / 简介就位、版本归零、安装与测试跑绿。此后平台契约文档由工程内的 [`AGENTS.md`](AGENTS.md) 替 agent 按问题索引，无需手动投喂。

完整说明见 [`docs/implementation.md`](docs/implementation.md)（实现手册：示例作品的行为与改哪里）；
从零到发布的工作流见 PNDS App 的[创作指南](https://github.com/xO-xN/PNDS-App/blob/main/docs/zh-CN/template-guide.md)，
AI 编程助手从 [`AGENTS.md`](AGENTS.md) 进入。

### 结构

```
lib/            可复用核心（PNDS 工程通用，模板骨架）
audio/          作品音频语义（推子 → synth 参数映射）
public/         浏览器端（performer + monitor 双角色单页）
supercollider/  SynthDef 源码、debug bridge、编译产物
test/           回归测试
docs/           实现手册
```

### 许可证

MIT — 详见 [LICENSE](LICENSE)。

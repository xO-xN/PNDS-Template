# PNDS Template

PNDS 数字乐谱工程模板：可直接运行的骨架 + 最小功能实现。

- 演奏者界面：手机横屏双推子（AMP / FREQ）
- 每客户端一个 sine voice，16 声道输出（默认奇偶 id 分到声道 1/2）
- Monitor 端实时显示客户端 amp / freq，可重新分配输出声道
- 断线重连自动恢复客户端 id 与推子状态
- 三音频模式：internal / external / none

## 开始

```sh
npm install
npm run dev:none    # 无音频运行
```

完整说明见 [`docs/creator-guide.md`](docs/creator-guide.md)（创作指南）与
[`docs/handoff.md`](docs/handoff.md)（开发交接笔记）。

## 结构

```
lib/        可复用核心（PNDS 工程通用，模板骨架）
audio/      作品音频语义（推子 → synth 参数映射）
public/     浏览器端（performer + monitor 双角色单页）
supercollider/  SynthDef 源码、debug bridge、编译产物
test/       回归测试
docs/       指南与交接文档
```

# 架构巡检 HTML 报告

把报告写成一个 HTML 文件。页首放仓库名、日期和简短图例，正文按候选分卡片，末尾给首选建议。以下是一个可替换的示例，生成报告时用真实文件、调用关系和证据替换示例内容。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>订单仓库 · 架构巡检</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</head>
<body class="bg-stone-50 text-slate-900">
  <main class="mx-auto max-w-5xl space-y-10 px-6 py-10">
    <header>
      <h1 class="text-3xl font-semibold">订单仓库 · 架构巡检</h1>
      <p>检查日期（填写实际日期） · 实线框表示模块，虚线箭头表示调用方直接接触的内部步骤。</p>
    </header>
    <section aria-label="候选项">
      <article id="order-intake" class="space-y-3 rounded border bg-white p-5">
        <h2 class="text-xl font-semibold">集中订单受理规则</h2>
        <p>值得探索 · 进程内依赖</p>
        <p>涉及文件 <code>orders/intake.ts</code>、<code>orders/import.ts</code></p>
        <p>两个入口都要按同一顺序校验和计价。可将这段顺序收进订单受理模块。</p>
        <div class="grid gap-4 md:grid-cols-2">
          <figure><figcaption>改造前</figcaption>
            <pre class="mermaid">
flowchart TD
  A[在线下单] -.-> V[校验]
  B[批量导入] -.-> V
  A -.-> P[计价]
  B -.-> P
            </pre>
          </figure>
          <figure><figcaption>改造后</figcaption>
            <pre class="mermaid">
flowchart TD
  A[在线下单] --> I[订单受理]
  B[批量导入] --> I
  I --> V[校验]
  I --> P[计价]
            </pre>
          </figure>
        </div>
        <p>规则顺序只在一处维护。两个入口可用同一组受理行为用例验证。</p>
      </article>
    </section>
    <section aria-label="首选建议">
      <h2 class="text-xl font-semibold">首选建议</h2>
      <p>先看<a href="#order-intake">订单受理</a>，因为它同时影响在线下单和批量导入。</p>
    </section>
  </main>
</body>
</html>
```

## 每张卡片写什么

- 用一个动作说明改造方向。给出推荐程度和依赖类型。依赖分为进程内计算、本地可替代的依赖、自有远程服务（端口和适配器）、第三方服务（模拟适配器）。
- 列出涉及文件，尽量定位到真实调用或测试。一句话写清问题，一句话说明将集中哪部分职责。把具体方法签名留给后续设计。
- 用并排图展示同一场景的前后变化。收益要可核对，例如“修改定价规则只动一个模块”或“两类调用方共用同一组测试”。涉及重开 ADR 时，单列编号和理由。
- 推荐程度分别使用绿色、琥珀色、灰色，并保留文字标签。首选建议以一句话说明排序理由，链接到对应卡片。

## 图怎么选

| 想表达的问题 | 画法 |
| --- | --- |
| 调用、依赖或跨进程往返 | 用 Mermaid 流程图或时序图，标明调用方向和次数。 |
| 行为沿多层薄模块逐层转发 | 用横向色带画剖面，对照合并后承担完整职责的模块。 |
| 接口要求调用方了解太多 | 每个模块画两个矩形，分别表示调用方需要掌握的接口和模块封装的行为。大小只作示意。 |
| 重构后许多调用成为内部细节 | 用嵌套方框表示调用树，改造后把内部步骤收进同一个框。 |
| 自动排版难以表达接缝或职责 | 用 CSS 方框和内联 SVG 箭头。实线表示模块，虚线表示接缝，红箭头突出泄漏，图例与实际用法保持一致。 |

图面留出空白，每幅图以约 320 像素高为参考，窄屏上下排列。业务名沿用词汇表，架构说明统一用模块、接口、实现、深浅、接缝和适配器。用调用方少记了什么、维护者少改了几处来表达收益。

上游示例通过 CDN 加载 Tailwind 和 Mermaid，打开时需要网络。需要离线交付时，改用内联 CSS 和 SVG 画同样的前后图。报告保持静态，引用源码、路径或项目术语时按 HTML 文本转义。

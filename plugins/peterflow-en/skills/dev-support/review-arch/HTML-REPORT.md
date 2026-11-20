# Architecture review report

Deliver one static HTML file. Header: repository or subsystem, inspection date and a small diagram legend. Follow with one card per candidate and end with a linked first recommendation. A card contains the real source paths, concrete caller evidence, dependency type, current difficulty, proposed direction and who benefits. Use “Recommended”, “Worth exploring” and “Needs evidence” as visible text, optionally colored green, amber and gray. Identify any existing decision this would reopen.

Draw one scenario twice, side by side on wide screens and stacked on narrow screens. Use arrows for calls, horizontal layers for forwarding, nested boxes for implementation details and labelled seams for replaceable behavior. State what knowledge moves and which places still need to change. Distinguish in-process dependencies, local substitutes, owned remote services and third-party services.

A minimal offline card can use HTML and CSS:

```html
<article id="order-intake">
  <h2>Centralize order intake</h2>
  <p>Worth exploring · In process</p>
  <p><code>orders/import.ts</code> and <code>orders/checkout.ts</code>
    both know that validation must precede pricing.</p>
  <div class="comparison">
    <figure><figcaption>Today</figcaption>
      <pre>Checkout → Validate → Price
Import   → Validate → Price</pre></figure>
    <figure><figcaption>Proposed</figcaption>
      <pre>Checkout ─┐
          ├→ Intake → Validate → Price
Import   ─┘</pre></figure>
  </div>
  <p>Both callers can share the same acceptance tests for intake.</p>
</article>
```

Replace the example with actual paths and relationships. Name the benefit and draw the paths that establish it. Escape source text, paths and labels for HTML. Use inline CSS and SVG for offline delivery. A connected report may use Mermaid. Choose diagrams that work at a glance with readable labels and enough space between modules.

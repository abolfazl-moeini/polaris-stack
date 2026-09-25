import { h, render } from "preact";
import { useState } from "preact/hooks";
import { __ } from "@wordpress/i18n";

interface CounterProps {
  initialCount?: number;
  step?: number;
}

export function CounterIsland({ initialCount = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div class="ps-card">
      <div class="ps-stack">
        <h3 class="ps-card__title">شمارنده تعاملی (Preact Island)</h3>
        <div class="ps-badge" data-variant="info">
          تعداد: <span id="preact-count-val">{count}</span>
        </div>
        <div class="ps-cluster">
          <button
            type="button"
            id="preact-btn-inc"
            class="ps-button"
            data-variant="primary"
            onClick={() => setCount((c) => c + step)}
          >
            افزایش (+1)
          </button>
          <button
            type="button"
            id="preact-btn-dec"
            class="ps-button"
            data-variant="secondary"
            onClick={() => setCount((c) => c - step)}
          >
            کاهش (-1)
          </button>
        </div>
      </div>
    </div>
  );
}

// Auto-hydrate / mount into the SSR island container
if (typeof document !== "undefined") {
  const container = document.getElementById("preact-counter-island");
  if (container) {
    const rawProps = container.getAttribute("data-props");
    const props = rawProps ? JSON.parse(rawProps) : {};
    render(<CounterIsland {...props} />, container);
  }
}

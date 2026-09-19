/**
 * @wpdev/polaris-stack: islands/tabs.ts
 * Vanilla Light-DOM Micro-Controller for accessible WAI-ARIA tabs with Roving Tabindex.
 * Footprint: ~1.5 KB unminified, zero dependencies.
 */

export class PolarisTabsController {
  private container: HTMLElement;
  private tablist: HTMLElement | null;
  private tabs: HTMLElement[];
  private panels: HTMLElement[];

  constructor(container: HTMLElement) {
    this.container = container;
    this.tablist = container.querySelector('[role="tablist"]');
    this.tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));

    if (this.tablist && this.tabs.length > 0) {
      this.init();
    }
  }

  private init(): void {
    this.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => this.selectTab(index));
      tab.addEventListener("keydown", (e: KeyboardEvent) => this.handleKeydown(e, index));
    });
  }

  private selectTab(index: number): void {
    this.tabs.forEach((tab, i) => {
      const isSelected = i === index;
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
        tab.focus();
      }
    });

    this.panels.forEach((panel, i) => {
      const isSelected = i === index;
      panel.hidden = !isSelected;
      if (isSelected) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    this.container.dispatchEvent(
      new CustomEvent("ps:tab-change", {
        detail: { activeIndex: index, activeTab: this.tabs[index] },
        bubbles: true,
      })
    );
  }

  private handleKeydown(e: KeyboardEvent, currentIndex: number): void {
    const isRtl = document.documentElement.dir === "rtl" || this.container.closest('[dir="rtl"]') !== null;
    let nextIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = isRtl ? this.getPrevIndex(currentIndex) : this.getNextIndex(currentIndex);
        break;
      case "ArrowLeft":
        nextIndex = isRtl ? this.getNextIndex(currentIndex) : this.getPrevIndex(currentIndex);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = this.tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.selectTab(nextIndex);
  }

  private getNextIndex(index: number): number {
    return (index + 1) % this.tabs.length;
  }

  private getPrevIndex(index: number): number {
    return (index - 1 + this.tabs.length) % this.tabs.length;
  }
}

// Auto-initialize on DOM ready
export function initPolarisTabs(root: ParentNode = document): void {
  const containers = root.querySelectorAll<HTMLElement>(".ps-tabs, [data-ps-tabs]");
  containers.forEach((c) => new PolarisTabsController(c));
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initPolarisTabs());
  } else {
    initPolarisTabs();
  }
}

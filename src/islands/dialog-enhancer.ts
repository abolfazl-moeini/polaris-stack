/**
 * @wpdev/polaris-stack: islands/dialog-enhancer.ts
 * Native HTML5 <dialog> Feature-Detect & Graceful Degradation Enhancer.
 * Explicit support floor: Safari 15.4+ has native <dialog>; iOS 15.0–15.3 receives
 * [open]-attribute + fixed-position CSS fallback without heavy polyfill libraries.
 * Footprint: ~0.8 KB unminified.
 */

export function enhanceDialogs(root: ParentNode = document): void {
  const isDialogSupported =
    typeof HTMLDialogElement !== "undefined" &&
    typeof HTMLDialogElement.prototype.showModal === "function";

  const dialogs = root.querySelectorAll<HTMLDialogElement>("dialog.ps-modal, dialog[data-ps-modal]");

  dialogs.forEach((dialog) => {
    // If native showModal is missing, provide fallback implementation
    if (!isDialogSupported) {
      if (!dialog.showModal) {
        dialog.showModal = function () {
          dialog.setAttribute("open", "");
          dialog.classList.add("ps-modal-fallback-open");
          document.body.style.overflow = "hidden";
        };
      }
      if (!dialog.close) {
        dialog.close = function () {
          dialog.removeAttribute("open");
          dialog.classList.remove("ps-modal-fallback-open");
          document.body.style.overflow = "";
        };
      }
    }

    // Close on backdrop click if clicked outside modal body
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        dialog.close();
      }
    });

    // Wire close buttons (attribute-bound behavior, decoupled from styling classes)
    const closeBtns = dialog.querySelectorAll<HTMLElement>("[data-ps-close]");
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () => dialog.close());
    });
  });

  // Wire trigger buttons
  const triggers = root.querySelectorAll<HTMLElement>("[data-ps-dialog-target]");
  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute("data-ps-dialog-target");
      if (targetId) {
        const dialog = document.getElementById(targetId) as HTMLDialogElement | null;
        if (dialog) {
          if (typeof dialog.showModal === "function") {
            dialog.showModal();
          } else {
            dialog.setAttribute("open", "");
          }
        }
      }
    });
  });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceDialogs());
  } else {
    enhanceDialogs();
  }
}

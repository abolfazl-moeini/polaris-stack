import { store, getContext } from "@wordpress/interactivity";
import { __ } from "@wordpress/i18n";

const { state } = store("wpdev/counter", {
  actions: {
    increment() {
      const context = getContext();
      context.count = (context.count || 0) + (context.step || 1);
    },
    decrement() {
      const context = getContext();
      context.count = (context.count || 0) - (context.step || 1);
    },
  },
  callbacks: {
    logChange() {
      const context = getContext();
      console.log(__("Current count:", "wpdev"), context.count);
    },
  },
});

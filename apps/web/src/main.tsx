import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: {},
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

if ("serviceWorker" in navigator) {
  const swUrl = import.meta.env.DEV ? "/sw-dev.js" : "/sw.js";

  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL && !reg.active.scriptURL.endsWith(swUrl)) {
        await reg.unregister();
        console.log("[sw] Unregistered stale service worker:", reg.active.scriptURL);
      }
    }

    const registration = await navigator.serviceWorker.register(swUrl);
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    console.log("[sw] Registered:", swUrl);
  }).catch((err) => {
    console.warn("[sw] Registration failed:", err);
  });
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}

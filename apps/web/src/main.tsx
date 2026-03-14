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

  (async () => {
    try {
      const registration = await navigator.serviceWorker.register(swUrl);
      console.log("[sw] Registered:", swUrl, "scope:", registration.scope);

      const sw = registration.installing || registration.waiting || registration.active;
      if (sw && sw.state !== "activated") {
        await new Promise<void>((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
        });
      }

      await registration.update();
      console.log("[sw] Active and controlling");
    } catch (err) {
      console.warn("[sw] Registration failed:", err);
    }
  })();
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}

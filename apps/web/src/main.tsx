import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { hydrateSessionFromStorage } from "./lib/store/session";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/500.css";
import "./index.css";

hydrateSessionFromStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

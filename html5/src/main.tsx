import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@/i18n/client";
import "@/styles/tailwind.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/core/fx/fx.css";
import "@/styles/shell.css";
import "@/styles/game.css";
import "@/styles/site.css";
import "@/styles/ui.css";
import "./fonts.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider locale="en">
      <App />
    </I18nProvider>
  </StrictMode>,
);

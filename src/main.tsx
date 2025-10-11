import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Import secure logger test functions for development
import "./lib/logger.test.ts";

createRoot(document.getElementById("root")!).render(<App />);

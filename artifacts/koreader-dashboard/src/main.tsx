import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_DEMO_MODE === "true") {
  const { installDemoFetch } = await import("./lib/demo-data");
  installDemoFetch();
}

createRoot(document.getElementById("root")!).render(<App />);

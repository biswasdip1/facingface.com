import { useState, type ReactNode } from "react";
import { ChevronDown, Compass } from "lucide-react";
import "./home-menu.css";

/** Home-only layout: desktop shortcuts remain open; small-screen menu starts closed. */
export default function HomeMenuFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="ff-home-menu" aria-label="Home shortcuts" data-open={open ? "true" : "false"}>
      <div className="ff-home-menu-heading">
        <div className="ff-home-menu-title"><Compass size={17} aria-hidden="true" /><h2>Explore FacingFace</h2></div>
        <button type="button" className="ff-home-menu-toggle" aria-label={open ? "Close Home shortcuts" : "Open Home shortcuts"} aria-expanded={open} aria-controls="ff-home-shortcuts-content" onClick={() => setOpen(value => !value)}>
          <span>{open ? "Close" : "Menu"}</span><ChevronDown size={16} className={open ? "rotate-180" : ""} aria-hidden="true" />
        </button>
      </div>
      <nav id="ff-home-shortcuts-content" className="ff-home-shortcuts" aria-label="Community shortcuts">{children}</nav>
    </aside>
  );
}

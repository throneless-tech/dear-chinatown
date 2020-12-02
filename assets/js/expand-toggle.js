import ExpandToggle from "@threespot/expand-toggle";

const toggles = document.querySelectorAll("[data-expands]");

toggles.forEach(el => new ExpandToggle(el));

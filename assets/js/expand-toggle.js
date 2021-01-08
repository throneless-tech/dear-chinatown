import ExpandToggle from "@threespot/expand-toggle";

const toggles = document.querySelectorAll("[data-expands]");

toggles.forEach((element, index) => {
  const el = new ExpandToggle(element);
  index === 0 ? el.expand() : null;
});

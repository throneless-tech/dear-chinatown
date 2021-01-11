import ExpandToggle from "@threespot/expand-toggle";

const toggles = document.querySelectorAll("[data-expands]");
const map = document.getElementById('map');

toggles.forEach((element, index) => {
  const el = new ExpandToggle(element);

  if (!!map) {
    if (window.location.hash) {
      if (element.dataset.expands === window.location.hash.substr(1)) {
        el.expand();
      }
    }
  } else {
    index === 0 ? el.expand() : null;
  }
});

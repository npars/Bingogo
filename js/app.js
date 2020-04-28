var app = app || {};

(function (window) {
  'use strict';

  const { Button } = polythene

  const App = {
    view: () =>
      m(Button, {
        raised: true,
        label: "Button"
      })
  }

  m.mount(document.getElementById("root"), App)
})(window);

var app = app || {};

(function (window) {
  'use strict';

  const { Button } = polythene

  var serializeGame = function() {

  }

  var BingoState = {
    entries: ["The Beatles","The Supremes","Huey Lewis and the News","The E-Street Band","The Four Tops","Peaches And Herb","Destiny's Child","The Rolling Stones","The Who","Rush","The Spin Doctors","The Hives","Fallout Boy","All American Rejects","This Day and Age","Backstreet Boys","N Sync","Hansen","Hawthorne Heights","My Chemical Romance","Linkin Park","The Cars","Blink 182","Greenday","U2"],
    state: [[],[],[],[],[]],
    
    toggle: function(row, col) {
      this.state[row][col] = !this.state[row][col];
    }
  }

  var BingoTable = {
    view: function() {
      var header = "BINGO";
      const rowLength = 5;
      const colLength = 5;

      return m("table", {class: "bingoTable"}, 
        [m("tr", {class: "bingoHeaderRow"}, [...header].map(c => m("td", {class: "bingoHeaderCell"}, m("div", {class: "content"}, c))))].concat(
          [...Array(rowLength).keys()].map(row =>
            m("tr", [...Array(colLength).keys()].map(col => 
              m("td", m("div", {class: "content" + (BingoState.state[row][col] ? " selected" : ""), onclick: () => BingoState.toggle(row, col)}, BingoState.entries[col + row * rowLength]))))
      )));
    }
  }

  const App = {
    view: () =>
      m(BingoTable)
  }

  m.mount(document.getElementById("root"), App)
})(window);

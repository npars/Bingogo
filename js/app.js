var app = app || {};

(function (window) {
  'use strict';

  // Functions ////////////////////////
  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  var serializeGame = function(bingoGame) {
    const version = 100;
    var delimitedGame = [version, bingoGame.seed, bingoGame.gameName, ...bingoGame.gameEntries].join("\0");
    return LZString.compressToEncodedURIComponent(delimitedGame);
  }

  var deserializeGame = function(compressedGame) {
    var delimitedGame = LZString.decompressFromEncodedURIComponent(compressedGame);

    var gameArray = delimitedGame.split("\0");
    var version = parseInt(gameArray.shift());
    if (version !== 100) {
      throw "Failed to parse game data!";
    }

    var seed = parseInt(gameArray.shift());
    var gameName = gameArray.shift();
    return new BingoGame(seed, gameName, gameArray);
  }

  var getStateFromLocalStorage = function(serializedGame, cardId) {
      var state = localStorage.getItem([serializedGame, cardId].join("/"));
      if (!state) {
        return [];
      }

      return state.split(",").map(v => v === "true");
  }

  var setStateInLocalStorage = function(serializedGame, cardId, state) {
    localStorage.setItem([serializedGame, cardId].join("/"), state.join(","));
  }

  // Classes ////////////////////////

  class BingoGame {
    constructor(seed, gameName, gameEntries) {
      this.seed = seed;
      this.gameName = gameName;
      this.gameEntries = gameEntries;
    }
  }

  class BingoCard {
    constructor(bingoGame, cardId, serializedGame) {
      this.rowLen = 5;
      this.colLen = 5;
      this.cardSize = this.rowLen * this.colLen;

      this.bingoGame = bingoGame;
      this.cardId = cardId;
      this.serializedGame = serializedGame;
      this.state = getStateFromLocalStorage(serializedGame, cardId);

      var rng = mulberry32(this.bingoGame.seed * (this.cardId * 7));

      var entryPool = [...this.bingoGame.gameEntries]
      this.cardEntries = [];
      var i;
      for (i = 0; i < this.cardSize; i++) {
        if (i === 12) {
          this.cardEntries.push("FREE");
          continue;
        }
        this.cardEntries.push(entryPool.splice([entryPool.length * rng() | 0], 1)[0])
      }
    }

    toggle(row, col) {
      this.state[col + row * this.rowLen] = !this.state[col + row * this.rowLen];
      setStateInLocalStorage(this.serializedGame, this.cardId, this.state);
    }
  }

  // Components ///////////////////
  const NavBar = function() {
    return { 
      view: function() {
        return m("nav",
          m("div", {class: "col s12"}, [
            m("div", {class: "nav-wrapper"}, [
              m("a", {href: "#", class: "brand-logo"}, "Bingogo")
            ])
          ])
        );
      }
    };
  }

  const Dab = function() {
    var rotation = (Math.random() * 360) | 0;
    return {
      view: function() {
        return m("svg", {
          style: {
            position: "absolute",
            overflow: "visible"
          },
          width: "90%",
          viewBox: "0 0 159 159",
          preserveAspectRatio: "xMidYMid meet",
        }, [
          m("g", {
            transform: "rotate(" + rotation + ",75,80)",
            fill: "#F55",
            stroke: "none"
          }, [
            m("path", {
              d: "M65.02 6.26C60.1 6.39 55.44 7.85 46.4 12.51C23.79 23.81 14.08 33.39 5.3 52.94C2.24 59.72 1.18 64.24 0.65 73.55C-0.28 87.92 1.98 98.42 9.03 112.12C14.61 123.16 19.4 128.61 32.83 139.25C45.73 149.63 58.77 154.01 78.18 154.95C88.69 155.34 93.61 154.95 100.93 152.82C121.14 147.23 144.02 129.81 151.33 114.25C157.72 100.95 159.31 91.91 158.25 75.15C157.45 60.79 157.05 59.32 151.86 48.82C143.48 32.46 130.98 20.35 113.96 12.24C98.53 4.93 83.64 2.13 74.73 5.06C72.86 5.59 68.48 6.12 65.02 6.26Z"
            }),
          ]),
        ]);
      }
    }
  }

  // Pages ////////////////////////

  const CreatePage = function() {
    var entriesText;
    var gameName;

    var createGame = function() {
      var entriesArray = entriesText.split("\n");
      var seed = (Math.random() * 0x7FFFFFFF) | 0;
      
      var serializedGame = serializeGame(new BingoGame(seed, gameName, entriesArray)); 
      window.location.href = '#!/game/' + serializedGame;
    }

    return {
      view: function() {
        return [
          m(NavBar),
          m("div", {class: "container"}, [
            m("div", {class: "row"}, [
              m("div", {class: "input-field col s12"}, [
                m("input", {id: "gameTitle", type: "text", class: "validate", oninput: e => gameName = e.target.value}),
                m("label", {for: "gameTitle"}, "Game Title")
              ]),
              m("div", {class: "input-field col s12"}, [
                m("textarea", {id: "entryTextArea", class: "materialize-textarea limit-height", oninput: e => entriesText = e.target.value}),
                m("label", {for: "entryTextArea"}, "Bingo Entries")
              ]),
              m("div", {class: "input-field col s12"}, [
                m("a", {class: "waves-effect waves-light btn", onclick: createGame}, "Create Game"),
              ]),
            ]),
          ]),
        ]
      }
    }
  }

  const GamePage = function() {
    var newCard = function() {
      var cardId = (Math.random() * 100000) | 0
      window.location.href = "#!/game/" + m.route.param("gameId") + "/" + cardId;
    }

    return {
      view: function() {
        var serializedGame = m.route.param("gameId");
        if (!serializedGame) {
          return m("div", "Invalid Game URL!")
        }
        var bingoGame = deserializeGame(serializedGame);
        
        return [
          m(NavBar),
          m('div', {class: "row"}, [
            m('h5', {class: "col s12 center-align"}, bingoGame.gameName),
          ]),
          m("div", {class: "input-field col s12 center-align"}, [
            m("a", {class: "waves-effect waves-light btn-large", onclick: newCard}, "Give me a Bingo Card!"),
          ]),
        ]
      }
    }
  }

  const BingoCardPage = function() {
    var serializedGame = m.route.param("gameId");
    if (!serializedGame) {
      return m("div", "Invalid Game URL!")
    }
    var bingoGame = deserializeGame(serializedGame);

    var cardId = m.route.param("cardId");
    var bingoCard = new BingoCard(bingoGame, cardId, serializedGame);

    var BingoTable = {
      view: function() {
        var header = "BINGO";
        const rowLength = 5;
        const colLength = 5;
  
        return m("table", {class: "bingoTable card center-align"}, 
          [m("tr", {class: "bingoHeaderRow"}, [...header].map(c => m("td", {class: "bingoHeaderCell"}, m("div", {class: "content"}, m("div", {class: "valign-wrapper center-align"}, c)))))].concat(
            [...Array(rowLength).keys()].map(row =>
              m("tr", [...Array(colLength).keys()].map(col => 
                m("td", m("div", {class: "content", onclick: () => bingoCard.toggle(row, col)},  [
                  m("div", {style: {"z-index": 100}, class: "valign-wrapper center-align"}, bingoCard.cardEntries[col + row * rowLength]),
                  bingoCard.state[col + row * rowLength] && m(Dab),
                ]))
              ))
        )));
      }
    }

    return {
      view: function() {
        return [ 
          m(NavBar),
          m('div', {class: "row"}, [
            m('h5', {class: "col s12 m6"}, bingoGame.gameName),
            m('h5', {class: "col m6 hide-on-small-only right-align"}, "Card #" + bingoCard.cardId),
            m('h6', {class: "col s12 hide-on-med-and-up"}, "Card #" + bingoCard.cardId),
          ]),
          m('div', {class: "bingoContainer"}, [
            m(BingoTable),
          ])
        ];
      }
    }
  }

  // Route ////////////////////////
  m.route(document.getElementById("root"), "/create", {
    "/create": CreatePage,
    "/game/:gameId": GamePage,
    "/game/:gameId/:cardId": BingoCardPage,
  })
})(window);

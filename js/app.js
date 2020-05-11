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
    rowLen = 5;
    colLen = 5;
    cardSize = this.rowLen * this.colLen;

    constructor(bingoGame, cardId, serializedGame) {
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
  const NavBar = function(initialVnode) {
    return { 
      view: function(vnode) {
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

  // Pages ////////////////////////

  const CreatePage = function(initialVnode) {
    var defaultEntries = [...Array(75).keys()].map(i => i + 1).join("\n");

    var entriesText;
    var gameName;

    var createGame = function() {
      var entriesArray = entriesText.split("\n");
      var seed = (Math.random() * 0x7FFFFFFF) | 0;
      
      var serializedGame = serializeGame(new BingoGame(seed, gameName, entriesArray)); 
      window.location.href = '#!/game/' + serializedGame;
    }

    return {
      view: function(vnode) {
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

  const GamePage = function(initialVnode) {
    var newCard = function() {
      var cardId = (Math.random() * 100000) | 0
      window.location.href = "#!/game/" + m.route.param("gameId") + "/" + cardId;
    }

    return {
      view: function(vnode) {
        var serializedGame = m.route.param("gameId");
        if (!serializedGame) {
          return m("div", "Invalid Game URL!")
        }
        var bingoGame = deserializeGame(serializedGame);
        
        return [
          m(NavBar),
          m("div", {class: "input-field col s12 center-align"}, [
            m("a", {class: "waves-effect waves-light btn-large", onclick: newCard}, "Give me a Card!"),
          ]),
        ]
      }
    }
  }

  const BingoCardPage = function(initialVnode) {
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
                m("td", m("div", {class: "content" + (bingoCard.state[col + row * rowLength] ? " selected" : ""), onclick: () => bingoCard.toggle(row, col)}, 
                  m("div", {class: "valign-wrapper center-align"}, bingoCard.cardEntries[col + row * rowLength])
                ))
              ))
        )));
      }
    }

    return {
      view: function(vnode) {
        return [ 
          m(NavBar),
          // m(Toolbar, { style: { backgroundColor: bgColour }, shadowDepth: 1, compact: true}, [
          //   m(ToolbarTitle, { text: bingoGame.gameName}),
          //   m(ToolbarTitle, { text: "Card #" + bingoCard.cardId, style: { "text-align": "right" }}),
          // ]),
          m('div', {class: "bingoContainer"}, [
            m(BingoTable)
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

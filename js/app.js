var app = app || {};

(function (window) {
  'use strict';

  const SEPARATOR = "\0";

  // Functions ////////////////////////
  /**
   * Seeded random number generator.
   * 
   * @param {number} a the seed for the random number generator
   * @returns {number} a random number
   */
  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Serialize a BingoGame object into a compressed URI encoded string.
   * 
   * @param {BingoGame} bingoGame The game to serialize.
   * @returns {string} A URI encoded string.
   */
  var serializeGame = function(bingoGame) {
    const version = 100;
    var delimitedGame = [version, bingoGame.seed, bingoGame.gameName, ...bingoGame.gameEntries].join(SEPARATOR);
    return LZString.compressToEncodedURIComponent(delimitedGame);
  }

  /**
   * Deserialize a compressed URI encoded BingoGame instance.
   * 
   * @param {string} compressedGame A URI encoded string containing a compressed BingoGame.
   * @returns {BingoGame} A BingoGame instance.
   */
  var deserializeGame = function(compressedGame) {
    var delimitedGame = LZString.decompressFromEncodedURIComponent(compressedGame);

    var gameArray = delimitedGame.split(SEPARATOR);
    var version = parseInt(gameArray.shift());
    if (version !== 100) {
      throw "Failed to parse game data!";
    }

    var seed = parseInt(gameArray.shift());
    var gameName = gameArray.shift();
    return new BingoGame(seed, gameName, gameArray);
  }

  /**
   * Load card state from storage.
   * 
   * @param {string} serializedGame The serialized game that the card belongs to.
   * @param {number} cardId The id of the card to retrieve the state for.
   * @returns {boolean[]} An array of booleans indicating the current state of the card.
   */
  var getStateFromLocalStorage = function(serializedGame, cardId) {
      var state = localStorage.getItem([serializedGame, cardId].join("/"));
      if (!state) {
        return [];
      }

      return state.split(",").map(v => v === "true");
  }

  /**
   * Save card state to storage.
   * 
   * @param {string} serializedGame The serialized game that the card belongs to.
   * @param {number} cardId The id of the card to save the state for.
   * @param {boolean[]} state An array of booleans indicating the current state of the card.
   */
  var setStateInLocalStorage = function(serializedGame, cardId, state) {
    localStorage.setItem([serializedGame, cardId].join("/"), state.join(","));
  }

  var getHostStateFromLocalStorage = function(serializedGame) {
    var state = localStorage.getItem([serializedGame, "host"].join("/"));
    if (!state) {
      return new Set();
    }

    return new Set(state.split(SEPARATOR));
  }

  var setHostStateFromLocalStorage = function(serializedGame, state) {
    localStorage.setItem([serializedGame, "host"].join("/"), [...state].join(SEPARATOR));
  }


  // Classes ////////////////////////

  /**
   * BingoGame class. Stores the details of a bingo game.
   */
  class BingoGame {
    constructor(seed, gameName, gameEntries) {
      this.seed = seed;
      this.gameName = gameName;
      this.gameEntries = gameEntries;
    }
  }

  /**
   * BingoCard class. Stores the state of a single card within a game.
   * Each card has a randomized state based on the base game seed combined
   * with the card id. The center entry of the card is always set to "FREE".
   */
  class BingoCard {
    constructor(bingoGame, cardId, serializedGame, calledEntries) {
      if (serializedGame && calledEntries) {
        throw new Error("Invalid arguments, must pass either serializedGame or calledEntries");
      }

      this.rowLen = 5;
      this.colLen = 5;
      this.cardSize = this.rowLen * this.colLen;

      this.bingoGame = bingoGame;
      this.cardId = cardId;
      this.serializedGame = serializedGame;

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

      if (serializedGame) {
        this.state = getStateFromLocalStorage(serializedGame, cardId);
      } else if (calledEntries) {
        this.state = this.cardEntries.map(entry => entry == "FREE" || calledEntries.has(entry));
      } else {
        throw new Error("Invalid arguments, must pass either serializedGame or calledEntries");
      }
    }

    /**
     * Toggle the state of an entry on this card.
     * 
     * @param {number} row The row number of the entry.
     * @param {number} col The column number of the entry.
     */
    toggle(row, col) {
      if (this.serializedGame) {
        this.state[col + row * this.rowLen] = !this.state[col + row * this.rowLen];
        setStateInLocalStorage(this.serializedGame, this.cardId, this.state);
      }
    }
  }

  // Components ///////////////////
  /**
   * NavBar component.
   * 
   * @returns the Navigation Bar at the top of every page.
   */
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

  /**
   * Dab component.
   * 
   * @returns a "dab" svg for indicating an entry has been clicked.
   */
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

  /**
   * BingoTable component.
   * 
   * 
   */
  var BingoTable = {
    view: function(vnode) {
      var header = "BINGO";
      const rowLength = 5;
      const colLength = 5;
      var bingoCard = vnode.attrs.bingoCard;
      
      if (!bingoCard) {
        return null;
      }

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

  // Pages ////////////////////////

  /**
   * HomePage page.
   * 
   * @returns the landing page for the site.
   */
  const HomePage = function() {
    return {
      view: function() {
        return [
          m(NavBar),
          m("div", {class: "container"}, m("div", {class: "row"}, m("div", {class: "col offset-l2 s12 l8"},
            m("div", {class: "card"}, [
              m("div", {class: "card-content"}, [
                m("span", {class: "card-title"}, "Welcome!"),
                m("p", "Bingogo is a website for creating and playing user made bingo games. Create " +
                       "games like \"Buzzword Bingo\" and play with your friends and co-workers!"),
                m("h6", "How it works"),
                m("p", "Create a new game by entering a title for the game and all the entries you " +
                       "would like each bingo card to draw from. Once your game is created you can " +
                       "share the link to the players who can draw their card and play in their " +
                       "browser or print their card and play on paper."),
                m("div", {class: "center-align pt1"}, 
                  m("a", {class: "waves-effect waves-light btn-large", href: "#!/create/"}, "Get Started!")
                )
              ])
            ])
          )))
        ];
      }
    }
  }

  /**
   * CreatePage page.
   * 
   * @returns a page for creating a new game.
   */
  const CreatePage = function() {
    var entriesText = "";
    var gameName = "";

    var createGame = function() {
      var isValid = true;
      
      if (gameName == "") {
        document.getElementById("gameTitle").setCustomValidity("Game Title must be set!");
        isValid = false;
      } else {
        document.getElementById("gameTitle").setCustomValidity("");
      }

      var entriesArray = entriesText.split("\n").map(x => x.trim()).filter(x => x != "");
      if (entriesArray.length < 24) {
        document.getElementById("entryTextArea").setCustomValidity("A game requires at least 24 entries, one per line!");
        isValid = false;
      } else {
        document.getElementById("entryTextArea").setCustomValidity("");
      }
      
      document.getElementById("newGameForm").reportValidity();

      if (!isValid) {  
        return;
      }

      var seed = (Math.random() * 0x7FFFFFFF) | 0;
      
      var serializedGame = serializeGame(new BingoGame(seed, gameName, entriesArray)); 
      window.location.href = '#!/game/' + serializedGame + "/staging";
    }

    const titleHelp = "The game title will be visible to each player."
    const entryHelp = "Each line entered will be used as an entry when players draw their cards. <br/>" +
                      "Each card drawn will randomly pick 24 entries from those available. <br/>" +
                      "The center of each card will always be a FREE entry. <br/><br/>" +
                      "TIP: Create a list in an spreadsheet or document and paste when complete.";

    return {
      view: function() {
        return [
          m(NavBar),
          m("div", {class: "container"}, m("div", {class: "row"}, m("div", {class: "col offset-l2 s12 l8"},
            m("div", {class: "card"}, [
              m("form", {id: "newGameForm", class: "card-content"}, [
                m("div", {class: "row"}, [
                  m("div", {class: "input-field col s10 l11"}, [
                    m("input", {id: "gameTitle", type: "text", class: "validate", oninput: e => gameName = e.target.value.trim()}),
                    m("label", {for: "gameTitle"}, "Game Title"),
                  ]),
                  m("span", {class: "col s2 l1"}, 
                    m("i", {class: "material-icons small pt2 tooltipped clickable", "data-position": "left", "data-tooltip": titleHelp}, "help_outline")
                  )
                ]),
                m("div", {class: "row"}, [
                  m("div", {class: "input-field col s10 l11"}, [
                    m("textarea", {id: "entryTextArea", class: "materialize-textarea limit-height", oninput: e => entriesText = e.target.value}),
                    m("label", {for: "entryTextArea"}, "Bingo Entries")
                  ]),
                  m("span", {class: "col s2 l1"}, 
                    m("i", {class: "material-icons small pt2 tooltipped clickable", "data-position": "left", "data-tooltip": entryHelp}, "help_outline")
                  )
                ]),
                m("div", {class: "center-align"}, [
                  m("a", {class: "waves-effect waves-light btn-large", onclick: createGame}, "Create Game"),
                ]),
              ]),
            ]),
          )))
        ]
      },
      oncreate: function() {
        var elems = document.querySelectorAll('.tooltipped');
        M.Tooltip.init(elems);
      }
    }
  }

  const StagingPage = function() {
    var serializedGame = m.route.param("gameId");
    if (!serializedGame) {
      return m("div", "Invalid Game URL!")
    }

    var bingoGame = deserializeGame(serializedGame);

    var playerUrl = window.location.href.split("#")[0] + "#!/game/" + serializedGame;
    var shortenedUrl = null;

    var shortenUrl = function() {
      m.request({
        method: "GET",
        url: "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(playerUrl),
        responseType: "text"
      })
      .then(function(data) {
        shortenedUrl = data;
      })
    }

    return {
      view: function() {
        return [
          m(NavBar),
          m("div", {class: "container"}, m("div", {class: "row"}, m("div", {class: "col offset-l2 s12 l8"},
            m("div", {class: "card"}, [
              m("div", {class: "card-content"}, [
                m("span", {class: "card-title"}, bingoGame.gameName),
                m("p", "Your game has been successfully created! Bookmark this page so that you can easily return."),
                m("h6", {class: "pt1"}, "Player Page"),
                m("p", "Share the below link that allows players to draw a random card."),
                m("div", {class: "row"}, [
                  m("input", {id: "player-url", class: "col s10 l11", value: shortenedUrl || playerUrl, readonly: ""}),                  
                  m("a", {class: "col s2 l1 btn-flat copy-btn", "data-clipboard-target": "#player-url"}, 
                    m("i", {class: "material-icons"}, "content_copy")
                  )
                ]),
                m("a", {class: "waves-effect waves-light btn", href: "#!/game/" + serializedGame}, "Go to Player Page"),
                " ",
                m("a", {class: "waves-effect waves-light btn", onclick: shortenUrl}, "Shorten link with TinyUrl"),
                m("h6", {class: "pt1"}, "Game Host Page"),
                m("p", "Use the Game Host Page to easily mark which entries have been called and quickly verify player's cards."),
                m("div", {class: "pt1"}, 
                  m("a", {class: "waves-effect waves-light btn", href: "#!/game/" + serializedGame + "/host"}, "Go to Game Host Page")
                )
              ])
            ])
          )))
        ];
      },
      oncreate: function() {
        new ClipboardJS(".copy-btn");
      }
    }
  }

  /**
   * GamePage page.
   * 
   * @returns the starting game page for players.
   */
  const GamePage = function() {
    var newCard = function() {
      var cardId = (Math.random() * 100000) | 0
      window.location.href = "#!/game/" + m.route.param("gameId") + "/" + cardId;
    }

    var serializedGame = m.route.param("gameId");
    if (!serializedGame) {
      return m("div", "Invalid Game URL!")
    }
    var bingoGame = deserializeGame(serializedGame);

    return {
      view: function() {        
        return [
          m(NavBar),
          m("div", {class: "container"}, m("div", {class: "row"}, m("div", {class: "col offset-l2 s12 l8"},
            m("div", {class: "card"}, [
              m("div", {class: "card-content"}, [
                m("span", {class: "card-title"}, bingoGame.gameName),
                m("div", "You've been invited to play a game of bingo. Click the link below to draw a random card."),
                m("div", {class: "center-align pt1"}, 
                  m("a", {class: "waves-effect waves-light btn-large", onclick: newCard}, "Give me a Bingo Card!")
                )
              ])
            ])
          )))
        ];
      }
    }
  }

  /**
   * BingoCardPage page.
   * 
   * @returns the card page that contains a generated bingo card for the player.
   */
  const BingoCardPage = function() {
    var serializedGame = m.route.param("gameId");
    if (!serializedGame) {
      return m("div", "Invalid Game URL!")
    }
    var bingoGame = deserializeGame(serializedGame);

    var cardId = m.route.param("cardId");
    var bingoCard = new BingoCard(bingoGame, cardId, serializedGame);

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
            m(BingoTable, {bingoCard: bingoCard}),
          ])
        ];
      }
    }
  }

  /**
   * BingoHostPage page.
   * 
   * @returns the page for a host to manage a game being played.
   */
  const BingoHostPage = function() {
    var serializedGame = m.route.param("gameId");
    if (!serializedGame) {
      return m("div", "Invalid Game URL!")
    }
    var bingoGame = deserializeGame(serializedGame);

    var calledEntries = getHostStateFromLocalStorage(serializedGame);

    var checkCardId;
    var checkBingoCard;
    
    var toggleCalledEntry = function(e) {
      if (e.target.checked) {
        calledEntries.add(e.target.nextSibling.textContent);
      } else {
        calledEntries.delete(e.target.nextSibling.textContent);
      }
      setHostStateFromLocalStorage(serializedGame, calledEntries);
    }

    var checkCard = function() {
      checkBingoCard = new BingoCard(bingoGame, checkCardId, null, calledEntries);
    }

    var hideCard = function() {
      checkBingoCard = null;
    }

    return {
      view: function() {
        return [
          m(NavBar),
          m('div', {class: "row"}, [
            m('h5', {class: "col s12"}, bingoGame.gameName),
          ]),
          m('div', {class: "row"},
            m('div', {class: "col s4"}, [
              m('div', {class: "card"}, m('div', {class: "card-content"}, [
                m('span', {class: "card-title"}, "Called Entries"),
                m('form', {action: "#"},
                  [...bingoGame.gameEntries].sort().map(entry => 
                    m("p", m("label", [
                      m("input", {type: "checkbox", class: "filled-in", onchange: toggleCalledEntry, ...(calledEntries.has(entry) && {checked: "checked"})}), 
                      m("span", entry)
                    ]))
                  )
                )
              ]))
            ]),
            m('div', {class: "col s8"}, [
              m('div', {class: "card"}, m('div', {class: "card-content"}, [
                m('span', {class: "card-title"}, "Check Card"),
                m("div", {class: "input-field"}, [
                  m("input", {id: "checkCardId", type: "number", class: "validate", oninput: e => checkCardId = e.target.value}),
                  m("label", {for: "checkCardId"}, "Card #"),
                  m("a", {class: "waves-effect waves-light btn", onclick: checkCard,}, "Check"),
                  " ",
                  m("a", {class: "waves-effect waves-light btn-flat" + (checkBingoCard ? "" : " disabled"), onclick: hideCard}, "Hide"),
                ]),
                m('div', {class: "bingoContainer"}, m(BingoTable, {bingoCard: checkBingoCard}))
              ]))
            ])
          ),
        ]
      }
    }
  }

  // Route ////////////////////////
  m.route(document.getElementById("root"), "/", {
    "/": HomePage,
    "/create": CreatePage,
    "/game/:gameId": GamePage,
    "/game/:gameId/staging": StagingPage,
    "/game/:gameId/host": BingoHostPage,
    "/game/:gameId/:cardId": BingoCardPage,
  })
})(window);

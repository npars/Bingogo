var app = app || {};

(function (window) {
  'use strict';

  const { Button, Toolbar, ToolbarTitle, TextField} = polythene

  const bgColour = "#ff9800"

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
    return LZString.compressToBase64(delimitedGame);
  }

  var deserializeGame = function(compressedGame) {
    var delimitedGame = LZString.decompressFromBase64(compressedGame);
    var gameArray = delimitedGame.split("\0");
    var version = parseInt(gameArray.shift());
    if (version !== 100) {
      throw "Failed to parse game data!";
    }

    var seed = parseInt(gameArray.shift());
    var gameName = gameArray.shift();
    return new BingoGame(seed, gameName, gameArray);
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
    cardSize = 5*5;

    constructor(bingoGame, cardNumber) {
      this.bingoGame = bingoGame;
      this.cardNumber = cardNumber;
      this.state = [[],[],[],[],[]]

      var rng = mulberry32(this.bingoGame.seed * (this.cardNumber * 7));

      var entryPool = [...this.bingoGame.gameEntries]
      this.cardEntries = [];
      var i;
      for (i = 0; i < this.cardSize; i++) {
        this.cardEntries.push(entryPool.splice([entryPool.length * rng() | 0], 1)[0])
      }
    }

    toggle(row, col) {
      this.state[row][col] = !this.state[row][col];
    }
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
      window.location.href = '#!/game?g=' + serializedGame;
    }

    return {
      view: function(vnode) {
        return [
          m(Toolbar, { style: { backgroundColor: bgColour }, shadowDepth: 1}, [m(ToolbarTitle, { text: "Design Your Game", center: false})]),
          m(Button, {events: {onclick: createGame}}, "Create Game"),
          m(TextField, {
            label: "Game Title",
            floatingLabel: true,
            multiLine: false,
            onChange: newState => gameName = newState.value
          }),
          m(TextField, {
            label: "Bingo Entries",
            floatingLabel: true,
            multiLine: true,
            rows: 10,
            defaultValue: defaultEntries,
            onChange: newState => entriesText = newState.value
          })
        ]
      }
    }
  }

  const GamePage = function(initialVnode) {
    return {
      view: function(vnode) {
        return m("div", "Game Page")
      }
    }
  }

  const BingoCardPage = function(initialVnode) {
    var bingoCard = new BingoCard(new BingoGame(124152, "Music Video Bingo","The Beatles,The Supremes,Huey Lewis and the News,The E-Street Band,The Four Tops,Peaches And Herb,Destiny's Child,The Rolling Stones,The Who,Rush,The Spin Doctors,The Hives,Fallout Boy,All American Rejects,This Day and Age,Backstreet Boys,N Sync,Hansen,Hawthorne Heights,My Chemical Romance,Linkin Park,The Cars,Blink 182,Greenday,U2,Sha-na-nah,Stone Temple Pilots,Hellogoodbye,Nirvana,Weezer,Sum 41,The Vines,The Strokes,Cream,Dave Matthews Band,Cheap Trick,The Knack,The Romantics,Genesis,98 Degrees,Dave Clark Five,The Raspberries,Nitty Gritty Dirt Band,The Police,Barenaked Ladies,Baha Men,Steely Dan,Good Charlotte,Taking Back Sunday,Newfound Glory,Dashboard Confessional,Creed,Red Hot Chili Peppers".split(",")), 1001);

    var BingoTable = {
      view: function() {
        var header = "BINGO";
        const rowLength = 5;
        const colLength = 5;
  
        return m("table", {class: "bingoTable"}, 
          [m("tr", {class: "bingoHeaderRow"}, [...header].map(c => m("td", {class: "bingoHeaderCell"}, m("div", {class: "content"}, c))))].concat(
            [...Array(rowLength).keys()].map(row =>
              m("tr", [...Array(colLength).keys()].map(col => 
                m("td", m("div", {class: "content" + (bingoCard.state[row][col] ? " selected" : ""), onclick: () => bingoCard.toggle(row, col)}, bingoCard.cardEntries[col + row * rowLength]))))
        )));
      }
    }

    return {
      view: function(vnode) {
        return [ 
          // m("div", serializeGame(bingoCard.seed, bingoCard.gameName, bingoCard.entries)),
          m(BingoTable)
        ];
      }
    }
  }

  // Route ////////////////////////
  m.route(document.getElementById("root"), "/create", {
    "/create": CreatePage,
    "/game": GamePage,
    "/card": BingoCardPage,
})
})(window);

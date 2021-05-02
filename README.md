# Bingogo

[![Netlify Status](https://api.netlify.com/api/v1/badges/d77cc2a7-da48-4406-ba49-d0ba9c7c9768/deploy-status)](https://app.netlify.com/sites/hardcore-pare-0fc00a/deploys)

Bingogo is a simple single page application for creating and playing custom bingo games. Game hosts can create a game by specifying a series of possible bingo entries and then share a link the game to the players. Players will be given a randomized card that they can then play in the browser or print.

# Development

Bingogo is written in Javascript without transpiling or polyfilling. Currently the main app isn't even compressed. As such you can load the index page directly in the browser during development. Mithril.js is used as the SPA framework.

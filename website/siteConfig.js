/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// See https://docusaurus.io/docs/site-config for all the possible
// site configuration options.

// List of projects/orgs using your project for the users page.
const users = require('./users')

const siteConfig = {
  cname: 'orionjs.com',
  title: 'Orionjs', // Title for your website.
  tagline: 'A framework for modern Nodejs apps',
  url: 'https://orionjs.com', // Your website URL
  baseUrl: '/', // Base URL for your project */
  editUrl: 'https://github.com/orionjs/orionjs/edit/master/docs/',
  // For github.io type URLs, you would set the url and baseUrl like:
  //   url: 'https://facebook.github.io',
  //   baseUrl: '/test-site/',

  // Used for publishing and more
  projectName: 'orionjs',
  organizationName: 'orionjs',
  // For top-level user or org sites, the organization is still the same.
  // e.g., for the https://JoelMarcey.github.io site, it would be set like...
  //   organizationName: 'JoelMarcey'

  // For no header links in the top nav bar -> headerLinks: [],
  headerLinks: [
    {doc: 'installation', label: 'Docs'},
    {page: 'help', label: 'Help'},
    {blog: true, label: 'Blog'},
    {search: true}
  ],

  // If you have users set above, you add it here:
  users,

  /* path to images for header/footer */
  headerIcon: 'img/logo-white.svg',
  footerIcon: 'img/logo-white.svg',
  favicon: 'img/logo-black.png',

  /* Colors for website */
  colors: {
    primaryColor: '#0F2027',
    secondaryColor: '#2C5364'
  },

  // This copyright info is used in /core/Footer.js and blog RSS/Atom feeds.
  copyright: `Copyright © ${new Date().getFullYear()} Orionjs Team`,

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks.
    theme: 'default'
  },

  // Add custom scripts here that would be placed in <script> tags.
  scripts: ['https://buttons.github.io/buttons.js'],

  // On page navigation for the current documentation page.
  onPageNav: 'separate',
  // No .html extensions for paths.
  cleanUrl: true,

  // Open Graph and Twitter card images.
  ogImage: 'img/logo-black.png',
  twitterImage: 'img/logo-black.png',

  // You may provide arbitrary config keys to be used as needed by your
  // template. For example, if you need your repo's URL...
  repoUrl: 'https://github.com/orionjs/orionjs',
  algolia: {
    apiKey: 'c7383946eb91c665407697fcf1b4ec3a',
    indexName: 'orionjs',
    algoliaOptions: {} // Optional, if provided by Algolia
  }
}

module.exports = siteConfig

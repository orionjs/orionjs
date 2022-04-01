// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Orionjs',
  staticDirectories: ['static'],
  tagline: 'A framework for modern Nodejs apps',
  url: 'https://orionjs.com',
  baseUrl: '/orionjs/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/logo-black.png',
  organizationName: 'orionjs', // Usually your GitHub org/user name.
  projectName: 'orionjs', // Usually your repo name.

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/',
          remarkPlugins: [[require('@docusaurus/remark-plugin-npm2yarn'), {sync: true}]],
          editCurrentVersion: true,
          lastVersion: 'current',
          versions: {
            current: {
              label: '3.x'
            }
          }
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/blog/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ]
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Orionjs',
        logo: {
          alt: 'Orionjs Logo',
          src: 'img/logo-black.png',
          srcDark: 'img/logo.svg'
        },
        items: [
          {
            type: 'doc',
            docId: 'getting-started/introduction',
            position: 'left',
            label: 'Docs'
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            type: 'docsVersionDropdown',
            position: 'right'
          }
        ]
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Docs',
                to: '/docs/getting-started/installation'
              }
            ]
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/orionjs'
              },
              {
                label: 'Github issues',
                href: 'https://github.com/orionjs/orionjs/issues'
              }
            ]
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog'
              },
              {
                label: 'GitHub',
                href: 'https://github.com/orionjs/orionjs'
              }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Orionjs Team &hearts;	`
      },

      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme
      },
      algolia: {
        appId: 'BH4D9OD16A',
        apiKey: 'c7383946eb91c665407697fcf1b4ec3a',
        indexName: 'orionjs',
        algoliaOptions: {} // Optional, if provided by Algolia
      }
    })
}

module.exports = config

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')

const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(`${process.cwd()}/siteConfig.js`)

function docUrl(doc, language) {
  return `${siteConfig.baseUrl}docs/${language ? `${language}/` : ''}${doc}`
}

class Help extends React.Component {
  render() {
    const supportLinks = [
      {
        title: 'Browse Docs',
        content: `Learn more using the [documentation on this site](${docUrl(
          'basics.html'
        )}), maybe you are just missing something.`
      },
      {
        title: 'Ask on stackoverflow',
        content:
          '[Stack overflow](https://stackoverflow.com/questions/tagged/orionjs) is the fastest way to get answers. Use the tag [orionjs](https://stackoverflow.com/questions/tagged/orionjs) to let people find your question faster.'
      },
      {
        title: 'Open an issue on Github',
        content:
          'If you think it you found a bug, please open a [new issue](https://github.com/orionjs/orionjs/issues/new) on the Orionjs repository.'
      }
    ]

    return (
      <div className="docMainWrapper wrapper">
        <Container className="mainContainer documentContainer postContainer">
          <div className="post">
            <header className="postHeader">
              <h1>Need help?</h1>
            </header>
            <GridBlock contents={supportLinks} layout="threeColumn" />
            <br />
            <br />
            <div>
              <p>If you need paid support, please contact admin@orionsoft.io.</p>
            </div>
          </div>
        </Container>
      </div>
    )
  }
}

module.exports = Help

import React from 'react'
import PropTypes from 'prop-types'

class Footer extends React.Component {
  static propTypes = {
    config: PropTypes.object,
    language: PropTypes.any
  }

  docUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return `${baseUrl}docs/${language ? `${language}/` : ''}${doc}`
  }

  pageUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return baseUrl + (language ? `${language}/` : '') + doc
  }

  render() {
    return (
      <footer className="nav-footer" id="footer">
        <section className="sitemap">
          <a href={this.props.config.baseUrl} className="nav-home">
            {this.props.config.footerIcon && (
              <img
                src={this.props.config.baseUrl + this.props.config.footerIcon}
                alt={this.props.config.title}
                width="66"
                height="58"
              />
            )}
          </a>
          <div>
            <h5>Docs</h5>
            <a href={this.docUrl('doc1.html', this.props.language)}>
              Getting Started (or other categories)
            </a>
            <a href={this.docUrl('doc2.html', this.props.language)}>Guides (or other categories)</a>
            <a href={this.docUrl('doc3.html', this.props.language)}>
              API Reference (or other categories)
            </a>
          </div>
          <div>
            <h5>Support</h5>
            <a
              href="http://stackoverflow.com/questions/tagged/orionjs"
              target="_blank"
              rel="noreferrer noopener">
              Stack Overflow
            </a>
            <a
              href={this.props.config.repoUrl + '/issues'}
              target="_blank"
              rel="noreferrer noopener">
              Github issues
            </a>
          </div>
          <div>
            <h5>More</h5>
            <a href={`${this.props.config.baseUrl}blog`}>Blog</a>
            <a href="https://github.com/">GitHub</a>
            <a
              className="github-button"
              href={this.props.config.repoUrl}
              data-icon="octicon-star"
              data-count-href="/orionjs/orionjs/stargazers"
              data-show-count="true"
              data-count-aria-label="# stargazers on GitHub"
              aria-label="Star this project on GitHub">
              Star
            </a>
          </div>
        </section>
        <section className="copyright">{this.props.config.copyright}</section>
      </footer>
    )
  }
}

module.exports = Footer

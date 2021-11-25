import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Help() {
  const {siteConfig} = useDocusaurusContext();

  const docUrl = (doc, language) => {
    const {siteConfig} = useDocusaurusContext();
    return `${siteConfig.baseUrl}docs/${language ? `${language}/` : ''}${doc}`
  }

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
      <Layout
      title={`${siteConfig.title} · ${siteConfig.tagline}`}
      description="Description will go into a meta tag in <head />">
      
      <header className={clsx('hero hero--primary')}>
          <div className="post">
            <header className="postHeader">
              <h1>Need help?</h1>
            </header>
            <div contents={supportLinks} layout="threeColumn" />
            <br />
            <br />
            <div>
              <p>If you need paid support, please contact admin@orionsoft.io.</p>
            </div>
          </div>
          </header>
      </Layout>
    )
}

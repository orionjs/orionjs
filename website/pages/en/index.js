const React = require('react')
const CompLibrary = require('../../core/CompLibrary.js')

const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(`${process.cwd()}/siteConfig.js`)

function imgUrl(img) {
  return `${siteConfig.baseUrl}img/${img}`
}

function docUrl(doc, language) {
  return `${siteConfig.baseUrl}docs/${language ? `${language}/` : ''}${doc}`
}

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    )
  }
}

Button.defaultProps = {
  target: '_self'
}

const SplashContainer = props => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
)

const ProjectTitle = () => (
  <h2 className="projectTitle">
    {siteConfig.title}
    <small>{siteConfig.tagline}</small>
  </h2>
)

const PromoSection = props => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
)

class HomeSplash extends React.Component {
  render() {
    const language = this.props.language || ''
    return (
      <SplashContainer>
        <div className="inner">
          <ProjectTitle />
          <PromoSection>
            <Button href={docUrl('installation.html', language)}>Get started</Button>
            <Button href={docUrl('basics.html', language)}>Read the docs</Button>
          </PromoSection>
        </div>
      </SplashContainer>
    )
  }
}

const Features = () => (
  <Container padding={['bottom', 'top']}>
    <GridBlock
      layout="threeColumn"
      contents={[
        {
          title: 'Light and powerful',
          image: imgUrl('light.svg'),
          imageAlign: 'top',
          content:
            'Orionjs is a fast and lightweight framework, it does not do more than what it needs. No more bloated libraries.'
        },
        {
          title: 'Solid foundations',
          image: imgUrl('foundations.svg'),
          imageAlign: 'top',
          content:
            "Orionjs it's created on top of state of the art frameworks for Nodejs, like apollo and micro."
        },
        {
          title: 'Developer focused',
          image: imgUrl('developer.svg'),
          imageAlign: 'top',
          content:
            "Orionjs it's made for developers, it's very easy to learn and will allow you to create apps faster than ever."
        }
      ]}
    />
    <br />
    <br />
    <br />
    <GridBlock
      layout="threeColumn"
      contents={[
        {
          title: 'GraphQL centred',
          image: imgUrl('graphql.svg'),
          imageAlign: 'top',
          content:
            "Don't write any repeated code. Orionjs creates automatically the GraphQL schema for you."
        },
        {
          title: 'Front-end agnostic',
          image: imgUrl('frontend.svg'),
          imageAlign: 'top',
          content:
            'You can use Orionjs with any front-end, just connect using Apollo client or other.'
        },
        {
          title: 'Easy to use subscriptions',
          image: imgUrl('subscriptions.svg'),
          imageAlign: 'top',
          content:
            'Orionjs is GraphQL subscriptions compilant, with a super-easy to use API on the server.'
        }
      ]}
    />
  </Container>
)

class Index extends React.Component {
  render() {
    const language = this.props.language || ''

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <Features />
          {/* <Showcase language={language} /> */}
        </div>
      </div>
    )
  }
}

module.exports = Index

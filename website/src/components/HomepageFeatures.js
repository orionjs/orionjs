import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Light and powerful',
    Svg: require('../../static/img/light.svg').default,
    description: (
      <>
  Orionjs is a fast and lightweight framework, it does not do more than what it needs. No more bloated libraries.
</>
    ),
  },
  {
    title: 'Solid foundations',
    Svg: require('../../static/img/foundations.svg').default,
    description: (
      <>
Orionjs it's created on top of state of the art frameworks for Nodejs, like apollo and micro.

</>
    ),
  },
  {
    title: 'Developer focused',
    Svg: require('../../static/img/developer.svg').default,
    description: (
      <>
Orionjs it's made for developers, it's very easy to learn and will allow you to create apps faster than ever.
      </>
    ),
  },
  {
    title: 'GraphQL centered',
    Svg: require('../../static/img/graphql.svg').default,
    description: (
      <>
  Don't write any repeated code. Orionjs creates automatically the GraphQL schema for you.
</>
    ),
  },
  {
    title: 'Front-end agnostic',
    Svg: require('../../static/img/frontend.svg').default,
    description: (
      <>
You can use Orionjs with any front-end, just connect using Apollo client or other.

</>
    ),
  },
  {
    title: 'Easy to use subscriptions',
    Svg: require('../../static/img/subscriptions.svg').default,
    description: (
      <>
Orionjs is GraphQL subscriptions compilant, with a super-easy to use API on the server.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

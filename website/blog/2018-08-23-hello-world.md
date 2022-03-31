---
title: Hello World
authors:
  name: Nicolás López
  url: https://github.com/nicolaslopezj
  image_url: https://avatars.githubusercontent.com/u/2042567?v=4
  tags: [orionjs, meteor]
---

## Goodbye Meteor, hello Orionjs.

When I first used Meteor, I was amazed. It was so fast to write, so easy, it
felt like magic. But after some years, the apps I was creating required more
complexity, the code base started to get bigger and everything became slow and
buggy. Then I started to use apollo, without leaving Meteor, but it felt like
using the wrong tool for the job.

<!--truncate-->

The desition to start a new framework is not easy, you must commit for a long
time, but I didn't found what I was looking for anywhere. So I decided to create
Orionjs.

When designing how it will work, how the structure will be, and also thinking
what was what Meteor did wrong I ended up with the following points.

### Write as little as possible

The most important thing in Orionjs is that you can achieve big thing with very
little code, everything is made to be reused. This makes apps less complex and
fail less.

Orionjs automatically handles the GraphQL schema creation, validation,
authentication and many more things that make you write code really fast.

### Simple to use and learn

Orionjs must always keep simple. All complex things like subscriptions (using
GraphQL subscriptions), authentication (singing every request and with man in
the middle protection) and connection with the server (apollo configuration) are
handled for you and presented in an easy way.

### Don't do it all

When Meteor was created there was no consensus on a package system for Node, so
they created their own. Add to that, managing the build system, create the
communication layer between client and server, and all that pieces of code that
make Meteor a big layer over Node. It feels like another ecosystem. I think if
Meteor was created today it would try to do all that things.

That's why Orionjs does only what it's not already done. It uses babel, Apollo,
micro, MongoDB, and more.

---

I had great time writing with Meteor, but now, six years after it was created,
it's time to turn the page.

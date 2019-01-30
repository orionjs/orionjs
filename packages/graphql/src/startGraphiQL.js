import {route} from '@orion-js/app'

// Ensures string values are safe to be used within a <script> tag.
// TODO: I don't think that's the right escape function
function safeSerialize(data) {
  return data ? JSON.stringify(data).replace(/\//g, '\\/') : null
}

const getHTML = function(apolloOptions, options, data) {
  // Current latest version of GraphiQL.
  const GRAPHIQL_VERSION = '0.11.11'

  const {endpointURL, subscriptionsEndpoint} = apolloOptions

  const queryString = data.query
  const variablesString = data.variables ? JSON.stringify(data.variables, null, 2) : null
  const operationName = data.operationName
  const useSubs = !!options.subscriptions

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GraphiQL</title>
  <meta name="robots" content="noindex" />
  <style>
    html, body {
      height: 100%;
      margin: 0;
      overflow: hidden;
      width: 100%;
    }
  </style>
  <link href="//unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.css" rel="stylesheet" />
  <script src="//unpkg.com/react@15.6.1/dist/react.min.js"></script>
  <script src="//unpkg.com/jssha@2.3.1/src/sha512.js"></script>
  <script src="//unpkg.com/react-dom@15.6.1/dist/react-dom.min.js"></script>
  <script src="//unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.min.js"></script>
  <script src="//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js"></script>
  ${
    useSubs
      ? `<script src="//unpkg.com/subscriptions-transport-ws@0.5.4/browser/client.js"></script>
        <script src="//unpkg.com/graphiql-subscriptions-fetcher@0.0.2/browser/client.js"></script>`
      : ''
  }
</head>
<body>
  <script>
    // Collect the URL parameters
    var parameters = {};
    window.location.search.substr(1).split('&').forEach(function (entry) {
      var eq = entry.indexOf('=');
      if (eq >= 0) {
        parameters[decodeURIComponent(entry.slice(0, eq))] =
          decodeURIComponent(entry.slice(eq + 1));
      }
    });
    // Produce a Location query string from a parameter object.
    function locationQuery(params, location) {
      return (location ? location: '') + '?' + Object.keys(params).map(function (key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(params[key]);
      }).join('&');
    }
    // Derive a fetch URL from the current URL, sans the GraphQL parameters.
    var graphqlParamNames = {
      query: true,
      variables: true,
      operationName: true
    };
    var otherParams = {};
    for (var k in parameters) {
      if (parameters.hasOwnProperty(k) && graphqlParamNames[k] !== true) {
        otherParams[k] = parameters[k];
      }
    }
    // We don't use safe-serialize for location, because it's not client input.
    var fetchURL = '${endpointURL}'
    // Defines a GraphQL fetcher using the fetch API.
    function graphQLHttpFetcher(graphQLParams) {
        const body = JSON.stringify(graphQLParams)
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
        const publicKey = localStorage.getItem('GraphiQL:publicKey')
        const secretKey = localStorage.getItem('GraphiQL:secretKey')
        if (publicKey && secretKey) {
          const nonce = new Date().getTime()
          const shaObj = new jsSHA('SHA-512', 'TEXT')
          shaObj.setHMACKey(secretKey, 'TEXT')
          shaObj.update(nonce + body)
          const signature = shaObj.getHMAC('HEX')
          headers['X-ORION-NONCE'] = nonce
          headers['X-ORION-PUBLICKEY'] = publicKey
          headers['X-ORION-SIGNATURE'] = signature
        }
        return fetch(fetchURL, {
          method: 'post',
          headers,
          body,
          credentials: 'same-origin',
        }).then(function (response) {
          return response.text();
        }).then(function (responseBody) {
          try {
            const json = JSON.parse(responseBody);
            if (json.data && json.data.loginWithPassword) {
              const publicKey = json.data.loginWithPassword.publicKey
              const secretKey = json.data.loginWithPassword.secretKey
              if (publicKey && secretKey) {
                localStorage.setItem('GraphiQL:publicKey', publicKey)
                localStorage.setItem('GraphiQL:secretKey', secretKey)
                alert('Session saved in localStorage')
              }
            }
            if (json.error && json.error === 'AuthError') {
              localStorage.setItem('GraphiQL:publicKey', '')
              localStorage.setItem('GraphiQL:secretKey', '')
              alert('Logged out after receiving AuthError')
            }
            return json
          } catch (error) {
            return responseBody;
          }
        });
    }
    ${
      useSubs
        ? `
        let params = {}
        const publicKey = localStorage.getItem('GraphiQL:publicKey')
        const secretKey = localStorage.getItem('GraphiQL:secretKey')
        if (publicKey && secretKey) {
          const nonce = new Date().getTime() + 500
          const shaObj = new jsSHA('SHA-512', 'TEXT')
          shaObj.setHMACKey(secretKey, 'TEXT')
          shaObj.update(nonce + 'websockethandshake')
          const signature = shaObj.getHMAC('HEX')
          params = {
            nonce,
            publicKey,
            signature
          }
        }

        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
        let subscriptionsClient = new window.SubscriptionsTransportWs.SubscriptionClient(protocol + window.location.host + '${subscriptionsEndpoint}', {
          reconnect: true,
          connectionParams: params
        });
        let myCustomFetcher = window.GraphiQLSubscriptionsFetcher.graphQLFetcher(subscriptionsClient, graphQLHttpFetcher);
        var fetcher = myCustomFetcher
        `
        : `
        var fetcher = graphQLHttpFetcher
        `
    }

    // When the query and variables string is edited, update the URL bar so
    // that it can be easily shared.
    function onEditQuery(newQuery) {
      parameters.query = newQuery;
      updateURL();
    }
    function onEditVariables(newVariables) {
      parameters.variables = newVariables;
      updateURL();
    }
    function onEditOperationName(newOperationName) {
      parameters.operationName = newOperationName;
      updateURL();
    }
    function updateURL() {
      var cleanParams = Object.keys(parameters).filter(function(v) {
        return parameters[v];
      }).reduce(function(old, v) {
        old[v] = parameters[v];
        return old;
      }, {});
      history.replaceState(null, null, locationQuery(cleanParams) + window.location.hash);
    }
    // Render <GraphiQL /> into the body.
    ReactDOM.render(
      React.createElement(GraphiQL, {
        fetcher: fetcher,
        onEditQuery: onEditQuery,
        onEditVariables: onEditVariables,
        onEditOperationName: onEditOperationName,
        query: ${safeSerialize(queryString)},
        response: null,
        variables: ${safeSerialize(variablesString)},
        operationName: ${safeSerialize(operationName)},
      }),
      document.body
    );
  </script>
</body>
</html>`
}

export default function(apolloOptions, options) {
  if (options.graphiql) {
    route('/graphiql', async function({query, request}) {
      return getHTML(apolloOptions, options, query, request)
    })
  }
}

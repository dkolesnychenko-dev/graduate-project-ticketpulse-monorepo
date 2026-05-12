export default {
  introspection: {
    type: 'url',
    url: 'http://localhost:8000/subgraphs/name/ticketpulse/subgraph',
  },
  website: {
    template: 'carbon-multi-page',
    output: './docs-build',
    options: {
      appTitle: 'TicketPulse API Docs',
      appLogo: 'https://cryptologos.cc/logos/the-graph-grt-logo.png',
      queryGenerationFactories: {
        'BigInt': '1000000000000000000',
        'Bytes': '0x0000000000000000000000000000000000000000000000000000000000000000',
        'BigDecimal': '1.0',
      },
      pages: [
        {
          title: 'Introduction',
          content: `
# TicketPulse GraphQL API

Welcome to the **TicketPulse Subgraph** API documentation. 
This API provides an optimized indexing layer over the TicketPulse smart contracts, allowing you to seamlessly query events, tickets, users, and market activity.

## 🚀 Endpoint URLs

- **Local Development**: \`http://localhost:8000/subgraphs/name/ticketpulse/subgraph\`
- **GraphiQL Playground**: \`http://localhost:8000/subgraphs/name/ticketpulse/subgraph/graphql\`

*(For production endpoints on Base Sepolia/Mainnet, refer to your Graph Studio deployment links).*
          `
        },
        {
          title: 'Usage Guide & Examples',
          content: `
## Testing Queries

You can practice and test your queries locally using the GraphiQL playground. 
Just open [http://localhost:8000/subgraphs/name/ticketpulse/subgraph/graphql](http://localhost:8000/subgraphs/name/ticketpulse/subgraph/graphql) in your browser.

## Example: Fetching an Event with its Tickets

Here is an example query you might use on the frontend to display an Event page:

\`\`\`graphql
query GetEventDetails($eventId: ID!) {
  event(id: $eventId) {
    id
    name
    symbol
    organizer
    ticketPrice
    totalTickets
    isCancelled
    tickets(first: 5, orderBy: tokenId, orderDirection: asc) {
      id
      tokenId
      owner {
        id
      }
      isListed
    }
  }
}
\`\`\`

## Advanced Filtering

The Graph API automatically generates powerful filters. You can filter lists using the \`where\` argument:

\`\`\`graphql
query GetActiveListings {
  tickets(where: { isListed: true }, orderBy: price, orderDirection: asc) {
    id
    tokenId
    price
    event {
      name
    }
  }
}
\`\`\`
          `
        }
      ]
    }
  }
}

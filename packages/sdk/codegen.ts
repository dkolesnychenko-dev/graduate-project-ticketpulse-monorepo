import type { CodegenConfig } from '@graphql-codegen/cli'

/**
 * GraphQL Code Generator configuration.
 *
 * **Schema sources** — two modes:
 *
 *   1. **Offline (default)** — reads three local files:
 *        • `_scalars.graphql`      — custom scalars & directives (`BigInt`, `Bytes`, `@entity`, …)
 *        • `_graph_autogen.graphql` — types The Graph Node auto-generates at deploy time
 *                                     (`OrderDirection`, `{Entity}_filter`, `{Entity}_orderBy`)
 *        • `../subgraph/schema.graphql` — raw entity schema
 *      Works out of the box on a freshly cloned repo without any infrastructure running.
 *
 *   2. **Online (production)** — when `GRAPHQL_SCHEMA_URL` is set, the
 *      generator introspects the live subgraph instead. Use this when
 *      pointing at The Graph Studio so any custom resolvers / mappings
 *      flow through:
 *
 *        GRAPHQL_SCHEMA_URL=https://api.studio.thegraph.com/query/.../version/latest \
 *        pnpm --filter @ticketpulse/sdk codegen:graphql
 *
 * Output: `src/graphql/__generated__/` — typed `graphql()` helper and
 * fragment-masking-aware types. Gitignored; regenerate after every
 * schema or query change.
 */
const offlineSchema = [
  'src/graphql/_scalars.graphql',
  'src/graphql/_graph_autogen.graphql',
  // Note: ../subgraph/schema.graphql is intentionally NOT loaded here.
  // _graph_autogen.graphql is a codegen-friendly re-declaration of all entity
  // types with proper pagination args and a Query root type — it replaces
  // schema.graphql for offline validation purposes.  schema.graphql is only
  // consumed by graph-node / graph-cli.
]

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env['GRAPHQL_SCHEMA_URL']
    ? [process.env['GRAPHQL_SCHEMA_URL']]
    : offlineSchema,
  documents: ['src/graphql/queries/**/*.graphql'],
  generates: {
    'src/graphql/__generated__/': {
      preset: 'client',
      plugins: [],
      config: {
        useTypeImports: true,
        // Generate string-union types (e.g. `'ACTIVE' | 'COMPLETED'`) instead
        // of TypeScript enum declarations.  This matches the manual type aliases
        // that were already in sdk/src/types/contracts.ts and avoids a mismatch
        // with code that compares status fields against plain string literals.
        enumsAsTypes: true,
        scalars: {
          BigInt: 'string',
          Bytes: 'string',
          BigDecimal: 'string',
          Int8: 'number',
          Timestamp: 'string',
        },
      },
    },
  },
}

export default config

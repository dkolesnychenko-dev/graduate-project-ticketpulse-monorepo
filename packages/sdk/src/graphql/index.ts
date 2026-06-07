/**
 * GraphQL barrel. Re-exports the generated `graphql()` helper from
 * `__generated__/` plus a few hand-written constants the rest of the
 * codebase reads.
 *
 * The generated files are written by `pnpm codegen:graphql`. They are
 * .gitignored — clean checkouts must run codegen before TypeScript can
 * resolve these imports.
 */

// Re-export the typed-document factory + generated types when present.
// The `// @ts-expect-error` lets us ship the barrel before codegen runs;
// once codegen has produced `__generated__/graphql.ts` the error disappears.
// Consumers see a clean compile after `pnpm codegen` runs.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated at build time — file is absent on a fresh checkout until `pnpm codegen` runs
export * from './__generated__/gql'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated at build time — file is absent on a fresh checkout until `pnpm codegen` runs
export * from './__generated__/graphql'

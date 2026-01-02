import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: './src/api/openapi.json',
      filters: {
        tags: ['auth', 'sessions', 'cases'],
      },
    },
    output: {
      target: './src/api/hooks.gen.ts',
      client: 'react-query',
      mode: 'single',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});

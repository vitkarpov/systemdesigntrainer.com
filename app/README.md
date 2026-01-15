# app.systemdesigntrainer.com

## Quick Start

Run these commands to start api (in docker) & app (vite in dev mode):

```
$ cd ../api
$ docker-compose up -d
$ cd ../app
$ npm install
$ curl -o src/api/openapi.json https://api.systemdesigntrainer.com/api-docs-json
$ npm run codegen
$ npm run dev
```

Open the app on localhost

## Storybook

View component documentation and examples:

```
$ npm run storybook
```

Open http://localhost:6006 to browse the component library.

## Documentation

- [Layout Components](./src/components/layout/README.md) - Sentry-inspired layout primitives (Page, Container, Flex, Stack)
- [Button Components](./src/components/ui/button.md) - Enhanced buttons with loading states, semantic variants, and ButtonBar

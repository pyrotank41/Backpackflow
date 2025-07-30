# BagpackFlow

A config-driven LLM framework built on top of [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript). BagpackFlow extends PocketFlow with configuration-driven workflows, utility functions, and enhanced developer experience.

## Features

- **Configuration-Driven**: Define workflows using YAML/JSON configurations
- **Utility Nodes**: Pre-built nodes for common LLM tasks
- **Next.js Integration**: Seamless integration with Next.js applications
- **TypeScript First**: Full TypeScript support with type safety
- **Extensible**: Plugin system for custom nodes and integrations

## Project Structure

```
bagpackflow/
├── src/                    # Source code
│   ├── pocketflow.ts      # PocketFlow core (ported)
│   └── index.ts           # Main entry point
├── tests/                  # Test files
├── examples/               # Example workflows
├── dist/                   # Compiled output
└── docs/                   # Documentation
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Development mode (watch for changes)
npm run dev
```

## Examples

See the `examples/` directory for usage examples.

## License

MIT 
# BackpackFlow

A config-driven LLM framework built on top of [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript). BackpackFlow extends PocketFlow with configuration-driven workflows, utility functions, and enhanced developer experience.

> **⚠️ Work in Progress**: This is a side project that I work on as time permits. APIs are bound to change as the project evolves. Use at your own risk!

## Status

- **Phase**: Early Development
- **Stability**: APIs are unstable and will change
- **Development**: Irregular pace (side project)
- **Current Focus**: Configuration system and core architecture

## Features

- **Configuration-Driven**: Define workflows using YAML/JSON configurations
- **Utility Nodes**: Pre-built nodes for common LLM tasks
- **Next.js Integration**: Seamless integration with Next.js applications
- **TypeScript First**: Full TypeScript support with type safety
- **Extensible**: Plugin system for custom nodes and integrations

## Project Structure

```
backpackflow/
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

## Contributing

This is a personal side project that I work on as time permits. While contributions are welcome, please understand that development pace may be irregular and APIs may change frequently as the project evolves.

## License

MIT 
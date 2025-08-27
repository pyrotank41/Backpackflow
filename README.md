# BackpackFlow

A config-driven LLM framework built on top of [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript). BackpackFlow extends PocketFlow with configuration-driven workflows, utility functions, and enhanced developer experience.

[![npm version](https://badge.fury.io/js/backpackflow.svg)](https://badge.fury.io/js/backpackflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
├── tutorials/              # Learning guides and examples
├── dist/                   # Compiled output
└── docs/                   # Documentation
```

## Installation

```bash
npm install backpackflow
```

## Quick Start

```typescript
import { ChatNode } from 'backpackflow/nodes';
import { OpenAIProvider } from 'backpackflow/providers';
import { Flow } from 'backpackflow';

// Create an LLM provider
const llmProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY
});

// Create a chat node
const chatNode = new ChatNode({
    llmProvider,
    systemMessage: 'You are a helpful assistant.'
});

// Use it in a flow
const flow = new Flow(chatNode);
await flow.run(storage);
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

## Learning & Examples

🎓 **New to BackpackFlow?** Start with our comprehensive tutorial series:

- **[Building AI from First Principles](./tutorials/building-ai-from-first-principles/)** - Learn by building real AI applications
- **[Part 1: Foundations](./tutorials/building-ai-from-first-principles/01-foundations/)** - From API calls to conversations
- **[Simple Chatbot Tutorial](./tutorials/simple-chatbot/)** - Build your first AI chatbot

See the `tutorials/` directory for complete learning guides and usage examples.

## 🤝 Join the Community

Want to contribute, get help, or share what you're building? 

👉 **[Join our community](./tutorials/building-ai-from-first-principles/JOIN_COMMUNITY.md)** - Connect with other developers building AI applications

## Contributing

This is a personal side project that I work on as time permits. While contributions are welcome, please understand that development pace may be irregular and APIs may change frequently as the project evolves.

## License

MIT 
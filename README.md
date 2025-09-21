# BackpackFlow

A config-driven LLM framework built on top of [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript). BackpackFlow extends PocketFlow with configuration-driven workflows, utility functions, and enhanced developer experience.

[![npm version](https://badge.fury.io/js/backpackflow.svg)](https://badge.fury.io/js/backpackflow)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **⚠️ Work in Progress**: This is a side project that I work on as time permits. APIs are bound to change as the project evolves. Use at your own risk!

## Status

- **Phase**: Active Development
- **Version**: 1.2.0 - Event-driven streaming + Explicit LLM client injection
- **Stability**: Core features stabilizing, APIs may still evolve
- **Development**: Regular updates and improvements
- **Current Focus**: Agent workflows and tool integration

## Features

- **Configuration-Driven**: Define workflows using YAML/JSON configurations (⚠️ to be build)
- **Utility Nodes**: Pre-built nodes for common LLM tasks
- **TypeScript First**: Full TypeScript support with type safety
- **Extensible**: Plugin system for custom nodes and integrations

### ✨ New in v1.2.0

- **🤖 Intelligent Agents**: Pre-built `AgentNode` with decision-making, tool calling, and response generation
- **📡 Event-Driven Streaming**: Real-time progress updates and response streaming with type-safe events
- **🔧 Tool Integration**: Seamless MCP (Model Context Protocol) tool discovery and execution
- **🎯 Multi-Provider Support**: OpenAI, Azure OpenAI, and extensible provider system
- **⚡ Explicit Client Injection**: Full control over LLM clients for better testing and configuration

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

### Basic Chat Node (Original)

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

### 🚀 New: Intelligent Agent with Tools (v1.2.0)

```typescript
import { 
    AgentNode, 
    MCPServerManager, 
    createInstructorClient,
    EventStreamer,
    StreamEventType 
} from 'backpackflow';

// 1. Create LLM client (explicit injection)
const instructorClient = createInstructorClient({ provider: 'openai' });

// 2. Set up tool integration (optional)
const mcpManager = new MCPServerManager();
await mcpManager.connectToServers([/* your MCP servers */]);
const availableTools = await mcpManager.discoverTools();

// 3. Create intelligent agent
const salesAgent = new AgentNode({
    llmConfig: {
        instructorClient: instructorClient
    },
    agentName: 'SalesAgent',
    eventStreamer: new EventStreamer(),
    namespace: 'sales_agent'
});

// 4. Set up real-time event streaming (optional)
const eventStreamer = new EventStreamer();
eventStreamer.subscribe('sales_agent', (event) => {
    switch (event.type) {
        case StreamEventType.PROGRESS:
            console.log(`🔄 ${event.nodeId}: ${JSON.stringify(event.content)}`);
            break;
        case StreamEventType.CHUNK:
            process.stdout.write(event.content.chunk); // Real-time response
            break;
        case StreamEventType.FINAL:
            console.log(`✅ Final: ${event.content.content}`);
            break;
    }
});

// 5. Execute with shared storage
const sharedStorage = {
    messages: [{ role: 'user', content: 'Generate a quote for 10A MCB' }],
    available_tools: availableTools,
    tool_manager: mcpManager
};

const result = await salesAgent.exec(sharedStorage);
console.log('Agent response:', result.finalAnswer);
```

### Azure OpenAI Support

```typescript
import { createInstructorClient } from 'backpackflow';

// Azure OpenAI configuration
const azureClient = createInstructorClient({
    provider: 'azure',
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: 'gpt-4' // Your deployment name
});

const agent = new AgentNode({
    llmConfig: { instructorClient: azureClient },
    agentName: 'AzureAgent',
    eventStreamer: new EventStreamer(), // Optional streaming
    namespace: 'azure_agent'
});
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

- **[Simple Sales Agent](./tutorials/simple-sales-agent/)** - 🆕 Complete agent with tool integration and streaming (v1.2.0)
- **[Building AI from First Principles](./tutorials/building-ai-from-first-principles/)** - Learn by building real AI applications
- **[Part 1: Foundations](./tutorials/building-ai-from-first-principles/01-foundations/)** - From API calls to conversations
- **[Simple Chatbot Tutorial](./tutorials/simple-chatbot/)** - Build your first AI chatbot

### Advanced Examples
- **[PocketFlow Cookbook](./tutorials/pocketflow-cookbook-ts/)** - Advanced patterns and workflows

See the `tutorials/` directory for complete learning guides and usage examples.

## 📋 What's New

### v1.2.0 (Latest) - Event-Driven Architecture + Explicit Client Injection
- ✅ **Explicit LLM Client Injection**: Full control over LLM clients for better testing and configuration
- ✅ **Enhanced Event Streaming**: Type-safe `StreamEventType` enum for better event handling
- ✅ **Azure OpenAI Support**: Native support for Azure OpenAI endpoints
- ✅ **Improved AgentNode**: Simplified configuration with better defaults
- ✅ **Better Error Handling**: Enhanced error reporting and debugging
- ✅ **Code Cleanup**: Removed console.log statements in favor of event emissions

### v1.1.0 - Event-Driven Streaming
- ✅ **EventStreamer**: Centralized event management with namespace support
- ✅ **Real-time Streaming**: Live progress updates and response streaming
- ✅ **AgentNode**: High-level agent orchestration with tool integration

### v1.0.x - Initial Release
- ✅ **Core Framework**: Basic PocketFlow integration and node system
- ✅ **LLM Providers**: OpenAI integration and provider abstraction
- ✅ **Basic Nodes**: Chat, Decision, and utility nodes

## 🤝 Join the Community

Want to contribute, get help, or share what you're building? 

👉 **[Join our community](./tutorials/building-ai-from-first-principles/JOIN_COMMUNITY.md)** - Connect with other developers building AI applications

## Contributing

This is a personal side project that I work on as time permits. While contributions are welcome, please understand that development pace may be irregular and APIs may change frequently as the project evolves.

## License

Apache-2.0 - see the [LICENSE](LICENSE) file for details.

Copyright 2024 BackpackFlow 
# Universal Tool Manager - Design & Implementation Plan

## 🎯 **Objective**
Create a unified tool management system that abstracts away specific tool implementations (MCP, local functions, APIs, etc.) and allows our workflow nodes to work with any tool type seamlessly.

## 🚨 **Current Problem**
- Workflow nodes (DecisionNode, ToolExecutionNode, etc.) are tightly coupled to MCP
- Cannot easily use local JavaScript functions as tools
- No way to mix different tool types in a single workflow
- Testing is difficult without MCP servers running
- Performance bottleneck when simple operations require external MCP calls

## 🏗️ **Proposed Architecture**

### **1. Universal Tool Interface**
```typescript
interface UniversalTool {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    provider: 'mcp' | 'local' | 'api' | 'shell' | 'custom';
    metadata?: {
        serverId?: string;      // For MCP tools
        endpoint?: string;      // For API tools
        command?: string;       // For shell tools
        [key: string]: any;
    };
}

interface ToolRequest {
    toolName: string;
    arguments: Record<string, any>;
    provider?: string;  // Optional hint for routing
}

interface ToolResult {
    success: boolean;
    content?: any;
    error?: string;
    metadata?: {
        executionTime: number;
        provider: string;
        isError?: boolean;
    };
}
```

### **2. Tool Adapters**
```typescript
interface ToolAdapter {
    discoverTools(): Promise<UniversalTool[]>;
    executeTool(request: ToolRequest): Promise<ToolResult>;
    isAvailable(): boolean;
}

class MCPToolAdapter implements ToolAdapter { ... }
class LocalToolAdapter implements ToolAdapter { ... }
class APIToolAdapter implements ToolAdapter { ... }
class ShellToolAdapter implements ToolAdapter { ... }
```

### **3. Universal Tool Manager**
```typescript
class UniversalToolManager {
    private adapters: Map<string, ToolAdapter> = new Map();
    private tools: Map<string, UniversalTool> = new Map();
    
    // Registration
    registerAdapter(name: string, adapter: ToolAdapter): void;
    registerMCPManager(manager: MCPServerManager): void;
    registerLocalTool(tool: LocalTool): void;
    registerAPIEndpoint(config: APIToolConfig): void;
    
    // Discovery
    async discoverAllTools(): Promise<UniversalTool[]>;
    getAvailableTools(): UniversalTool[];
    
    // Execution
    async executeTool(request: ToolRequest): Promise<ToolResult>;
    
    // Utilities
    async healthCheck(): Promise<Record<string, boolean>>;
    getToolsByProvider(provider: string): UniversalTool[];
}
```

## 📁 **Proposed Folder Structure**

```
src/
├── nodes/
│   ├── llm/                           # Pure LLM nodes (existing)
│   ├── tools/                         # Tool-agnostic workflow nodes (NEW)
│   │   ├── decision-node.ts          # Migrated from mcp/
│   │   ├── tool-param-generation-node.ts
│   │   ├── tool-execution-node.ts
│   │   ├── final-answer-node.ts
│   │   ├── base-tool-node.ts         # Base class for tool nodes
│   │   ├── types.ts                  # Tool-agnostic types
│   │   └── index.ts
│   ├── integrations/                  # Tool system integrations (NEW)
│   │   ├── mcp/                      # MCP-specific (migrated)
│   │   │   ├── mcp-core.ts           # Existing MCP functionality
│   │   │   ├── mcp-adapter.ts        # MCP → Universal adapter
│   │   │   └── index.ts
│   │   ├── local/                    # Local function tools
│   │   │   ├── local-adapter.ts
│   │   │   ├── function-registry.ts
│   │   │   └── index.ts
│   │   ├── api/                      # REST/GraphQL API tools
│   │   │   ├── api-adapter.ts
│   │   │   ├── openapi-parser.ts     # Parse OpenAPI specs
│   │   │   └── index.ts
│   │   ├── shell/                    # System command tools
│   │   │   ├── shell-adapter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── universal-tool-manager.ts      # Main tool manager (NEW)
│   └── index.ts                      # Updated exports
```

## 🚀 **Implementation Phases**

### **Phase 1: Foundation**
- [ ] Create universal tool interfaces (`UniversalTool`, `ToolRequest`, `ToolResult`)
- [ ] Implement `UniversalToolManager` base class
- [ ] Create `ToolAdapter` interface and base implementation

### **Phase 2: MCP Adapter**
- [ ] Create `MCPToolAdapter` that wraps existing `MCPServerManager`
- [ ] Migrate existing MCP functionality to adapter pattern
- [ ] Ensure backward compatibility with current MCP usage

### **Phase 3: Local Tool Adapter**
- [ ] Implement `LocalToolAdapter` for JavaScript functions
- [ ] Create function registry system
- [ ] Add JSON Schema generation for JS function parameters
- [ ] Support for async/sync functions

### **Phase 4: Node Migration**
- [ ] Move nodes from `src/nodes/mcp/` to `src/nodes/tools/`
- [ ] Update nodes to use `UniversalToolManager` instead of `MCPServerManager`
- [ ] Maintain backward compatibility through adapter layer
- [ ] Update all imports and exports

### **Phase 5: Additional Adapters**
- [ ] Implement `APIToolAdapter` for REST endpoints
- [ ] Implement `ShellToolAdapter` for system commands
- [ ] Add OpenAPI spec parsing for automatic API tool discovery
- [ ] Support for custom tool adapters

### **Phase 6: Advanced Features**
- [ ] Tool caching and performance optimization
- [ ] Fallback mechanisms (local → MCP → API)
- [ ] Tool composition (chaining tools together)
- [ ] Tool versioning and compatibility checks

## 💡 **Usage Examples**

### **Mixed Tool Types**
```typescript
const toolManager = new UniversalToolManager();

// Add MCP tools
await toolManager.registerMCPManager(mcpManager);

// Add local tools
toolManager.registerLocalTool({
    name: "calculate_tax",
    description: "Calculate tax for a given amount",
    inputSchema: {
        type: "object",
        properties: {
            amount: { type: "number" },
            rate: { type: "number" }
        }
    },
    execute: async ({ amount, rate }) => ({
        tax: amount * rate,
        total: amount + (amount * rate)
    })
});

// Add API tools
toolManager.registerAPIEndpoint({
    name: "weather_api",
    description: "Get current weather",
    endpoint: "https://api.weather.com/v1/current",
    method: "GET",
    headers: { "API-Key": process.env.WEATHER_API_KEY }
});

// Use in workflow
const decisionNode = new DecisionNode();
const toolExecNode = new ToolExecutionNode();
// Nodes automatically work with all tool types!
```

### **Testing with Mock Tools**
```typescript
// Easy testing with local mock tools
toolManager.registerLocalTool({
    name: "product_search",
    description: "Mock product search for testing",
    execute: async ({ query }) => ({
        products: [{ name: "Test Product", price: 100 }]
    })
});
```

## 🎯 **Benefits**

1. **🔄 Flexibility**: Mix any tool types in workflows
2. **⚡ Performance**: Use fast local tools when possible
3. **🧪 Testability**: Easy mocking and testing
4. **🛡️ Reliability**: Fallback mechanisms
5. **🔌 Extensibility**: Easy to add new tool types
6. **📦 Reusability**: Nodes work across different projects
7. **🎛️ Control**: Fine-grained tool management and routing

## ⚠️ **Migration Considerations**

- **Backward Compatibility**: Existing MCP code should continue working
- **Gradual Migration**: Can be implemented incrementally
- **Documentation**: Update all examples and tutorials
- **Testing**: Comprehensive test suite for all adapters
- **Performance**: Ensure no regression in MCP tool performance

## 📝 **Next Steps**

1. **Design Review**: Validate architecture with team
2. **Prototype**: Build minimal working version
3. **Proof of Concept**: Migrate one node to test approach
4. **Full Implementation**: Follow phases above
5. **Documentation**: Update guides and examples

---

**Priority**: Medium-High  
**Effort**: Large (3-4 weeks)  
**Impact**: High (enables much more flexible tool usage)  
**Dependencies**: None (can be implemented incrementally)

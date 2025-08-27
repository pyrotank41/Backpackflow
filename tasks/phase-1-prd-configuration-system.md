# Phase 1 PRD: Configuration System for BackpackFlow

## Introduction/Overview

BackpackFlow's Configuration System is a YAML-based workflow definition system that enables both junior developers and non-technical users to create LLM agent workflows without writing code. This system builds on top of PocketFlow's core architecture and BackpackFlow's namespaced storage capabilities to provide a declarative way to define complex multi-node workflows, reducing code duplication and enabling rapid prototyping of LLM applications.

**Problem Statement:** Currently, creating LLM agent workflows (like research agents, customer service bots, or decision-making systems) requires writing complex TypeScript code to manage shared storage, node interactions, and data flow. This creates barriers for non-technical users and slows down rapid prototyping for developers.

**Goal:** Enable users to define complete agent workflows using simple YAML configuration files while leveraging BackpackFlow's namespaced storage architecture to handle complex multi-node scenarios elegantly.

**Core Innovation:** Unlike traditional workflow systems, this configuration system leverages BackpackFlow's namespaced storage capabilities, allowing multiple nodes of the same type (e.g., multiple ChatNodes, DecisionNodes) to coexist without data conflicts. This enables sophisticated agent patterns like:
- **Research agents** with decision-action loops (demonstrated in [PocketFlow tutorial](https://pocketflow.substack.com/p/llm-agent-internal-as-a-graph-tutorial))
- **Customer service workflows** with multiple specialized ChatNodes for different purposes
- **Complex routing systems** where multiple nodes of the same type handle different aspects of the workflow

**Without namespaces**: Multiple ChatNodes would overwrite each other's conversation state
**With namespaces**: Each ChatNode operates in isolation while sharing data declaratively

## Goals

1. **Accessibility**: Enable non-technical users to create complex LLM agent workflows through intuitive configuration files
2. **Developer Productivity**: Allow junior developers to rapidly prototype sophisticated agent applications without writing storage management code
3. **Code Reusability**: Reduce duplication across similar agent workflows through configuration templates and namespaced components
4. **Validation**: Provide comprehensive validation and error handling for configuration files with clear, actionable error messages
5. **Integration**: Seamlessly integrate with existing PocketFlow classes and BackpackFlow's namespaced storage without breaking changes
6. **Agent Pattern Support**: Native support for common agent patterns like decision-action loops, multi-step reasoning, and parallel processing
7. **Multi-Node Workflows**: Enable sophisticated workflows using multiple instances of the same BackpackFlow node type with isolated state management

## User Stories

### Primary User Stories
1. **As a junior developer**, I want to define an agent workflow in YAML so that I can quickly prototype sophisticated LLM applications like research agents or customer service bots without writing complex storage management code or worrying about namespace conflicts between multiple ChatNodes.

2. **As a non-technical user**, I want to configure agent workflows through a simple config file so that I can create intelligent agents with multiple specialized conversation contexts (customer-facing, internal notes, technical consultation) without writing any code.

3. **As a team lead**, I want to create reusable agent templates that use multiple BackpackFlow nodes (multiple ChatNodes, DecisionNodes, SearchNodes) so that my team can build sophisticated workflows without reinventing storage management patterns.

4. **As a developer**, I want to use multiple ChatNodes in a single workflow (e.g., customer support + technical specialist + internal notes) with different LLM providers and isolated conversation states, configured declaratively in YAML.

### Secondary User Stories
4. **As a developer**, I want to validate my agent workflow configuration before running it so that I can catch namespace conflicts, invalid data flows, and missing resources early.

5. **As a developer**, I want to import/export agent workflow configurations so that I can share and reuse sophisticated agent patterns across projects.

6. **As a product manager**, I want to understand how my agent makes decisions by inspecting the namespaced storage (decisions.routing, search.web_search, chats.customer_support, chats.technical_specialist) without technical knowledge.

7. **As a customer service manager**, I want to configure workflows where multiple ChatNodes handle different aspects (customer interaction, technical consultation, escalation notes, final response) while maintaining separate conversation contexts.

### Multi-Node Use Case Scenarios

**Scenario 1: Customer Service Pipeline**
- **customer_support** ChatNode: Customer-facing conversation
- **technical_specialist** ChatNode: Internal technical consultation  
- **escalation_notes** ChatNode: Management escalation documentation
- **final_response** ChatNode: Polished customer response

**Scenario 2: Content Creation Workflow**
- **research_chat** ChatNode: Research and fact-gathering
- **outline_generation** ChatNode: Structure and outline creation
- **content_writing** ChatNode: Main content creation
- **editing_review** ChatNode: Editing and quality review

**Scenario 3: Multi-Language Support**
- **english_chat** ChatNode: English conversation
- **spanish_chat** ChatNode: Spanish translation/conversation
- **french_chat** ChatNode: French translation/conversation
- **summary_chat** ChatNode: Cross-language summary

**Scenario 4: A/B Testing Framework**
- **variant_a_chat** ChatNode: Response variant A
- **variant_b_chat** ChatNode: Response variant B
- **evaluation_chat** ChatNode: Compare and evaluate variants
- **final_selection** ChatNode: Select best response

**Common Pattern**: Each ChatNode serves a distinct purpose while sharing data through the namespaced storage system, enabling complex workflows that would be impossible with traditional single-node systems.

## Functional Requirements

### 1. YAML Configuration Parser
- The system must parse YAML configuration files
- The system must validate YAML syntax and structure
- The system must provide clear error messages for invalid configurations

### 2. Multi-Node Namespaced Definition System
- The system must allow defining multiple instances of the same BackpackFlow node type (e.g., 4 ChatNodes) with different namespaces to prevent storage conflicts
- The system must support all existing PocketFlow node types (Node, BatchNode, ParallelBatchNode) with namespace awareness
- The system must support BackpackFlow's specialized nodes (ChatNode, SearchNode, DecisionNode) with namespace configuration and isolation
- The system must validate that namespace references are consistent across the workflow and detect naming conflicts
- The system must support data mapping between namespaces using JSONPath-style selectors (e.g., "chats.customer_support.messages[-1].content")
- The system must allow each node instance to use different resources (different LLM providers, different configurations) while maintaining the same node type

### 3. Agent Flow Connection System
- The system must define agent workflow connections and decision-based routing logic in YAML
- The system must support conditional routing based on node post() results (e.g., decision node returns "search" or "answer")
- The system must validate that all connections reference valid nodes and namespaces
- The system must support common agent patterns like decision-action loops and multi-step reasoning chains
- The system must handle circular flows (e.g., DecisionNode → SearchNode → DecisionNode) without infinite loops

### 4. Resource Management System
- The system must support centralized resource definitions (LLM providers, search APIs, databases, etc.)
- The system must allow namespaced nodes to reference and use these resources
- The system must manage resource context and limits across agent workflow runs
- The system must support resource-specific configurations (model parameters, API limits, timeout settings)
- The system must provide resource abstraction to prevent vendor lock-in (OpenAI, Anthropic, local models)

### 5. Configuration Validation
- The system must validate node parameter types and required fields
- The system must check for circular dependencies in workflow connections
- The system must ensure all referenced resources exist and are properly configured

### 6. Agent Workflow Execution
- The system must convert YAML configurations into executable PocketFlow workflows with proper namespace initialization
- The system must maintain the same prep→exec→post execution lifecycle as native PocketFlow
- The system must provide detailed logging and error reporting with namespace-aware debugging
- The system must support data flow tracing across namespaces for debugging complex agent behaviors
- The system must handle agent state persistence across multiple workflow runs

### 7. Agent-Aware Error Handling
- The system must provide clear, actionable error messages with namespace context
- The system must validate agent configurations before execution (namespace conflicts, invalid data flows, missing resources)
- The system must handle runtime errors gracefully with proper cleanup and namespace state recovery
- The system must detect and prevent infinite loops in agent decision cycles
- The system must provide debugging tools to inspect agent decision-making process across namespaces

## Non-Goals (Out of Scope)

1. **Visual Workflow Builder**: Web UI for editing configurations (planned for later phases)
2. **Complex Conditional Logic**: Advanced if/case statements and loops in config files (future enhancement)
3. **Configuration Inheritance**: Template inheritance and composition (future enhancement)
4. **Hot-Reloading**: Dynamic configuration reloading during execution
5. **Environment Variables in Config**: Direct embedding of secrets in configuration files
6. **Web UI**: Any web-based configuration editing interface

## Design Considerations

### Configuration Format (YAML)
The system will use YAML as the primary configuration format due to its readability and conciseness. The configuration leverages BackpackFlow's namespaced storage architecture to enable sophisticated agent patterns.

#### Research Agent Example (Based on PocketFlow Tutorial Pattern)
```yaml
workflow:
  name: "research-agent"
  storage: ["chats", "search", "decisions"]  # Namespaced capabilities
  
  resources:
    openai:
      type: "llm-provider"
      config:
        api_key: "${OPENAI_API_KEY}"
        model: "gpt-4"
        
    serp:
      type: "search-provider"
      config:
        api_key: "${SERP_API_KEY}"
  
  nodes:
    routing_decision:
      type: "decision-node"
      namespace: "routing"              # Isolated decision state
      resource: "openai"
      inputs:
        question: "metadata.userQuestion"
        search_results: "search.web_search.results"
      available_actions: ["search", "answer"]
      decision_prompt: |
        You are a research agent. Given the question and current state, decide what to do next.
        Question: {{question}}
        Search results found: {{search_results.length}}
        If you have sufficient information, choose "answer".
        If you need more information, choose "search".
        
    web_search:
      type: "search-node"
      namespace: "web_search"           # Isolated search state
      resource: "serp"
      inputs:
        query: "metadata.userQuestion"
      config:
        max_results: 3
        
    final_answer:
      type: "chat-node"
      namespace: "final_answer"         # Isolated conversation state
      resource: "openai"
      inputs:
        user_question: "metadata.userQuestion"
        search_results: "search.web_search.results"
      system_message: "Provide comprehensive answers based on research results"
      prompt_template: |
        Based on this research, answer: "{{user_question}}"
        Research Results:
        {{#each search_results}}
        - {{content}} ({{metadata.url}})
        {{/each}}
  
  flow:
    start: "routing_decision"
    connections:
      routing_decision:
        search: "web_search"            # Decision → Action
        answer: "final_answer"          # Decision → Response  
      web_search:
        default: "routing_decision"     # Action → Decision (loop)
```

#### Multi-ChatNode Customer Service Example (Multiple BackpackFlow Nodes)
**This example demonstrates the key innovation: multiple ChatNodes with different purposes in a single workflow, each operating in isolated namespaces.**

```yaml
workflow:
  name: "customer-service-agent"
  storage: ["chats", "decisions"]
  
  resources:
    openai:
      type: "llm-provider"
      config:
        api_key: "${OPENAI_API_KEY}"
        model: "gpt-4"
        
    anthropic:
      type: "llm-provider"
      config:
        api_key: "${ANTHROPIC_API_KEY}"
        model: "claude-3"
  
  nodes:
    # ChatNode #1: Customer-facing conversation
    customer_chat:
      type: "chat-node"               # BackpackFlow ChatNode
      namespace: "customer_support"   # Isolated conversation
      resource: "openai"
      system_message: "You are a friendly customer support agent. Be helpful and professional."
      inputs:
        user_message: "workflow.input.message"
      
    # DecisionNode: Route based on complexity
    routing_decision:
      type: "decision-node"
      namespace: "routing"
      resource: "openai"
      inputs:
        customer_conversation: "chats.customer_support.messages"
        user_sentiment: "metadata.sentiment"
      available_actions: ["escalate", "resolve", "specialist"]
      decision_prompt: |
        Based on this customer conversation, decide the next action:
        Conversation: {{customer_conversation}}
        
        Choose:
        - "resolve" if the issue is simple and resolved
        - "specialist" if technical expertise is needed
        - "escalate" if the customer is frustrated
    
    # ChatNode #2: Technical specialist consultation
    specialist_chat:
      type: "chat-node"               # Same BackpackFlow ChatNode type
      namespace: "technical_specialist" # Different namespace = isolated state
      resource: "anthropic"            # Different LLM provider
      system_message: "You are a technical specialist. Provide detailed technical solutions."
      inputs:
        customer_issue: "chats.customer_support.messages[-1].content"
        context: "chats.customer_support.messages"
      prompt_template: |
        Customer Issue: {{customer_issue}}
        
        Context from support conversation:
        {{#each context}}
        {{role}}: {{content}}
        {{/each}}
        
        Provide a technical solution.
    
    # ChatNode #3: Internal escalation notes
    internal_notes:
      type: "chat-node"               # Third ChatNode instance
      namespace: "internal_escalation" # Another isolated namespace
      resource: "openai"
      system_message: "Generate internal escalation notes for management review."
      inputs:
        customer_conversation: "chats.customer_support.messages"
        specialist_input: "chats.technical_specialist.messages[-1].content"
        routing_decision: "decisions.routing.current.reasoning"
      prompt_template: |
        ESCALATION REPORT
        
        Customer Conversation Summary:
        {{#each customer_conversation}}
        {{role}}: {{content}}
        {{/each}}
        
        Specialist Assessment: {{specialist_input}}
        Routing Reasoning: {{routing_decision}}
        
        Generate internal notes for management.
    
    # ChatNode #4: Final customer response
    final_response:
      type: "chat-node"               # Fourth ChatNode instance
      namespace: "final_customer_response" # Isolated final response
      resource: "openai"
      system_message: "Provide a final, polished response to the customer."
      inputs:
        original_conversation: "chats.customer_support.messages"
        specialist_solution: "chats.technical_specialist.messages[-1].content"
      prompt_template: |
        Based on this technical solution: {{specialist_solution}}
        
        And this customer conversation: 
        {{#each original_conversation}}
        {{role}}: {{content}}
        {{/each}}
        
        Provide a clear, customer-friendly final response.
  
  flow:
    start: "customer_chat"
    connections:
      customer_chat:
        default: "routing_decision"
      routing_decision:
        resolve: "final_response"        # Simple resolution
        specialist: "specialist_chat"    # Technical consultation
        escalate: "internal_notes"       # Management escalation
      specialist_chat:
        default: "final_response"
      internal_notes:
        default: "final_response"
```

**Key Innovation Demonstrated:**
- **4 ChatNode instances** in a single workflow, each with isolated state
- **Different LLM providers** (OpenAI, Anthropic) for different purposes
- **Cross-namespace data flow** - nodes can reference other namespaces' data
- **No storage conflicts** - each ChatNode maintains separate conversation history
- **Complex routing logic** - decision-based flow control between multiple chat contexts

**Storage Structure Result:**
```typescript
storage = {
  chats: {
    customer_support: { messages: [...] },      // Customer conversation
    technical_specialist: { messages: [...] },   // Technical consultation  
    internal_escalation: { messages: [...] },    // Internal notes
    final_customer_response: { messages: [...] } // Polished response
  },
  decisions: {
    routing: { 
      current: { action: "specialist", reasoning: "..." },
      history: [...]
    }
  }
}
```

#### Content Generation Example (Simpler Linear Flow)
```yaml
workflow:
  name: "content-generation"
  storage: ["chats"]
  
  resources:
    openai:
      type: "llm-provider"
      config:
        api_key: "${OPENAI_API_KEY}"
        model: "gpt-4"
  
  nodes:
    generate_outline:
      type: "chat-node"
      namespace: "outline_generation"
      resource: "openai"
      inputs:
        topic: "workflow.input.topic"
      prompt_template: "Generate an outline for: {{topic}}"
    
    generate_content:
      type: "chat-node"
      namespace: "content_generation"
      resource: "openai"
      inputs:
        topic: "workflow.input.topic"
        outline: "chats.outline_generation.messages[-1].content"
      prompt_template: |
        Write content for: {{topic}}
        Based on this outline: {{outline}}
        
  flow:
    start: "generate_outline"
    connections:
      generate_outline:
        default: "generate_content"
```

### Namespaced Storage Architecture
BackpackFlow's namespaced storage system enables sophisticated agent patterns by providing isolated storage spaces for different node types and purposes:

#### Storage Capabilities
```typescript
// Agent storage with multiple namespaces
type ResearchAgentStorage = {
  decisions: {
    routing: {                        // Decision-making state
      context: string;
      availableActions: string[];
      history: DecisionRecord[];
      current?: CurrentDecision;
    }
  },
  search: {
    web_search: {                     // Search operation state  
      query?: string;
      results: SearchResult[];
      config: SearchConfig;
    }
  },
  chats: {
    final_answer: {                   // Conversation state
      messages: Message[];
      context?: string;
      config: ChatConfig;
    }
  }
}
```

#### Data Flow Between Namespaces
- **Input Mapping**: Nodes declare what data they need using JSONPath selectors (`"search.web_search.results"`, `"chats.final_answer.messages[-1].content"`)
- **Namespace Isolation**: Each node type operates in its own namespace, preventing data conflicts
- **Cross-Namespace References**: Template system allows data to flow between namespaces declaratively

### Resource Management
Resources will be centralized entities that manage external service connections and are referenced by namespaced nodes:
- **LLM Providers**: OpenAI, Anthropic, local models with consistent interfaces
- **Search Providers**: Google, Bing, custom search APIs
- **Authentication**: Centralized secret management with environment variable support
- **Rate Limiting**: Resource-specific limits and connection pooling
- **Namespace Awareness**: Resources understand which namespace is calling them for logging and debugging

## Technical Considerations

### Integration with PocketFlow
- The configuration system must extend existing PocketFlow classes without breaking changes
- All existing PocketFlow functionality must remain available
- New features should be additive, not replacement

### Validation Strategy
- Schema validation for YAML structure
- Type checking for node parameters
- Dependency validation for workflow connections
- Resource availability checking

### Error Handling Strategy
- Pre-execution validation with detailed error messages
- Runtime error handling with proper resource cleanup
- Graceful degradation when resources are unavailable

### Performance Considerations
- Efficient YAML parsing and validation
- Minimal overhead when converting configs to executable workflows
- Resource pooling and connection reuse

## Success Metrics

1. **Developer Productivity**: Reduce time to create a basic LLM workflow from hours to minutes
2. **User Adoption**: Enable non-technical users to create working workflows without code
3. **Error Reduction**: Decrease configuration errors through comprehensive validation
4. **Code Reuse**: Increase workflow template reuse across projects
5. **Maintainability**: Reduce maintenance overhead through declarative configurations

## Open Questions

1. **Namespace Naming Conventions**: Should we enforce naming conventions for namespaces or allow free-form naming?
2. **Resource Scope**: Should resources be workflow-scoped or global across multiple workflows? How do namespaced nodes share resources?
3. **Secret Management**: What's the best approach for handling API keys and sensitive data in multi-resource agent workflows?
4. **Configuration Versioning**: How should we handle configuration file versioning and backward compatibility as agent patterns evolve?
5. **Performance Monitoring**: What metrics should we collect to measure agent performance across namespaces (decision latency, search quality, response time)?
6. **Template Library**: Should we create a library of common agent templates (research agent, customer service agent, analysis agent), and how should they be structured?
7. **Namespace Data Retention**: How long should namespace data be retained? Should we support namespace cleanup policies?
8. **Cross-Workflow Namespaces**: Can namespaces be shared across different workflow instances for persistent agent memory?

## Implementation Phases

### Phase 1.1: Core Parser & Namespace Foundation
- YAML configuration parser with namespace awareness
- Basic namespaced node definition system supporting multiple instances of same node type
- Simple agent workflow execution (linear flows)
- Research agent proof-of-concept implementation
- Multi-ChatNode customer service workflow proof-of-concept

### Phase 1.2: Agent Patterns & Validation
- Decision-action loop support (DecisionNode → ActionNode → DecisionNode)
- Multi-node workflow patterns (multiple ChatNodes, SearchNodes, DecisionNodes)
- Comprehensive validation system with namespace conflict detection and multi-node validation
- Resource management framework with multi-provider support (different LLMs for different ChatNodes)
- Error handling and reporting with namespace context and multi-node debugging

### Phase 1.3: Advanced Agent Features
- Complex conditional routing support (multi-branch decisions across multiple node instances)
- Agent template system (research agent, customer service agent with multiple ChatNodes, etc.)
- Cross-namespace data flow optimization for multi-node workflows
- Import/export functionality for complex multi-node agent configurations
- Agent performance monitoring and debugging tools with per-namespace metrics

### Phase 1.4: Production Readiness
- Agent state persistence and recovery
- Multi-tenant namespace isolation
- Advanced resource management (connection pooling, rate limiting)
- Agent workflow analytics and observability

## Dependencies

- **PocketFlow Core**: Existing node and flow classes (prep→exec→post lifecycle)
- **BackpackFlow Namespaced Storage**: Existing capability-based storage system with namespace support
- **YAML Parser**: `js-yaml` or similar library for configuration parsing
- **Validation**: JSON Schema or custom validation logic with namespace awareness
- **Resource Management**: Custom resource abstraction layer with multi-provider support
- **Template Engine**: Handlebars or similar for data flow between namespaces
- **JSONPath**: For declarative data selection across namespaced storage

## Risk Assessment

### High Risk
- **Namespace Complexity**: Balancing namespace flexibility with user comprehension
- **Agent Loop Detection**: Preventing infinite decision-action loops in agent workflows
- **Performance**: Ensuring namespace resolution and data flow doesn't add significant overhead

### Medium Risk
- **Integration**: Maintaining compatibility with existing PocketFlow features while adding namespace awareness
- **Validation**: Creating comprehensive yet user-friendly validation for complex agent workflows
- **Data Flow Complexity**: Managing declarative data mapping between namespaces

### Low Risk
- **YAML Parsing**: Well-established libraries available
- **Resource Management**: Standard patterns for provider abstraction
- **Template Systems**: Proven technologies for data interpolation 
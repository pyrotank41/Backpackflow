# Conversational Sales Agent

A simple yet powerful conversational sales agent built on PocketFlow, designed to handle customer inquiries with tool integration and cohesive conversation memory.

## 🎯 Project Overview

This project implements a conversational AI sales agent that can:
- Maintain natural conversation flow with memory
- Use tools (like product lookup) strategically
- Provide cohesive responses that build on conversation history
- Handle missing information gracefully
- Scale from simple to complex scenarios

## 🏗️ Architecture Decisions

### Design Evolution: From Complex to Simple

We went through several iterations to find the right balance:

#### Phase 1: Complex Multi-Node Architecture ❌
- **Initial Approach**: Multiple specialized nodes (ToolDiscovery, Reasoning, Planning, Execution, Synthesis)
- **Why We Abandoned**: Too complex for the use case, hard to understand and maintain
- **Learning**: Start simple, add complexity only when needed

#### Phase 2: Single Tool Integration ✅
- **Decision**: Focus on one tool (product lookup) first
- **Rationale**: Easier to understand, test, and build upon
- **Result**: Much more manageable starting point

#### Phase 3: Conversation-Aware Design ✅
- **Key Insight**: Must maintain conversation history and context
- **Implementation**: Single node that handles conversation memory + tool integration
- **Benefits**: Natural conversation flow while still having tool capabilities

#### Phase 4: Configuration-Driven Prompts ✅
- **Decision**: All prompts in YAML configuration, not hardcoded
- **Benefits**: Easy to modify agent behavior, A/B test prompts, create different agents
- **Avoided**: Complex metadata systems that would overcomplicate

#### Phase 5: Cohesive Prompt Strategy ✅
- **Key Breakthrough**: Unified prompt system where all stages work together
- **Problem Solved**: Fragmented prompts that don't share context
- **Solution**: Core context flows through all prompt stages, tool history is preserved

## 🧠 Key Design Principles

### 1. **Simplicity First**
- Start with the simplest solution that works
- Add complexity only when there's a clear need
- Prefer single-node solutions over complex flows for basic use cases

### 2. **Cohesive Prompts**
- All prompts share the same core context
- Conversation history flows through every stage
- Tool history is preserved and referenced
- Each prompt stage builds on the previous

### 3. **Configuration-Driven**
- All behavior configurable via YAML
- No hardcoded prompts or business logic
- Easy to create different agent personalities
- Simple to test and iterate

### 4. **Conversation-Aware**
- Every response considers full conversation context
- Tool usage decisions based on conversation history
- Avoid redundant information gathering
- Build rapport and maintain context continuity

## 🛠️ Final Architecture

### Core Components

```
Customer Query → ConversationalSalesAgent → Response
                       ↓
                [Tool Integration]
                       ↓
                [Cohesive Analysis]
                       ↓
                [Context-Aware Response]
```

### Storage Structure
```typescript
interface ConversationalSalesStorage {
    conversationId: string;
    messages: ConversationMessage[];
    currentMessage: string;
    currentResponse: string;
    toolsUsed: ToolUsage[];
    toolHistory: ToolHistoryEntry[]; // For context continuity
}
```

### Prompt Strategy
1. **Core Context**: Flows through all stages
2. **Agent Thinking**: Unified analysis considering conversation + tool history
3. **Response Generation**: Complete context awareness with tool integration

## 📋 Configuration Structure

```yaml
agent:
  name: "ConversationalSalesAgent"
  model: "gpt-4o-mini"
  temperature: 0.3

prompts:
  core_context: |
    # Base context that flows through all stages
  
  agent_thinking: |
    # Unified analysis prompt with conversation + tool history
  
  response_generation: |
    # Final response with complete context awareness

tools:
  product_lookup:
    description: "Find product details and pricing"
    parameters:
      product_query:
        type: "string"
        required: true
```

## 🎭 Example Use Cases

### Basic Product Inquiry
```
User: "I need circuit breakers"
Agent: [Uses product_lookup] → Provides product options

User: "What about 20A ones?"
Agent: [References previous lookup] → "From the options I showed earlier, here are the 20A models..."
```

### Missing Information Handling
```
User: "Generate a quote for 10 MCBs"
Agent: "I'd be happy to create that quote. I need a few details: customer name, contact person..."
User: [Provides info]
Agent: [Uses tools] → Generates complete quote
```

## 🚀 Implementation Approach

### Phase 1: Basic Agent ✅ (Designed)
- Single conversational node
- One tool (product_lookup)
- Simple conversation memory
- YAML configuration

### Phase 2: Enhanced Context (Next)
- Tool history integration
- Cohesive prompt system
- Advanced conversation analysis

### Phase 3: Multi-Tool Support (Future)
- Quote generation tools
- Customer lookup tools
- Inventory checking
- Email/communication tools

### Phase 4: Advanced Features (Future)
- Missing information gathering flows
- Complex reasoning chains
- Multi-node orchestration when needed

## 🔧 Key Technical Decisions

### 1. **Single Node vs Multi-Node**
- **Decision**: Start with single node
- **Rationale**: Simpler to understand, test, and maintain
- **Future**: Can split into multiple nodes when complexity demands it

### 2. **Tool Integration Strategy**
- **Decision**: Tools called within the main conversation node
- **Benefits**: Maintains conversation context, simpler flow
- **Alternative Rejected**: Separate tool execution nodes (too complex for start)

### 3. **Prompt Management**
- **Decision**: YAML-based configuration with variable substitution
- **Benefits**: Easy to modify, version control, A/B testing
- **Alternative Rejected**: Hardcoded prompts (not flexible enough)

### 4. **Context Preservation**
- **Decision**: Tool history stored separately from conversation messages
- **Benefits**: Can reference previous tool results without cluttering conversation
- **Implementation**: `toolHistory` array with structured tool call data

### 5. **Metadata Approach**
- **Decision**: No complex metadata system initially
- **Rationale**: Keep it simple, avoid over-engineering
- **Future**: Can add metadata when specific use cases demand it

## 🎯 Success Criteria

### Immediate Goals
- [x] Natural conversation flow
- [x] Strategic tool usage
- [x] Configuration-driven behavior
- [x] Context preservation across turns
- [x] Tool history awareness

### Future Goals
- [ ] Multi-tool orchestration
- [ ] Complex reasoning chains
- [ ] Missing information gathering
- [ ] Performance optimization
- [ ] Scalability to enterprise use cases

## 📚 Lessons Learned

### 1. **Start Simple, Scale Smart**
Complex architectures are tempting but often unnecessary. Begin with the simplest solution that solves the core problem.

### 2. **Cohesive Prompts Are Critical**
Fragmented prompts lead to disconnected responses. Design prompts as a unified system where context flows naturally.

### 3. **Conversation Memory Is Essential**
AI agents without conversation awareness feel robotic. Every response should demonstrate understanding of the full conversation.

### 4. **Configuration > Code**
Behavior changes should be configuration changes, not code changes. This enables rapid iteration and customization.

### 5. **Tool History Matters**
Don't just track what tools were called - preserve the context and results for future reference in the conversation.

## 🛣️ Implementation Roadmap

### Sprint 1: Basic Foundation
- [ ] Implement basic conversational node
- [ ] Add product_lookup tool integration
- [ ] Create YAML configuration system
- [ ] Build conversation memory

### Sprint 2: Cohesive Prompts
- [ ] Implement unified prompt system
- [ ] Add tool history tracking
- [ ] Build context-aware response generation
- [ ] Test conversation continuity

### Sprint 3: Polish & Testing
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Configuration validation
- [ ] Comprehensive testing

### Sprint 4: Extensions
- [ ] Additional tools (quote generation, etc.)
- [ ] Advanced conversation analysis
- [ ] Missing information gathering
- [ ] Production readiness

## 🔍 Testing Strategy

### Unit Tests
- Individual node functionality
- Tool integration
- Configuration loading
- Prompt generation

### Integration Tests
- Full conversation flows
- Tool history preservation
- Context continuity
- Error scenarios

### User Experience Tests
- Natural conversation feel
- Appropriate tool usage
- Information continuity
- Customer satisfaction scenarios

## 📈 Future Enhancements

### Near Term
- Quote generation tools
- Customer database integration
- Inventory checking
- Email/SMS capabilities

### Medium Term
- Multi-agent collaboration
- Advanced reasoning chains
- Workflow automation
- Analytics and reporting

### Long Term
- Voice interface
- Multi-language support
- Advanced personalization
- Enterprise-scale deployment

---

*This README documents our journey from complex multi-node architectures to a simple, effective conversational agent. The key insight: start simple, focus on conversation continuity, and scale thoughtfully.*

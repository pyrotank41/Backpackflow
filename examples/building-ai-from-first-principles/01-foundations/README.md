# Part 1: Foundations - From API Calls to Conversations 🏗️

*Building AI from First Principles Series*

Welcome to the foundation of everything we'll build in this series! In this part, we'll start with the absolute basics and work our way up to understanding how complex AI systems are just simple ideas stacked together.

## What You'll Learn 🎯

By the end of this part, you'll understand:

- **The PocketFlow Pattern** - How `prep → exec → post` makes AI code cleaner and more testable
- **API vs Conversation** - The difference between a single completion and a real chatbot
- **Shared Storage** - How to maintain state across AI interactions
- **Reusable Components** - Building blocks you can use in any AI project

## What We're Building 🔨

Just **two files** that show the complete journey from learning to production:

### 1. Chat Completion (`chat-completion.ts`)
- **What it is**: Basic OpenAI call wrapped in PocketFlow's Node pattern
- **Why start here**: Learn prep → exec → post lifecycle without complexity
- **Style**: Clean, focused, and easy to follow

### 2. Interactive Terminal Chat (`terminal-chat.ts`)
- **What it is**: A real interactive chatbot with persistent conversation history
- **Why it matters**: Shows how SharedStorage maintains state across multiple interactions
- **Features**: Commands (history, clear, exit), error handling, user-friendly interface

## The Big Picture: Understanding PocketFlow 🌟

Before diving into code, let's understand what makes PocketFlow special. Traditional AI code often looks like this:

```typescript
// Traditional approach - everything mixed together
async function chatbot(message: string) {
    const conversation = [];
    conversation.push({role: 'user', content: message});
    const response = await openai.complete(conversation);
    conversation.push({role: 'assistant', content: response});
    return conversation;
}
```

**Problems with this approach:**
- Hard to test individual pieces
- Difficult to add features like retries, logging, or validation
- Mixing concerns (data prep, API calls, result handling)
- Not reusable across different use cases

PocketFlow solves this with a clear pattern:

```typescript
// PocketFlow approach - separated concerns
class ChatNode extends Node<SharedStorage> {
    async prep(shared) { /* Prepare data */ }
    async exec(prepared) { /* Do the work */ }
    async post(shared, prepared, result) { /* Handle results */ }
}
```

**Benefits:**
- 🧪 **Testable** - Test each phase independently
- 🔧 **Debuggable** - Know exactly where things go wrong
- 🚀 **Extensible** - Add new features without breaking existing code
- 🔄 **Reusable** - Use the same node in different flows

## Step-by-Step Walkthrough 📚

### Step 1: Shared Storage - The Foundation

Everything in PocketFlow revolves around the `SharedStorage` object that travels through your entire flow:

```typescript
type SharedStorage = {
    messages: Message[];  // Conversation history
    // Later we might add: context, metadata, user_data, etc.
}
```

This is how nodes communicate and maintain state across the entire workflow. Think of it as the "memory" of your AI system.

### Step 2: Understanding the Node Lifecycle

Every PocketFlow Node has three phases that work with the shared storage:

```typescript
class ChatNode extends Node<SharedStorage> {
    // 1. PREP: Get data ready
    async prep(shared: SharedStorage): Promise<Message[]> {
        shared.messages.push({ role: 'user', content: this.userMessage });
        return shared.messages; // This goes to exec()
    }
    
    // 2. EXEC: Do the main work
    async exec(messages: Message[]): Promise<string> {
        const response = await callLLM(messages);
        return response; // This goes to post()
    }
    
    // 3. POST: Handle results
    async post(shared: SharedStorage, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
        shared.messages.push({ role: 'assistant', content: execRes as string });
        return undefined; // End the flow
    }
}
```

**Why this separation matters:**
- **Prep**: Data validation, formatting, context building
- **Exec**: The actual AI call (or any heavy computation)
- **Post**: Result processing, storage, error handling

### Step 3: From Node to Flow

A Flow orchestrates one or more Nodes:

```typescript
class ChatFlow extends Flow<SharedStorage> {
    constructor(userMessage: string) {
        const chatNode = new ChatNode(userMessage);
        super(chatNode); // Start with this node
    }
}
```

For now, we have one node. Later in the series, you'll see flows with multiple nodes chained together for complex workflows.

## Running the Examples 🚀

### Prerequisites

1. **Install dependencies**:
   ```bash
   npm install dotenv openai ai @ai-sdk/openai @types/node
   ```

2. **Set up your API key** in `.env`:
   ```
   OPENAI_API_KEY=your-actual-api-key-here
   ```

### Part 1A: Chat Completion
```bash
npx ts-node examples/building-ai-from-first-principles/01-foundations/chat-completion.ts
```

**What you'll learn:**
- Basic PocketFlow Node lifecycle
- prep → exec → post pattern
- Clean OpenAI integration

### Part 1B: Interactive Terminal Chat
```bash
npx ts-node examples/building-ai-from-first-principles/01-foundations/terminal-chat.ts
```

**What you'll experience:**
- Real-time conversation with AI
- Persistent conversation history
- Interactive commands (history, clear, exit)
- How SharedStorage maintains state across interactions

## Key Concepts Explained 💡

### Understanding the Terminal Chat Code

The `terminal-chat.ts` file shows how to build a complete interactive chatbot. Here are the key parts:

#### 1. Persistent SharedStorage
```typescript
class TerminalChat {
    private shared: SharedStorage;
    
    constructor() {
        this.shared = { messages: [] }; // This persists across all interactions
    }
}
```
The `shared` object maintains conversation history throughout the entire chat session.

#### 2. Interactive Loop
```typescript
private async processUserInput(input: string): Promise<boolean> {
    // Handle commands like 'exit', 'history', 'clear'
    if (['exit', 'quit', 'bye'].includes(trimmedInput)) {
        return false; // Exit chat
    }
    
    // Send message using the same PocketFlow pattern
    const response = await sendMessage(this.shared, input.trim());
    
    return true; // Continue chat
}
```
Each user input goes through the same PocketFlow Node lifecycle, but the SharedStorage accumulates history.

#### 3. User Experience Features
- **Commands**: `history`, `clear`, `exit` for better interaction
- **Visual feedback**: Typing indicators, colored output
- **Error handling**: Graceful failures with helpful messages

### API Call vs Interactive Chat

**Chat Completion** (`chat-completion.ts`):
```
User Input → Process → AI Response → End
```
- No memory between runs
- Perfect for one-off tasks
- Foundation for understanding the pattern

**Interactive Chat** (`terminal-chat.ts`):
```
User Input → Add to History → AI Response → Add to History → Continue...
```
- Maintains conversation context
- Handles multiple interactions
- Real conversational AI

### The Power of Separation

Notice how we separated concerns:

1. **`shared/llm-core.ts`** - Reusable components
2. **`simple-completion.ts`** - Focused example of basic usage
3. **`interactive-chat.ts`** - Advanced features built on the same foundation

This means you can:
- Import `llm-core` into any project
- Test components independently
- Mix and match for different use cases

## Common Questions ❓

**Q: Why use PocketFlow instead of calling OpenAI directly?**
A: For simple cases, direct calls work fine. PocketFlow shines when you need testing, error handling, retries, logging, or complex multi-step workflows.

**Q: When should I use chat-completion vs terminal-chat?**
A: Use chat-completion to learn PocketFlow fundamentals and for one-off tasks. Use terminal-chat for interactive applications where you need persistent conversation history.

**Q: How does this scale to complex agents?**
A: The same Node pattern works for research agents, writing assistants, and multi-agent systems. We'll explore this in upcoming parts!

## What's Next? 🛣️

In **Part 2: Research Agent**, we'll build on these foundations to create a multi-step agent that:
- Searches the web for information
- Analyzes and filters results
- Synthesizes findings into a coherent response

You'll see how the same Node pattern scales from simple API calls to sophisticated AI workflows.

## Troubleshooting 🔧

**"OpenAI API key missing"**
- Check your `.env` file is in the `01-foundations/` directory
- Verify the key starts with `sk-`

**"Cannot find module"**
- Run `npm install` from the project root
- Make sure you have `@types/node` installed

**TypeScript errors**
- Check your Node.js version (needs 16+)
- Verify TypeScript is installed globally or locally

## Files in This Part 📁

```
01-foundations/
├── README.md                  # This guide
├── chat-completion.ts         # Part 1A: Learn PocketFlow basics
├── terminal-chat.ts           # Part 1B: Interactive chatbot
└── .env                       # Your API key
```

## Run Commands Quick Reference 🏃‍♂️

```bash
# Part 1A: Learn the fundamentals
npx ts-node examples/building-ai-from-first-principles/01-foundations/chat-completion.ts

# Part 1B: Try interactive chat
npx ts-node examples/building-ai-from-first-principles/01-foundations/terminal-chat.ts
```

---

**Ready for more?** Head back to the [series overview](../README.md) or jump ahead to Part 2 when it's ready!

*Built with ❤️ using BackpackFlow and PocketFlow*

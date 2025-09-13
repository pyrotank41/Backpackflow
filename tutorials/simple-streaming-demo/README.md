# Simple Streaming Demo 🌊

A focused demo showing how to use PocketFlow's event streaming system for real-time LLM response streaming.

## Features

- **Real-time streaming**: Watch LLM responses appear character-by-character
- **Event monitoring**: See node lifecycle and flow events in real-time
- **Interactive chat**: Full conversation with memory and context
- **Performance metrics**: View timing and statistics
- **Custom nodes**: Example of extending the streaming system

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set your OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

3. **Try the demo without API key (recommended first):**
   ```bash
   npm run demo-no-api
   ```

4. **Run the modern chat demo using Backpackflow utilities (requires API key):**
   ```bash
   npm start
   ```

5. **Run the legacy demo (original implementation):**
   ```bash
   npm start --legacy
   ```

6. **Try the custom node demo:**
   ```bash
   npm run custom
   ```

## What You'll See

When you run the demo, you'll see:

```
🌊 PocketFlow Streaming Chat Demo
=================================

This demo shows real-time LLM response streaming with events.
Type your messages and watch the response stream in real-time!

Commands:
  /stats  - Show event statistics
  /help   - Show this help
  /quit   - Exit the demo

💬 You: Hello! Tell me about streaming.

💬 You: Hello! Tell me about streaming.
🔄 Requesting response from gpt-4o-mini...

🤖 Assistant is thinking...
┌─────────────────────────────────────────────┐
Streaming refers to the real-time transmission of data...
└─────────────────────────────────────────────┘
📊 [156 chars in 1247ms]
```

## Available Demos

### 1. No API Key Demo (`npm run demo-no-api`)
Perfect for seeing the event streaming system in action without any setup:
- Simulates LLM responses with real streaming
- Shows all event types being fired
- Displays comprehensive statistics
- No API key required!

### 2. Modern Chat Demo (`npm start`)
Uses the new Backpackflow terminal utilities from `src/utils/`:
- **Cleaner code**: Built with reusable components
- **Easy configuration**: Simple setup with sensible defaults
- **Custom commands**: Extensible command system
- **All features**: Same streaming, stats, and help functionality
- **`/demo`**: Show information about the new utilities
- **`/legacy`**: Switch to the legacy implementation

### 3. Legacy Chat Demo (`npm start --legacy`)
Original implementation showing the full code:
- **Regular chat**: Just type your message and press Enter
- **`/stats`**: View event statistics and conversation metrics
- **`/help`**: Show help information
- **`/quit`**: Exit the demo

### 4. Custom Node Demo (`npm run custom`)
Shows how to extend the streaming system with custom nodes.

## Code Structure

```typescript
// Create namespaced event stream
const eventStream = createNamespacedStream('streaming-chatbot');

// Set up real-time listeners
eventStream.onNamespaced('content:stream', (data) => {
    process.stdout.write(data.chunk); // Real-time output
});

// Create streaming chat node
const chatNode = createEventChatNodeWithOpenAI(apiKey, eventStream, {
    systemMessage: 'You are a helpful assistant.',
    enableStreaming: true
});

// Send message with streaming
await chatNode.sendMessage(storage, userInput);
```

## Events You'll See

The demo monitors these event types:

### Content Events
- `content:stream` - Each character/chunk as it streams
- `content:complete` - When streaming finishes

### Node Events  
- `node:start` - When node phases begin (prep/exec/post)
- `node:stop` - When node phases complete

### LLM Events
- `llm:request` - When request is sent to OpenAI
- `llm:response` - When response is received

### User Events
- `user:input` - When user sends a message

### Error Events
- `error:node` - If any errors occur

## Custom Node Example

The demo also includes a `CustomStreamingNode` that shows how to:

- Extend the event system with custom events
- Add processing delays and custom logic
- Emit custom events during the streaming process

Run it with:
```bash
npm run custom
```

## Key Concepts Demonstrated

1. **Namespace Isolation**: Events are isolated to `streaming-chatbot:*`
2. **Real-time Streaming**: See responses appear as they're generated
3. **Event Monitoring**: Full visibility into the process lifecycle
4. **Conversation Memory**: Context is preserved across messages
5. **Performance Metrics**: Timing and statistics collection
6. **Error Handling**: Graceful error handling with events

## Integration with Your Code

### Using the New Utilities (Recommended)

The easiest way to add streaming chat to your applications:

```typescript
import { createStreamingChatBotFromEnv } from '../../src/utils';

// Simple setup with environment variables
const chatBot = createStreamingChatBotFromEnv({
    systemMessage: 'You are my custom assistant',
    model: 'gpt-4o-mini'
});

// Add custom commands
chatBot.addCommand('/custom', 'My custom command', () => {
    console.log('Custom functionality!');
});

// Start the chat interface
await chatBot.start();
```

### Manual Setup (Legacy Approach)

For full control over the streaming system:

```typescript
import { 
    createNamespacedStream, 
    createEventChatNodeWithOpenAI 
} from 'path/to/src';

// 1. Create event stream
const stream = createNamespacedStream('your-namespace');

// 2. Set up listeners
stream.onNamespaced('content:stream', (data) => {
    // Handle real-time chunks
    console.log(data.chunk);
});

// 3. Create streaming node
const node = createEventChatNodeWithOpenAI(apiKey, stream, {
    enableStreaming: true
});

// 4. Use normally
await node.sendMessage(storage, 'Hello!');
```

This demo provides a complete, working example of how to integrate the event streaming system into real applications with minimal setup! 🚀

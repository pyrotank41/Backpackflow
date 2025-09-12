/**
 * Demo Without API Key
 * 
 * This demonstrates the event streaming system working without needing an OpenAI API key.
 * It simulates streaming responses to show all the events in action.
 */

import { 
    createNamespacedStream, 
    EventStream
} from '../../src/index';

interface DemoMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface DemoStorage {
    sessionId: string;
    messages: DemoMessage[];
}

class MockStreamingNode {
    private nodeId: string;
    private eventStream: EventStream;
    private systemMessage?: string;

    constructor(config: { nodeId: string; eventStream: EventStream; systemMessage?: string }) {
        this.nodeId = config.nodeId;
        this.eventStream = config.eventStream;
        this.systemMessage = config.systemMessage;

        // Emit node creation event
        this.eventStream.emit('node:created', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            config: { systemMessage: this.systemMessage },
            timestamp: Date.now()
        });
    }

    async sendMessage(storage: DemoStorage, message: string): Promise<string> {
        // Prep phase
        const prepStartTime = Date.now();
        this.eventStream.emit('node:start', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'prep',
            timestamp: prepStartTime
        });

        // Emit user input event
        this.eventStream.emit('user:input', {
            message,
            timestamp: Date.now()
        });

        // Add user message to storage
        storage.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // Emit storage write
        this.eventStream.emit('storage:write', {
            key: 'messages',
            value: { role: 'user', content: message },
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        this.eventStream.emit('node:stop', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'prep',
            duration: Date.now() - prepStartTime,
            timestamp: Date.now()
        });

        // Exec phase - simulate LLM request and streaming
        const execStartTime = Date.now();
        this.eventStream.emit('node:start', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'exec',
            timestamp: execStartTime
        });

        // Emit LLM request
        this.eventStream.emit('llm:request', {
            provider: 'mock',
            model: 'gpt-4o-mini',
            messages: storage.messages,
            config: {},
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        // Simulate streaming response
        const response = await this.simulateStreaming(message);

        // Emit LLM response
        this.eventStream.emit('llm:response', {
            provider: 'mock',
            model: 'gpt-4o-mini',
            response: { content: response },
            duration: Date.now() - execStartTime,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        this.eventStream.emit('node:stop', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'exec',
            duration: Date.now() - execStartTime,
            timestamp: Date.now()
        });

        // Post phase
        const postStartTime = Date.now();
        this.eventStream.emit('node:start', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'post',
            timestamp: postStartTime
        });

        // Add assistant message to storage
        storage.messages.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
        });

        // Emit storage write
        this.eventStream.emit('storage:write', {
            key: 'messages',
            value: { role: 'assistant', content: response },
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        this.eventStream.emit('node:stop', {
            nodeType: 'MockStreamingNode',
            nodeId: this.nodeId,
            phase: 'post',
            duration: Date.now() - postStartTime,
            timestamp: Date.now()
        });

        return response;
    }

    private async simulateStreaming(input: string): Promise<string> {
        // Generate a mock response based on input
        let response = '';
        if (input.toLowerCase().includes('streaming')) {
            response = 'Event streaming allows real-time monitoring of AI agent activities. It provides visibility into LLM responses, node lifecycle events, and flow transitions as they happen!';
        } else if (input.toLowerCase().includes('hello') || input.toLowerCase().includes('hi')) {
            response = 'Hello! I\'m a demo assistant showing off PocketFlow\'s event streaming system. You can see all the events being fired in real-time!';
        } else if (input.toLowerCase().includes('pocketflow')) {
            response = 'PocketFlow is a powerful framework for building AI agents with a clean separation of concerns using prep/exec/post phases. The event streaming system adds comprehensive monitoring!';
        } else {
            response = `Thanks for your message: "${input}". This is a simulated response to demonstrate the event streaming system working without requiring an API key!`;
        }

        const streamStartTime = Date.now();
        
        // Emit content start
        this.eventStream.emit('content:start', {
            nodeId: this.nodeId,
            timestamp: streamStartTime
        });

        let totalLength = 0;
        
        // Stream character by character
        for (let i = 0; i < response.length; i++) {
            const char = response[i];
            totalLength += char.length;
            
            // Emit streaming event
            this.eventStream.emit('content:stream', {
                chunk: char,
                totalLength,
                nodeId: this.nodeId,
                timestamp: Date.now()
            });
            
            // Small delay to simulate real streaming
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Emit content complete
        this.eventStream.emit('content:complete', {
            content: response,
            totalLength,
            duration: Date.now() - streamStartTime,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        return response;
    }
}

async function runDemo() {
    console.log('🎭 PocketFlow Event Streaming Demo (No API Key Required)');
    console.log('=======================================================\n');
    console.log('This demo shows the event streaming system in action without needing an OpenAI API key.');
    console.log('Watch as events are fired in real-time during simulated conversations!\n');

    // Create event stream
    const demoStream = createNamespacedStream('demo-assistant', {
        enableDebugLogs: false,
        enableMetrics: true
    });

    // Set up event listeners with visual feedback
    demoStream.onNamespaced('user:input', (data) => {
        console.log(`\n👤 User: ${data.message}`);
    });

    demoStream.onNamespaced('node:start', (data) => {
        const icon = data.phase === 'prep' ? '🔄' : data.phase === 'exec' ? '🧠' : '💾';
        console.log(`${icon} ${data.nodeType}.${data.phase} started`);
    });

    demoStream.onNamespaced('node:stop', (data) => {
        console.log(`✅ ${data.nodeType}.${data.phase} completed (${data.duration}ms)`);
    });

    demoStream.onNamespaced('llm:request', (data) => {
        console.log(`🔄 Requesting response from ${data.model}...`);
    });

    demoStream.onNamespaced('content:start', () => {
        console.log('\n🤖 Assistant: ');
        console.log('┌─────────────────────────────────────────────┐');
    });

    demoStream.onNamespaced('content:stream', (data) => {
        process.stdout.write(data.chunk);
    });

    demoStream.onNamespaced('content:complete', (data) => {
        console.log('\n└─────────────────────────────────────────────┘');
        console.log(`📊 [${data.totalLength} characters streamed in ${data.duration}ms]`);
    });

    demoStream.onNamespaced('storage:write', (data) => {
        console.log(`💾 Storage: Saved ${data.key} entry`);
    });

    demoStream.onNamespaced('llm:response', (data) => {
        console.log(`✅ LLM response received (${data.duration}ms)`);
    });

    // Create mock streaming node
    const assistant = new MockStreamingNode({
        nodeId: 'demo-assistant',
        eventStream: demoStream,
        systemMessage: 'You are a helpful demo assistant.'
    });

    // Create storage
    const storage: DemoStorage = {
        sessionId: `demo-${Date.now()}`,
        messages: []
    };

    // Run demo conversations
    const conversations = [
        'Hello! What is event streaming?',
        'How does PocketFlow work?',
        'Show me streaming in action!'
    ];

    for (const message of conversations) {
        await assistant.sendMessage(storage, message);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between messages
    }

    // Show final statistics
    console.log('\n\n📊 Demo Statistics');
    console.log('═'.repeat(40));
    const stats = demoStream.getStats();
    console.log(`Session ID: ${storage.sessionId}`);
    console.log(`Messages exchanged: ${storage.messages.length}`);
    console.log(`Active listeners: ${stats.listenerCount}`);
    console.log(`Event stream namespace: ${stats.namespace}`);
    
    if (stats.metrics) {
        console.log(`Total events fired: ${stats.metrics.totalEvents}`);
        console.log('\nEvent breakdown:');
        for (const [event, count] of stats.metrics.eventsByType.entries()) {
            console.log(`  ${event}: ${count}`);
        }
    }

    console.log('\n🎉 Demo completed! You can see how events flow through the system.');
    console.log('\n💡 Key observations:');
    console.log('   • Each message triggers multiple event types');
    console.log('   • Real-time streaming shows character-by-character output');
    console.log('   • Node lifecycle is fully visible (prep → exec → post)');
    console.log('   • Storage operations are tracked');
    console.log('   • Performance metrics are collected automatically');
    console.log('\n🚀 Ready to try with a real LLM? Set OPENAI_API_KEY and run: npm start');
}

if (require.main === module) {
    runDemo().catch(console.error);
}

export { MockStreamingNode, runDemo };

/**
 * Simple Streaming Demo with PocketFlow Event System
 * 
 * This example shows how to create a basic streaming chatbot using
 * the event streaming system built into the framework.
 * 
 * Features demonstrated:
 * - Real-time LLM response streaming
 * - Event monitoring and visualization
 * - Simple interactive chat loop
 */

import { 
    createNamespacedStream, 
    createEventChatNodeWithOpenAI,
    ChatNodeStorage,
    StreamingChatBot as ModernStreamingChatBot,
    createStreamingChatBotFromEnv,
    TerminalCommand
} from '../../src/index';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SimpleStorage extends ChatNodeStorage {
    sessionId: string;
    messageCount: number;
}

class LegacyStreamingChatBot {
    private rl: readline.Interface;
    private chatNode: any;
    private storage: SimpleStorage;
    private eventStream: any;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Create namespaced event stream
        this.eventStream = createNamespacedStream('streaming-chatbot', {
            enableDebugLogs: false,
            enableMetrics: true
        });

        // Set up real-time event listeners
        this.setupEventListeners();

        // Create streaming chat node
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('❌ Please set OPENAI_API_KEY environment variable');
            process.exit(1);
        }

        this.chatNode = createEventChatNodeWithOpenAI(apiKey, this.eventStream, {
            systemMessage: 'You are a helpful assistant. Keep responses concise and friendly.',
            nodeId: 'streaming-chat-bot',
            enableStreaming: true,
            model: 'gpt-4o-mini', // Use faster model for demo
            temperature: 0.7
        });

        // Initialize storage
        this.storage = {
            sessionId: `session-${Date.now()}`,
            messageCount: 0
        };
    }

    private setupEventListeners() {
        // Real-time content streaming
        this.eventStream.onNamespaced('content:stream', (data: any) => {
            process.stdout.write(data.chunk);
        });

        // Content completion notification
        this.eventStream.onNamespaced('content:complete', (data: any) => {
            console.log(`\n\x1b[90m📊 [${data.totalLength} chars in ${data.duration}ms]\x1b[0m`);
        });

        // Node lifecycle events
        this.eventStream.onNamespaced('node:start', (data: any) => {
            if (data.phase === 'exec') {
                console.log(`\n\x1b[90m🤖 [${data.nodeId}]: Assistant is thinking...\x1b[0m`);
                console.log(`\x1b[90m┌─ [${data.nodeId}] ─────────────────────────┐\x1b[0m`);
            }
        });

        this.eventStream.onNamespaced('node:stop', (data: any) => {
            if (data.phase === 'exec') {
                console.log(`\n\x1b[90m✅ [${data.nodeId}]: Processing complete\x1b[0m`);
                console.log(`\x1b[90m└─ [${data.nodeId}] ─────────────────────────┘\x1b[0m`);
            }
        });

        // User input tracking - Removed: Users don't need to see their own input echoed back

        // LLM provider events
        this.eventStream.onNamespaced('llm:request', (data: any) => {
            console.log(`\x1b[90m🔄 Requesting response from ${data.model}...\x1b[0m`);
        });

        // Error handling
        this.eventStream.onNamespaced('error:node', (data: any) => {
            console.log(`\n❌ [${data.nodeId}]: Error: ${data.error}`);
        });
    }

    async start() {
        console.log('🌊 PocketFlow Streaming Chat Demo');
        console.log('=================================\n');
        console.log('This demo shows real-time LLM response streaming with events.');
        console.log('Type your messages and watch the response stream in real-time!\n');
        console.log('Commands:');
        console.log('  /stats   - Show event statistics');
        console.log('  /storage - Show storage contents');
        console.log('  /help    - Show this help');
        console.log('  /quit    - Exit the demo\n');

        await this.chatLoop();
    }

    private async chatLoop() {
        while (true) {
            const userInput = await this.getUserInput('\n💬 You: ');
            
            // Handle special commands
            if (userInput.toLowerCase() === '/quit') {
                console.log('\n👋 Goodbye!');
                break;
            }

            if (userInput.toLowerCase() === '/stats') {
                this.showStats();
                continue;
            }

            if (userInput.toLowerCase() === '/storage') {
                this.showStorage();
                continue;
            }

            if (userInput.toLowerCase() === '/help') {
                this.showHelp();
                continue;
            }

            if (userInput.trim() === '') {
                continue;
            }

            // Process the message with streaming
            try {
                this.storage.messageCount++;
                await this.chatNode.sendMessage(this.storage, userInput);
            } catch (error) {
                console.log(`\n❌ Error: ${(error as Error).message}`);
            }
        }

        this.cleanup();
    }

    private async getUserInput(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    private showStats() {
        console.log('\n📊 Event Stream Statistics');
        console.log('═'.repeat(40));
        
        const stats = this.eventStream.getStats();
        console.log(`Session ID: ${this.storage.sessionId}`);
        console.log(`Messages sent: ${this.storage.messageCount}`);
        console.log(`Active listeners: ${stats.listenerCount}`);
        console.log(`Event stream namespace: ${stats.namespace}`);
        
        if (stats.metrics) {
            console.log(`Total events fired: ${stats.metrics.totalEvents}`);
            console.log('\nEvent breakdown:');
            for (const [event, count] of stats.metrics.eventsByType.entries()) {
                console.log(`  ${event}: ${count}`);
            }
        }

        // Show conversation history length
        const conversation = this.chatNode.getConversation(this.storage);
        console.log(`\nConversation history: ${conversation.length} messages`);
    }

    private showStorage() {
        console.log('\n💾 Storage Contents');
        console.log('═'.repeat(40));
        
        // Show the full storage object
        console.log('Storage structure:');
        console.log(JSON.stringify(this.storage, null, 2));
        
        // Show conversation details if available
        if (this.storage.chat && this.storage.chat.messages) {
            console.log('\n📝 Conversation Messages:');
            this.storage.chat.messages.forEach((msg, index) => {
                const role = msg.role.toUpperCase().padEnd(9);
                const preview = msg.content.length > 50 
                    ? msg.content.substring(0, 50) + '...' 
                    : msg.content;
                console.log(`  ${index + 1}. [${role}] ${preview}`);
            });
        } else {
            console.log('\n📝 No conversation history yet');
        }
        
        console.log(`\n📊 Storage Summary:`);
        console.log(`  Session ID: ${this.storage.sessionId}`);
        console.log(`  User Messages Sent: ${this.storage.messageCount}`);
        console.log(`  Chat Initialized: ${this.storage.chat ? 'Yes' : 'No'}`);
        if (this.storage.chat) {
            console.log(`  Total Conversation Messages: ${this.storage.chat.messages?.length || 0}`);
        }
    }

    private showHelp() {
        console.log('\n📖 Help');
        console.log('─'.repeat(20));
        console.log('This is a streaming chat demo using PocketFlow\'s event system.');
        console.log('\nFeatures:');
        console.log('• Real-time response streaming (watch characters appear)');
        console.log('• Event monitoring (see lifecycle events)');
        console.log('• Performance metrics (timing and statistics)');
        console.log('• Conversation memory (context preserved)');
        console.log('\nTry asking questions and watch the real-time streaming!');
    }

    private cleanup() {
        this.rl.close();
        console.log('\n🧹 Cleaning up event listeners...');
        this.eventStream.removeAllListeners();
    }
}

// Enhanced example with custom streaming node
class CustomStreamingNode {
    private node: any;

    constructor(apiKey: string, eventStream: any, config: any) {
        this.node = createEventChatNodeWithOpenAI(apiKey, eventStream, {
            ...config,
            nodeId: 'custom-streaming-node'
        });
    }

    // Custom method that adds behavior before calling the underlying node
    async sendMessage(storage: any, message: string): Promise<string> {
        // Emit custom event before processing
        this.node.getEventStream()?.emit('node:start', {
            nodeType: 'CustomStreamingNode',
            nodeId: this.node.getNodeId(),
            phase: 'custom',
            timestamp: Date.now()
        });

        // Add artificial delay to demonstrate event timing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call the underlying node's sendMessage method
        const result = await this.node.sendMessage(storage, message);

        // Emit custom completion event
        this.node.getEventStream()?.emit('node:stop', {
            nodeType: 'CustomStreamingNode',
            nodeId: this.node.getNodeId(),
            phase: 'custom',
            result: 'custom_processing_complete',
            duration: 500,
            timestamp: Date.now()
        });

        return result;
    }

    // Delegate other methods to the underlying node
    getConversation(storage: any) {
        return this.node.getConversation(storage);
    }

    clearConversation(storage: any) {
        return this.node.clearConversation(storage);
    }
}

// Demo function for custom node
async function customNodeDemo() {
    console.log('\n🔧 Custom Streaming Node Demo');
    console.log('============================\n');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('⚠️  No OpenAI API key found, skipping custom node demo');
        return;
    }

    const customStream = createNamespacedStream('custom-demo');
    
    // Listen to custom events
    customStream.onNamespaced('node:start', (data: any) => {
        console.log(`🔧 Custom node started: ${data.nodeType}`);
    });

    customStream.onNamespaced('node:stop', (data: any) => {
        console.log(`✅ Custom node completed: ${data.result}`);
    });

    const customNode = new CustomStreamingNode(apiKey, customStream, {
        systemMessage: 'You are a custom streaming assistant.',
        nodeId: 'custom-node-demo'
    });

    const storage: SimpleStorage = {
        sessionId: 'custom-demo',
        messageCount: 0
    };

    console.log('Sending message to custom node...');
    await customNode.sendMessage(storage, 'Hello from the custom streaming node!');
    
    console.log('\n✅ Custom node demo complete!');
}

// New simplified demo using Backpackflow utilities
async function modernChatDemo() {
    console.log('🚀 Modern Streaming Chat Demo (using Backpackflow utilities)');
    console.log('============================================================\n');

    try {
        // Create chatbot using the new utilities
        const chatBot = createStreamingChatBotFromEnv({
            namespace: 'modern-streaming-demo',
            systemMessage: 'You are a helpful assistant demonstrating Backpackflow utilities. Keep responses concise and friendly.',
            model: 'gpt-4o-mini',
            terminalOptions: {
                title: '🚀 Modern Backpackflow Chat',
                description: 'This demo uses the new terminal utilities from src/utils/',
                commands: [
                    {
                        command: '/demo',
                        description: 'Show demo information',
                        handler: () => {
                            console.log('\n🎯 Demo Features:');
                            console.log('• Uses Backpackflow terminal utilities from src/utils/');
                            console.log('• Cleaner, more maintainable code');
                            console.log('• Reusable components for other projects');
                            console.log('• Simplified configuration and setup');
                        }
                    }
                ]
            }
        });

        // Add custom commands dynamically
        chatBot.addCommand('/legacy', 'Run the legacy demo', async () => {
            console.log('\n🔄 Switching to legacy demo...');
            chatBot.cleanup();
            const legacyBot = new LegacyStreamingChatBot();
            await legacyBot.start();
        });

        // Start the modern chat interface
        await chatBot.start();

    } catch (error) {
        console.error('❌ Error starting modern demo:', (error as Error).message);
        console.log('\n💡 Falling back to legacy demo...');
        const legacyBot = new LegacyStreamingChatBot();
        await legacyBot.start();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help')) {
        console.log('Simple Streaming Demo Usage:');
        console.log('  npm start                - Modern chat demo (using utils)');
        console.log('  npm start --legacy       - Legacy chat demo');
        console.log('  npm start --custom       - Custom node demo');
        console.log('  npm start --help         - Show this help');
        return;
    }

    if (args.includes('--custom')) {
        await customNodeDemo();
        return;
    }

    if (args.includes('--legacy')) {
        console.log('🕰️  Running legacy demo...\n');
        const chatBot = new LegacyStreamingChatBot();
        await chatBot.start();
        return;
    }

    // Default: modern chat demo using utilities
    await modernChatDemo();
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { LegacyStreamingChatBot, CustomStreamingNode };

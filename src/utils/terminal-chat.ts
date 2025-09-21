/**
 * Terminal Chat Interface for Backpackflow
 * 
 * Provides a reusable terminal-based chat interface with streaming support,
 * event visualization, and interactive commands.
 */

import * as readline from 'readline';
import { ChatNodeStorage } from '../nodes/llm/chat-node';

export interface TerminalChatOptions {
    title?: string;
    description?: string;
    commands?: TerminalCommand[];
    enableStats?: boolean;
    enableStorage?: boolean;
    enableHelp?: boolean;
    prompt?: string;
    exitCommand?: string;
}

export interface TerminalCommand {
    command: string;
    description: string;
    handler: () => void | Promise<void>;
}

export interface TerminalChatStorage extends ChatNodeStorage {
    sessionId: string;
    messageCount: number;
}

export class TerminalChatInterface {
    private rl: readline.Interface;
    private chatNode: any;
    private storage: TerminalChatStorage;
    private eventStream: any;
    private options: Required<TerminalChatOptions>;
    private customCommands: Map<string, TerminalCommand>;

    constructor(
        chatNode: any, 
        eventStream: any, 
        storage: TerminalChatStorage,
        options: TerminalChatOptions = {}
    ) {
        this.chatNode = chatNode;
        this.eventStream = eventStream;
        this.storage = storage;
        this.customCommands = new Map();

        // Set default options
        this.options = {
            title: options.title || '🌊 Backpackflow Terminal Chat',
            description: options.description || 'Interactive chat interface with real-time streaming',
            commands: options.commands || [],
            enableStats: options.enableStats ?? true,
            enableStorage: options.enableStorage ?? true,
            enableHelp: options.enableHelp ?? true,
            prompt: options.prompt || '💬 You: ',
            exitCommand: options.exitCommand || '/quit'
        };

        // Set up readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Register custom commands
        if (this.options.commands) {
            this.options.commands.forEach(cmd => {
                this.customCommands.set(cmd.command.toLowerCase(), cmd);
            });
        }

        // Set up event listeners
        this.setupEventListeners();
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

        // LLM provider events
        this.eventStream.onNamespaced('llm:request', (data: any) => {
            console.log(`\x1b[90m🔄 Requesting response from ${data.model}...\x1b[0m`);
        });

        // Error handling
        this.eventStream.onNamespaced('error:node', (data: any) => {
            console.log(`\n❌ [${data.nodeId}]: Error: ${data.error}`);
        });
    }

    public async start() {
        this.showWelcome();
        await this.chatLoop();
    }

    private showWelcome() {
        console.log(this.options.title);
        console.log('='.repeat(this.options.title.length));
        console.log(`\n${this.options.description}`);
        console.log('Type your messages and watch the response stream in real-time!\n');
        
        this.showCommands();
    }

    private showCommands() {
        console.log('Commands:');
        
        // Built-in commands
        if (this.options.enableStats) {
            console.log('  /stats   - Show event statistics');
        }
        if (this.options.enableStorage) {
            console.log('  /storage - Show storage contents');
        }
        if (this.options.enableHelp) {
            console.log('  /help    - Show this help');
        }
        console.log(`  ${this.options.exitCommand}    - Exit the chat`);

        // Custom commands
        this.customCommands.forEach((cmd) => {
            console.log(`  ${cmd.command.padEnd(8)} - ${cmd.description}`);
        });

        console.log('');
    }

    private async chatLoop() {
        while (true) {
            const userInput = await this.getUserInput(`\n${this.options.prompt}`);
            
            // Handle exit command
            if (userInput.toLowerCase() === this.options.exitCommand) {
                console.log('\n👋 Goodbye!');
                break;
            }

            // Handle built-in commands
            if (await this.handleBuiltInCommands(userInput)) {
                continue;
            }

            // Handle custom commands
            if (await this.handleCustomCommands(userInput)) {
                continue;
            }

            // Skip empty messages
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

    private async handleBuiltInCommands(input: string): Promise<boolean> {
        const command = input.toLowerCase();

        if (command === '/stats' && this.options.enableStats) {
            this.showStats();
            return true;
        }

        if (command === '/storage' && this.options.enableStorage) {
            this.showStorage();
            return true;
        }

        if (command === '/help' && this.options.enableHelp) {
            this.showHelp();
            return true;
        }

        return false;
    }

    private async handleCustomCommands(input: string): Promise<boolean> {
        const command = input.toLowerCase();
        const customCommand = this.customCommands.get(command);
        
        if (customCommand) {
            await customCommand.handler();
            return true;
        }

        return false;
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
            this.storage.chat.messages.forEach((msg: any, index: number) => {
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
        console.log('This is a streaming chat interface using Backpackflow\'s event system.');
        console.log('\nFeatures:');
        console.log('• Real-time response streaming (watch characters appear)');
        console.log('• Event monitoring (see lifecycle events)');
        console.log('• Performance metrics (timing and statistics)');
        console.log('• Conversation memory (context preserved)');
        console.log('\nTry asking questions and watch the real-time streaming!');
        
        this.showCommands();
    }

    public cleanup() {
        this.rl.close();
        console.log('\n🧹 Cleaning up event listeners...');
        this.eventStream.removeAllListeners();
    }

    // Utility methods for external access
    public getStorage(): TerminalChatStorage {
        return this.storage;
    }

    public getChatNode() {
        return this.chatNode;
    }

    public getEventStream() {
        return this.eventStream;
    }

    public addCommand(command: TerminalCommand) {
        this.customCommands.set(command.command.toLowerCase(), command);
    }

    public removeCommand(command: string) {
        this.customCommands.delete(command.toLowerCase());
    }
}

/**
 * Conversational Sales Agent - Main Entry Point
 */

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { OpenAIProvider } from '../../../src/providers/openai-provider';
import { ConversationalSalesAgent } from './conversational-agent';
import { ConfigLoader } from './config';
import { getAvailableTools } from './tools';
import { ConversationalSalesStorage } from './types';

// Load environment variables
dotenv.config();

class SalesAgentDemo {
    private agent: ConversationalSalesAgent;
    private rl: readline.Interface;
    
    constructor() {
        // Load configuration
        const config = ConfigLoader.loadDefaultConfig();
        
        // Set up LLM provider
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('❌ Please set OPENAI_API_KEY environment variable');
            process.exit(1);
        }
        
        const llmProvider = new OpenAIProvider({
            apiKey,
            model: config.agent.model,
            temperature: config.agent.temperature
        });
        
        // Get available tools
        const tools = getAvailableTools();
        
        // Create agent
        this.agent = new ConversationalSalesAgent(config, tools, llmProvider);
        
        // Set up readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async start(): Promise<void> {
        console.log('🤖 Conversational Sales Agent Demo');
        console.log('==================================\n');
        console.log('This demo shows a sales agent with:');
        console.log('• Conversation memory and context awareness');
        console.log('• Strategic tool usage (product lookup)');
        console.log('• Cohesive responses that build on conversation history');
        console.log('• Tool history integration to avoid redundant lookups\n');
        console.log('Commands:');
        console.log('  /help     - Show this help');
        console.log('  /history  - Show conversation history');
        console.log('  /tools    - Show tool usage history');
        console.log('  /reset    - Reset conversation');
        console.log('  /quit     - Exit the demo\n');
        
        // Initialize storage
        const storage: ConversationalSalesStorage = {
            conversationId: `conv-${Date.now()}`,
            messages: [],
            currentMessage: '',
            currentResponse: '',
            toolsUsed: [],
            toolHistory: []
        };
        
        await this.chatLoop(storage);
    }
    
    private async chatLoop(storage: ConversationalSalesStorage): Promise<void> {
        while (true) {
            const userInput = await this.getUserInput('\n💬 You: ');
            
            // Handle commands
            if (userInput.toLowerCase() === '/quit') {
                console.log('\n👋 Goodbye!');
                break;
            }
            
            if (userInput.toLowerCase() === '/help') {
                this.showHelp();
                continue;
            }
            
            if (userInput.toLowerCase() === '/history') {
                this.showHistory(storage);
                continue;
            }
            
            if (userInput.toLowerCase() === '/tools') {
                this.showToolHistory(storage);
                continue;
            }
            
            if (userInput.toLowerCase() === '/reset') {
                storage.messages = [];
                storage.toolsUsed = [];
                storage.toolHistory = [];
                console.log('\n🔄 Conversation reset!');
                continue;
            }
            
            if (userInput.trim() === '') {
                continue;
            }
            
            // Process the message
            try {
                storage.currentMessage = userInput;
                
                console.log('\n🤖 Assistant is thinking...');
                const startTime = Date.now();
                
                await this.agent.run(storage);
                
                const duration = Date.now() - startTime;
                console.log(`\n🤖 ${storage.currentResponse}`);
                console.log(`\n⏱️  [Response generated in ${duration}ms]`);
                
            } catch (error) {
                console.error(`\n❌ Error: ${(error as Error).message}`);
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
    
    private showHelp(): void {
        console.log('\n📖 Conversational Sales Agent Help');
        console.log('═'.repeat(40));
        console.log('This agent demonstrates:');
        console.log('• Cohesive conversation flow with memory');
        console.log('• Strategic tool usage based on context');
        console.log('• Building upon previous interactions');
        console.log('• Avoiding redundant information gathering');
        console.log('\nTry asking about:');
        console.log('• "I need circuit breakers for my workshop"');
        console.log('• "What about 20A ones?" (references previous context)');
        console.log('• "Do you have bulk pricing?" (builds on conversation)');
    }
    
    private showHistory(storage: ConversationalSalesStorage): void {
        console.log('\n📜 Conversation History');
        console.log('═'.repeat(40));
        
        if (storage.messages.length <= 1) { // Only system message
            console.log('No conversation history yet.');
            return;
        }
        
        storage.messages
            .filter(msg => msg.role !== 'system')
            .forEach((msg, index) => {
                const icon = msg.role === 'user' ? '💬' : '🤖';
                console.log(`${index + 1}. ${icon} ${msg.role.toUpperCase()}: ${msg.content}`);
            });
    }
    
    private showToolHistory(storage: ConversationalSalesStorage): void {
        console.log('\n🛠️  Tool Usage History');
        console.log('═'.repeat(40));
        
        if (storage.toolHistory.length === 0) {
            console.log('No tools have been used yet.');
            return;
        }
        
        storage.toolHistory.forEach((entry, index) => {
            console.log(`${index + 1}. Tool: ${entry.toolName}`);
            console.log(`   Parameters: ${JSON.stringify(entry.parameters)}`);
            console.log(`   Message: ${entry.messageIndex}`);
            console.log(`   Timestamp: ${entry.timestamp.toLocaleString()}`);
            console.log(`   Result Summary: ${this.summarizeResult(entry.result)}`);
            console.log('   ---');
        });
    }
    
    private summarizeResult(result: any): string {
        if (result?.products) {
            return `Found ${result.products.length} products`;
        } else if (result?.success === false) {
            return `Error: ${result.message}`;
        } else {
            return JSON.stringify(result).substring(0, 100) + '...';
        }
    }
    
    private cleanup(): void {
        this.rl.close();
        console.log('\n🧹 Demo ended. Thank you for trying the Conversational Sales Agent!');
    }
}

// Main execution
async function main(): Promise<void> {
    try {
        const demo = new SalesAgentDemo();
        await demo.start();
    } catch (error) {
        console.error('Failed to start demo:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { ConversationalSalesAgent, ConfigLoader, getAvailableTools };
export * from './types';

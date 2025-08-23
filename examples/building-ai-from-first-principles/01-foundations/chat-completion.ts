import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '.env') });

import { Node, Flow } from '../../../src/pocketflow';
import OpenAI from 'openai';

/**
 * Chat Completion - Learning PocketFlow Fundamentals
 * 
 * This example shows how to wrap a basic OpenAI API call in PocketFlow's
 * Node pattern. You'll learn the three-phase lifecycle:
 * • prep() - prepare your data
 * • exec() - do the main work  
 * • post() - handle the results
 * 
 * Run: npx ts-node chat-completion.ts
 */

// Define the structure of our messages and conversation storage
type Message = {
    role: 'user' | 'assistant';
    content: string;
}

type SharedStorage = {
    messages: Message[];
}

// Helper function to call OpenAI API
async function callLLM(messages: Message[]): Promise<string> {
    const client = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
    });

    const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
    });
    return completion.choices[0].message.content ?? '';
}

// PocketFlow Node that handles the chat completion
class ChatNode extends Node<SharedStorage> {
    constructor(private userMessage: string) {
        super();
    }

    async prep(shared: SharedStorage): Promise<Message[]> {
        // Add user message to conversation
        shared.messages.push({ role: 'user', content: this.userMessage });
        return shared.messages;
    }
    
    async exec(messages: Message[]): Promise<string> {
        const response = await callLLM(messages);
        return response;
    }
    
    async post(shared: SharedStorage, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
        // Add AI response to shared storage
        shared.messages.push({ 
            role: 'assistant', 
            content: execRes as string 
        });
        return undefined; // End the flow
    }
}

// PocketFlow Flow that orchestrates the ChatNode
class ChatFlow extends Flow<SharedStorage> {
    constructor(userMessage: string) {
        const chatNode = new ChatNode(userMessage);
        super(chatNode);
    }
}

// Convenience function to send a message and get a response
async function sendMessage(shared: SharedStorage, message: string): Promise<string> {
    const flow = new ChatFlow(message);
    await flow.run(shared);
    
    // Return the last assistant message
    const lastMessage = shared.messages[shared.messages.length - 1];
    return lastMessage.role === 'assistant' ? lastMessage.content : '';
}

// Example usage
async function main() {
    console.log('🎓 Chat Completion - PocketFlow Basics\n');
    
    const shared: SharedStorage = { messages: [] };
    
    console.log('Sending message...');
    const response = await sendMessage(shared, "Explain what PocketFlow's prep-exec-post pattern does in one sentence.");
    
    console.log('\nConversation:');
    shared.messages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.role}: ${msg.content}`);
    });
    
    console.log('\n✅ Tutorial complete!');
    console.log('\n💡 This example shows PocketFlow fundamentals:');
    console.log('   • prep() - prepare data');
    console.log('   • exec() - do the work');  
    console.log('   • post() - handle results');
    console.log('\n🚀 Ready for interactive chat? Try terminal-chat.ts next!');
}

main().catch(console.error);

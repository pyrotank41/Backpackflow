#!/usr/bin/env npx tsx

/**
 * Research Agent Demo
 * 
 * A complete demonstration of the research agent pattern from the PocketFlow tutorial.
 * This shows how "LLM Agents are simply Graph" - just loops with branches!
 * 
 * Run with: npx tsx research-agent-demo.ts
 */

import { OpenAIProvider } from 'backpackflow/providers';
import { ResearchFlow, ResearchStorage } from './components';

/**
 * Demo function that shows the research agent in action
 */
async function demonstrateResearchAgent() {
    console.log('🚀 Research Agent Demo - Based on PocketFlow Tutorial');
    console.log('=' .repeat(60));
    
    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('❌ Please set your OPENAI_API_KEY environment variable');
        console.log('   export OPENAI_API_KEY="your-api-key-here"');
        return;
    }

    // Create our LLM provider
    const llmProvider = new OpenAIProvider({
        apiKey,
        model: 'gpt-4o-mini', // Using the faster, cheaper model for demo
        temperature: 0.7
    });

    // Test questions that demonstrate different agent behaviors
    const testQuestions = [
        "What is the capital of France?",
        "Who won the 2023 Super Bowl?",
        "What is Python programming language?",
        "What's the weather like today?" // This will show how the agent handles incomplete info
    ];

    for (const question of testQuestions) {
        console.log(`\n📝 Question: "${question}"`);
        console.log('-'.repeat(50));
        
        try {
            // Create shared storage with the question
            const shared: ResearchStorage = { question };
            
            // Create and run the research flow
            const flow = ResearchFlow.create(question, {
                llmProvider,
                searchConfig: { simulateSearch: true } // Using simulated search for demo
            });
            
            await flow.run(shared);
            
            // Show the results
            const details = ResearchFlow.getResearchDetails(shared);
            
            console.log(`\n📊 Research Summary:`);
            console.log(`   Searches performed: ${details.searchesPerformed}`);
            console.log(`   Answer generated: ${details.hasAnswer ? '✅' : '❌'}`);
            
            if (details.answer) {
                console.log(`\n💬 Final Answer:`);
                console.log(`   ${details.answer}`);
            }
            
            if (details.context && details.searchesPerformed > 0) {
                console.log(`\n🔍 Research Context:`);
                console.log(`   ${details.context.substring(0, 200)}...`);
            }
            
        } catch (error) {
            console.error(`❌ Error processing question: ${error}`);
        }
        
        console.log('\n' + '='.repeat(60));
    }
}

/**
 * Interactive demo that lets you ask your own questions
 */
async function interactiveDemo() {
    const readline = require('readline');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🤖 Interactive Research Agent');
    console.log('Ask me anything! (type "quit" to exit)');
    console.log('-'.repeat(40));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('❌ Please set your OPENAI_API_KEY environment variable');
        rl.close();
        return;
    }

    const llmProvider = new OpenAIProvider({
        apiKey,
        model: 'gpt-4o-mini',
        temperature: 0.7
    });

    const askQuestion = () => {
        rl.question('\n❓ Your question: ', async (question: string) => {
            if (question.toLowerCase() === 'quit') {
                console.log('👋 Goodbye!');
                rl.close();
                return;
            }

            if (!question.trim()) {
                askQuestion();
                return;
            }

            try {
                console.log('\n🤔 Thinking...');
                
                const answer = await ResearchFlow.research(question, {
                    llmProvider,
                    searchConfig: { simulateSearch: true }
                });

                if (answer) {
                    console.log(`\n💬 Answer: ${answer}`);
                } else {
                    console.log('\n❌ Sorry, I couldn\'t generate an answer.');
                }
                
            } catch (error) {
                console.error(`❌ Error: ${error}`);
            }

            askQuestion();
        });
    };

    askQuestion();
}

/**
 * Main function - run the demo
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
        await interactiveDemo();
    } else {
        await demonstrateResearchAgent();
        
        console.log('\n🎯 Want to try your own questions?');
        console.log('   Run: npx tsx research-agent-demo.ts --interactive');
    }
}

// Run the demo
if (require.main === module) {
    main().catch(console.error);
}

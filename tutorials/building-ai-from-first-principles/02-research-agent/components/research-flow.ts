import { Flow } from 'backpackflow/pocketflow';
import { LLMProvider } from 'backpackflow/providers';
import { DecideActionNode, ResearchStorage } from './decide-action-node';
import { SearchWebNode, SearchWebConfig } from './search-web-node';
import { AnswerQuestionNode } from './answer-question-node';

/**
 * ResearchFlow - The Complete Research Agent 🚀
 * 
 * This orchestrates our entire research agent workflow:
 * 1. Start with DecideAction (the brain)
 * 2. Branch to SearchWeb when we need information
 * 3. Branch to AnswerQuestion when we're ready to respond
 * 4. Loop back to DecideAction after each search
 * 
 * Based on the PocketFlow tutorial: "LLM Agents are simply Graph"
 * This demonstrates the complete loop-and-branch pattern that makes agents work.
 */

export interface ResearchFlowConfig {
    llmProvider: LLMProvider;
    searchConfig?: SearchWebConfig;
}

export class ResearchFlow extends Flow<ResearchStorage> {
    private decideNode: DecideActionNode;
    private searchNode: SearchWebNode;
    private answerNode: AnswerQuestionNode;

    constructor(question: string, config: ResearchFlowConfig) {
        // Create all our nodes
        const decideNode = new DecideActionNode({ 
            llmProvider: config.llmProvider 
        });
        
        const searchNode = new SearchWebNode(config.searchConfig);
        
        const answerNode = new AnswerQuestionNode({ 
            llmProvider: config.llmProvider 
        });

        // Connect the nodes together - this is where the magic happens!
        
        // If DecideAction returns "search", go to SearchWeb
        decideNode.on("search", searchNode);
        
        // If DecideAction returns "answer", go to AnswerQuestion  
        decideNode.on("answer", answerNode);
        
        // After SearchWeb completes, go back to DecideAction
        searchNode.on("decide", decideNode);
        
        // AnswerQuestion doesn't connect to anything - it ends the flow

        // Start the flow with the DecideAction node
        super(decideNode);

        // Store references for potential debugging/monitoring
        this.decideNode = decideNode;
        this.searchNode = searchNode;
        this.answerNode = answerNode;
    }

    /**
     * PREP: Initialize the shared storage with the question
     */
    async prep(shared: ResearchStorage): Promise<void> {
        // The question should already be set, but we can add any additional setup here
        console.log(`🚀 Starting research flow for question: "${shared.question}"`);
    }

    /**
     * POST: Final cleanup and logging
     */
    async post(shared: ResearchStorage, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
        if (shared.answer) {
            console.log('🎉 Research flow completed successfully!');
        } else {
            console.log('⚠️ Research flow ended without generating an answer');
        }
        
        return undefined;
    }

    /**
     * Static factory method for easy instantiation
     */
    static create(question: string, config: ResearchFlowConfig): ResearchFlow {
        return new ResearchFlow(question, config);
    }

    /**
     * Convenience method to run the research flow with a question
     */
    static async research(question: string, config: ResearchFlowConfig): Promise<string | null> {
        const shared: ResearchStorage = { question };
        const flow = new ResearchFlow(question, config);
        
        await flow.run(shared);
        
        return shared.answer || null;
    }

    /**
     * Get detailed information about the research process
     */
    static getResearchDetails(shared: ResearchStorage): {
        question: string;
        searchesPerformed: number;
        hasAnswer: boolean;
        context?: string;
        answer?: string;
    } {
        // Count how many searches were performed by counting "SEARCH QUERY:" occurrences
        const searchCount = (shared.context || '').split('SEARCH QUERY:').length - 1;
        
        return {
            question: shared.question,
            searchesPerformed: searchCount,
            hasAnswer: !!shared.answer,
            context: shared.context,
            answer: shared.answer
        };
    }
}

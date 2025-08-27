import { Node } from 'backpackflow/pocketflow';
import { ResearchStorage } from './decide-action-node';

/**
 * SearchWeb Node - The Research Station 🔍
 * 
 * This is the "research station" of our agent. Its job is:
 * 1. Take a search query from the shared storage
 * 2. Search the web for relevant information
 * 3. Store the results back in shared storage
 * 4. Pass control back to the decision node
 * 
 * Based on the PocketFlow tutorial: "LLM Agents are simply Graph"
 * This node demonstrates how agents can interact with external APIs.
 */

export interface SearchWebConfig {
    // In a real implementation, you would add API keys and configuration here
    // For this demo, we'll simulate search results
    simulateSearch?: boolean;
}

export class SearchWebNode extends Node<ResearchStorage> {
    private config: SearchWebConfig;

    constructor(config: SearchWebConfig = {}) {
        super();
        this.config = { simulateSearch: true, ...config };
    }

    /**
     * PREP: Get the search query from shared storage
     */
    async prep(shared: ResearchStorage): Promise<string> {
        if (!shared.searchQuery) {
            throw new Error('No search query found in shared storage');
        }
        
        console.log(`🔍 Preparing to search for: "${shared.searchQuery}"`);
        return shared.searchQuery;
    }

    /**
     * EXEC: Perform the web search
     * In a real implementation, this would call a search API like Google Custom Search
     */
    async exec(searchQuery: string): Promise<string> {
        if (this.config.simulateSearch) {
            // Simulate search results for demo purposes
            return this.simulateWebSearch(searchQuery);
        } else {
            // In a real implementation, you would call a search API here
            return this.performRealWebSearch(searchQuery);
        }
    }

    /**
     * POST: Store search results and return to decision node
     */
    async post(shared: ResearchStorage, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
        const searchResults = execRes as string;
        
        // Add search results to our context
        const previousContext = shared.context || "";
        const newContext = previousContext + 
            `\n\nSEARCH QUERY: ${shared.searchQuery}\n` +
            `SEARCH RESULTS:\n${searchResults}`;
        
        shared.context = newContext;
        
        console.log(`🔍 Search completed. Found information about: ${shared.searchQuery}`);
        
        // Always go back to the decision node after searching
        return 'decide';
    }

    /**
     * Simulate web search results for demo purposes
     * In a real implementation, this would be replaced with actual API calls
     */
    private simulateWebSearch(query: string): string {
        // Simulate different types of search results based on common queries
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('capital') && lowerQuery.includes('france')) {
            return `- The capital of France is Paris
- Paris is located in the north-central part of France
- Paris is known as the "City of Light" and is famous for landmarks like the Eiffel Tower
- The city has a population of over 2 million people`;
        }
        
        if (lowerQuery.includes('super bowl') && lowerQuery.includes('2023')) {
            return `- The Kansas City Chiefs won Super Bowl LVII in 2023
- They defeated the Philadelphia Eagles 38-35
- The game was played on February 12, 2023, at State Farm Stadium in Arizona
- Patrick Mahomes was named Super Bowl MVP`;
        }
        
        if (lowerQuery.includes('weather') || lowerQuery.includes('temperature')) {
            return `- Current weather information varies by location
- For accurate weather data, check local meteorological services
- Weather patterns can change rapidly throughout the day
- Temperature, humidity, and precipitation are key weather indicators`;
        }
        
        if (lowerQuery.includes('python') && lowerQuery.includes('programming')) {
            return `- Python is a high-level programming language created by Guido van Rossum
- First released in 1991, Python emphasizes code readability
- Popular for web development, data science, AI, and automation
- Known for its simple syntax and extensive library ecosystem`;
        }
        
        // Generic response for other queries
        return `Search results for "${query}":
- Found relevant information about ${query}
- Multiple sources provide details on this topic
- Information appears to be current and reliable
- Additional context available from various authoritative sources`;
    }

    /**
     * Placeholder for real web search implementation
     * In a production system, this would integrate with APIs like:
     * - Google Custom Search API
     * - Bing Search API
     * - DuckDuckGo API
     * - Serper API
     */
    private async performRealWebSearch(query: string): Promise<string> {
        // Example implementation with Google Custom Search API:
        /*
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        let results = `Search results for: ${query}\n`;
        for (const item of data.items || []) {
            results += `- ${item.title}: ${item.snippet}\n`;
        }
        
        return results;
        */
        
        throw new Error('Real web search not implemented. Set simulateSearch: true in config to use simulated results.');
    }
}

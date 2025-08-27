/**
 * Research Agent Components
 * 
 * A complete implementation of the research agent pattern from the PocketFlow tutorial:
 * "LLM Agents are simply Graph - Tutorial For Dummies"
 * 
 * This demonstrates how AI agents are just loops with branches:
 * 1. Think about the current state (DecideActionNode)
 * 2. Branch by choosing one action from multiple options
 * 3. Do the chosen action (SearchWebNode or AnswerQuestionNode)
 * 4. Get results from that action
 * 5. Loop back to think again
 */

// Core nodes
export { DecideActionNode, ResearchStorage } from './decide-action-node';
export { SearchWebNode, SearchWebConfig } from './search-web-node';
export { AnswerQuestionNode } from './answer-question-node';

// Flow orchestrator
export { ResearchFlow, ResearchFlowConfig } from './research-flow';

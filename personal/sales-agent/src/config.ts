/**
 * Configuration loader for the Conversational Sales Agent
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { AgentConfig } from './types';

export class ConfigLoader {
    static loadConfig(configPath: string): AgentConfig {
        try {
            const fullPath = path.resolve(configPath);
            const configFile = fs.readFileSync(fullPath, 'utf8');
            const config = yaml.load(configFile) as AgentConfig;
            
            // Validate required fields
            ConfigLoader.validateConfig(config);
            
            return config;
        } catch (error) {
            throw new Error(`Failed to load configuration from ${configPath}: ${error}`);
        }
    }
    
    static loadDefaultConfig(): AgentConfig {
        const defaultConfigPath = path.join(__dirname, '..', 'config', 'sales-agent-config.yml');
        return ConfigLoader.loadConfig(defaultConfigPath);
    }
    
    private static validateConfig(config: AgentConfig): void {
        if (!config.agent) {
            throw new Error('Missing agent configuration');
        }
        
        if (!config.agent.name || !config.agent.model) {
            throw new Error('Agent name and model are required');
        }
        
        if (!config.prompts) {
            throw new Error('Missing prompts configuration');
        }
        
        const requiredPrompts: (keyof typeof config.prompts)[] = ['core_context', 'agent_thinking', 'response_generation'];
        for (const prompt of requiredPrompts) {
            if (!config.prompts[prompt]) {
                throw new Error(`Missing required prompt: ${prompt}`);
            }
        }
        
        if (!config.tools) {
            throw new Error('Missing tools configuration');
        }
    }
}

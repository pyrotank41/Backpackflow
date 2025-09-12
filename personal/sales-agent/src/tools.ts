/**
 * Tool implementations for the Conversational Sales Agent
 */

import { ToolFunction } from './types';

/**
 * Mock product lookup tool - replace with real implementation
 */
export const productLookup: ToolFunction = async (parameters: { product_query: string }) => {
    const { product_query } = parameters;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock product database
    const products = [
        {
            name: "10A MCB Circuit Breaker",
            price: "$15.50",
            availability: "In Stock",
            description: "Single pole MCB for residential use",
            category: "Circuit Breakers",
            brand: "Schneider Electric",
            specifications: {
                amperage: "10A",
                voltage: "240V",
                poles: 1,
                breaking_capacity: "6kA"
            }
        },
        {
            name: "16A MCB Circuit Breaker", 
            price: "$18.75",
            availability: "In Stock",
            description: "Single pole MCB for higher load applications",
            category: "Circuit Breakers",
            brand: "Schneider Electric",
            specifications: {
                amperage: "16A",
                voltage: "240V", 
                poles: 1,
                breaking_capacity: "6kA"
            }
        },
        {
            name: "20A MCB Circuit Breaker",
            price: "$22.00",
            availability: "In Stock", 
            description: "Single pole MCB for workshop/commercial use",
            category: "Circuit Breakers",
            brand: "ABB",
            specifications: {
                amperage: "20A",
                voltage: "240V",
                poles: 1,
                breaking_capacity: "10kA"
            }
        },
        {
            name: "GFCI Outlet 20A",
            price: "$45.99",
            availability: "In Stock",
            description: "Ground fault circuit interrupter outlet",
            category: "Outlets",
            brand: "Leviton",
            specifications: {
                amperage: "20A",
                voltage: "125V",
                type: "GFCI",
                weather_resistant: true
            }
        },
        {
            name: "3-Way Switch",
            price: "$8.25",
            availability: "In Stock",
            description: "Standard 3-way toggle switch",
            category: "Switches",
            brand: "Leviton",
            specifications: {
                amperage: "15A",
                voltage: "120V",
                type: "3-way",
                color: "white"
            }
        }
    ];
    
    // Simple search logic
    const query = product_query.toLowerCase();
    const matches = products.filter(product => {
        return product.name.toLowerCase().includes(query) ||
               product.description.toLowerCase().includes(query) ||
               product.category.toLowerCase().includes(query) ||
               product.brand.toLowerCase().includes(query) ||
               Object.values(product.specifications).some(spec => 
                   String(spec).toLowerCase().includes(query)
               );
    });
    
    if (matches.length === 0) {
        return {
            success: false,
            message: "No products found matching your search criteria",
            suggestions: [
                "Try searching for: circuit breaker, outlet, switch, or wire",
                "Use specific amperage like '10A' or '20A'",
                "Try brand names like 'Schneider' or 'ABB'"
            ]
        };
    }
    
    return {
        success: true,
        products: matches,
        total_found: matches.length,
        search_query: product_query
    };
};

/**
 * Get all available tools
 */
export function getAvailableTools(): Record<string, ToolFunction> {
    return {
        product_lookup: productLookup
    };
}

/**
 * Tool registry for easy extension
 */
export class ToolRegistry {
    private tools: Map<string, ToolFunction> = new Map();
    
    constructor() {
        // Register default tools
        this.tools.set('product_lookup', productLookup);
    }
    
    registerTool(name: string, tool: ToolFunction): void {
        this.tools.set(name, tool);
    }
    
    getTool(name: string): ToolFunction | undefined {
        return this.tools.get(name);
    }
    
    getAllTools(): Record<string, ToolFunction> {
        return Object.fromEntries(this.tools);
    }
    
    getToolNames(): string[] {
        return Array.from(this.tools.keys());
    }
}

import { Node } from "backpackflow/pocketflow";

type Tool = {
    name: string;
    description: string;
    parameters: any;
    execute: (parameters: any) => Promise<any>;
}

type SharedStorage = {
    tools: Tool[];
}





class ToolManager extends Node<SharedStorage> {

    async prep(shared: SharedStorage): Promise<unknown> {
        console.log('Preparing ToolManager with shared:', shared);
        return { message: 'Hello from ToolManager!' };
    }
    
    async exec(prepRes: unknown): Promise<unknown> {
        console.log('Executing ToolManager with prep result:', prepRes);
        return { message: 'Hello from ToolManager!' };
    }

    async post(shared: SharedStorage, prepRes: unknown, execRes: unknown){
        console.log('Posting ToolManager with shared:', shared);
        return { message: 'Hello from ToolManager!' };
    }
}



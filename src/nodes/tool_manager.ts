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




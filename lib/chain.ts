export interface Block {
    sender: string;
    receiver: string;
    amount: number;
    timestamp: number;
};

export const chain: Block[] = [];
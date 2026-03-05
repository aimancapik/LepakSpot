export interface ReceiptItem {
    id: string;
    name: string;
    price: number;
    assignedTo: string[];
}

export interface Bill {
    id?: string;
    sessionId: string;
    uploadedBy: string;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    createdAt?: string;
    updatedAt?: string;
}

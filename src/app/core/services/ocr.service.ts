import { Injectable, signal } from '@angular/core';
import Tesseract from 'tesseract.js';
import { ReceiptItem } from '../models/bill.model';

@Injectable({
    providedIn: 'root'
})
export class OcrService {
    isProcessing = signal<boolean>(false);
    progress = signal<number>(0);
    statusText = signal<string>('');

    constructor() { }

    async processReceipt(imageFile: File | string): Promise<ReceiptItem[]> {
        this.isProcessing.set(true);
        this.progress.set(0);
        this.statusText.set('Initializing OCR...');

        try {
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.progress.set(m.progress);
                    }
                    this.statusText.set(m.status);
                    console.log(m);
                }
            });

            this.statusText.set('Recognizing text...');
            const { data: { text } } = await worker.recognize(imageFile);

            await worker.terminate();

            this.statusText.set('Parsing results...');
            const items = this.parseReceiptText(text);

            this.statusText.set('Done!');
            setTimeout(() => {
                this.isProcessing.set(false);
            }, 1000);

            return items;
        } catch (error) {
            console.error('OCR Error:', error);
            this.statusText.set('Error processing receipt.');
            this.isProcessing.set(false);
            throw error;
        }
    }

    private parseReceiptText(text: string): ReceiptItem[] {
        const items: ReceiptItem[] = [];
        const lines = text.split('\n').filter(line => line.trim() !== '');

        // Regex to find a price at the end of a line. 
        // Matches formats like 12.50, 12,50, RM12.50, RM 12.50
        const priceRegex = /(?:RM\s*)?(\d+[\.,]\d{2})\s*$/i;

        let idCounter = 1;

        for (const line of lines) {
            const match = line.match(priceRegex);
            if (match) {
                let priceStr = match[1].replace(',', '.'); // Handle comma as decimal separator
                const price = parseFloat(priceStr);

                // Name is the part of the line before the price
                let name = line.replace(match[0], '').trim();

                // Basic cleanup: remove leading/trailing noise if any
                name = name.replace(/^[^\w]+|[^\w]+$/g, '').trim();

                if (name && !isNaN(price)) {
                    // Filter out lines that look like totals/taxes to be handled separately if needed
                    const lowerName = name.toLowerCase();
                    if (
                        lowerName.includes('total') ||
                        lowerName.includes('subtotal') ||
                        lowerName.includes('tax') ||
                        lowerName.includes('gst') ||
                        lowerName.includes('sst') ||
                        lowerName.includes('cash') ||
                        lowerName.includes('change')
                    ) {
                        continue;
                    }

                    items.push({
                        id: `item-${Date.now()}-${idCounter++}`, // Generate unique ID
                        name: name,
                        price: price,
                        assignedTo: []
                    });
                }
            }
        }

        return items;
    }
}

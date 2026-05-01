import { ChangeDetectionStrategy, Component, inject, OnInit, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { BillSplitService } from '../../../core/services/bill-split.service';
import { OcrService } from '../../../core/services/ocr.service';
import { SessionService } from '../../../core/services/session.service';
import { ReceiptItem } from '../../../core/models/bill.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-bill-split',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterLink, FadeUpDirective],
    templateUrl: './bill-split.component.html',
})
export class BillSplitComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private billSplitService = inject(BillSplitService);
    public ocrService = inject(OcrService);
    private sessionService = inject(SessionService);
    public authService = inject(AuthService);
    private toastService = inject(ToastService);

    sessionId = signal<string>('');
    session = computed(() => this.sessionService.activeSession());
    activeBill = computed(() => this.billSplitService.activeBill());

    // Local state for OCR
    parsedItems = signal<ReceiptItem[]>([]);
    rawSubtotal = signal<number>(0);
    rawTax = signal<number>(0);
    rawServiceCharge = signal<number>(0);

    viewState = signal<'INITIAL' | 'SCANNING' | 'CONFIRM_ITEMS' | 'ASSIGNING' | 'SUMMARY'>('INITIAL');

    // Currently selected item for assignment
    selectedItemId = signal<string | null>(null);

    async ngOnInit() {
        const sId = this.route.snapshot.paramMap.get('id');
        if (!sId) {
            this.router.navigate(['/home']);
            return;
        }
        this.sessionId.set(sId);
        this.sessionService.listenSession(sId);

        // Check if a bill already exists for this session
        const existingBill = await this.billSplitService.getLatestBillForSession(sId);
        if (existingBill) {
            this.billSplitService.listenToBill(sId, existingBill.id!);
            this.viewState.set('ASSIGNING');
        }
    }

    ngOnDestroy() {
        this.billSplitService.stopListening();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.processImage(input.files[0]);
        }
    }

    async processImage(file: File) {
        this.viewState.set('SCANNING');
        try {
            const items = await this.ocrService.processReceipt(file);
            this.parsedItems.set(items);

            // Basic auto-calculation
            const subtotal = items.reduce((acc, item) => acc + item.price, 0);
            this.rawSubtotal.set(subtotal);

            this.viewState.set('CONFIRM_ITEMS');
        } catch {
            this.toastService.show('Failed to process image. Please try again or enter manually.', 'error');
            this.viewState.set('INITIAL');
        }
    }

    async createBill() {
        try {
            const sId = this.sessionId();
            const items = this.parsedItems();
            // Always recalculate subtotal from items (covers manual entry flow)
            const sub = items.reduce((acc, item) => acc + (item.price || 0), 0);
            const tax = this.rawTax();
            const sc = this.rawServiceCharge();
            const total = sub + tax + sc;

            const billId = await this.billSplitService.createBill(sId, items, sub, tax, sc, total);
            this.billSplitService.listenToBill(sId, billId);
            this.viewState.set('ASSIGNING');
        } catch (e) {
            console.error('Error creating bill', e);
            this.toastService.show('Error creating bill. Please try again.', 'error');
        }
    }

    selectItem(itemId: string) {
        this.selectedItemId.set(this.selectedItemId() === itemId ? null : itemId);
    }

    async toggleAssignment(memberId: string) {
        const itemId = this.selectedItemId();
        const bill = this.activeBill();
        if (!itemId || !bill) return;

        const item = bill.items.find(i => i.id === itemId);
        if (!item) return;

        let newAssignedTo = [...item.assignedTo];
        if (newAssignedTo.includes(memberId)) {
            newAssignedTo = newAssignedTo.filter(id => id !== memberId);
        } else {
            newAssignedTo.push(memberId);
        }

        await this.billSplitService.updateItemAssignment(this.sessionId(), bill.id!, itemId, newAssignedTo);
    }

    startManualEntry() {
        this.parsedItems.set([]);
        this.rawSubtotal.set(0);
        this.rawTax.set(0);
        this.rawServiceCharge.set(0);
        this.viewState.set('CONFIRM_ITEMS');
    }

    addItem() {
        const newItem = {
            id: crypto.randomUUID(),
            name: '',
            price: 0,
            assignedTo: [],
        };
        this.parsedItems.update(items => [...items, newItem]);
    }

    goToSummary() {
        this.viewState.set('SUMMARY');
    }

    backToAssignment() {
        this.viewState.set('ASSIGNING');
    }

    // Summary Calculations
    getMemberSubtotal(memberId: string): number {
        const bill = this.activeBill();
        if (!bill) return 0;

        return bill.items.reduce((acc, item) => {
            if (item.assignedTo.includes(memberId)) {
                return acc + (item.price / item.assignedTo.length);
            }
            return acc;
        }, 0);
    }

    getMemberTotal(memberId: string): number {
        const bill = this.activeBill();
        if (!bill) return 0;

        const subtotal = this.getMemberSubtotal(memberId);
        if (bill.subtotal === 0) return 0;

        const shareRatio = subtotal / bill.subtotal;
        const taxShare = bill.tax * shareRatio;
        const scShare = bill.serviceCharge * shareRatio;

        return subtotal + taxShare + scShare;
    }
}

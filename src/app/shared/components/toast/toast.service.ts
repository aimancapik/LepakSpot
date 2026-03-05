import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    message: string;
    type: ToastType;
    id: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    toasts = signal<Toast[]>([]);
    private nextId = 0;

    show(message: string, type: ToastType = 'success', duration = 3000) {
        const id = this.nextId++;
        this.toasts.update(list => [...list, { message, type, id }]);
        setTimeout(() => {
            this.toasts.update(list => list.filter(t => t.id !== id));
        }, duration);
    }

    dismiss(id: number) {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
}

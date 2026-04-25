import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    template: `
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none max-w-sm w-full px-4">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto w-full flex items-center gap-3 px-4 py-3 font-marker text-sm uppercase tracking-wide border-2 border-espresso shadow-[3px_3px_0_var(--color-espresso)] animate-[slideDown_0.25s_ease-out]"
          [class]="toastClass(toast.type)"
        >
          <span class="material-symbols-outlined text-lg shrink-0">{{ toastIcon(toast.type) }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button class="shrink-0 opacity-60 hover:opacity-100 pointer-events-auto" (click)="toastService.dismiss(toast.id)">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      }
    </div>
  `,
    styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastComponent {
    toastService = inject(ToastService);

    toastClass(type: string): string {
        switch (type) {
            case 'success': return 'bg-sage text-espresso';
            case 'error': return 'bg-espresso text-primary';
            default: return 'bg-off-white text-espresso';
        }
    }

    toastIcon(type: string): string {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            default: return 'info';
        }
    }
}

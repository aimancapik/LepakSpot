import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (visible()) {
    <div class="fixed inset-0 z-[200] bg-espresso/80 backdrop-blur-sm flex items-end justify-center p-4">
        <div class="w-full max-w-sm bg-latte zine-border shadow-[8px_8px_0_var(--color-primary)] overflow-hidden">
            <!-- Slide content -->
            <div class="p-6 min-h-[260px] flex flex-col justify-between">
                <div>
                    <div class="text-5xl mb-4">{{ slides[step()].emoji }}</div>
                    <h2 class="font-zine text-2xl font-black italic uppercase text-espresso leading-tight mb-2">
                        {{ slides[step()].title }}
                    </h2>
                    <p class="font-sans text-sm text-espresso/70 leading-relaxed">
                        {{ slides[step()].desc }}
                    </p>
                </div>

                <!-- Step dots -->
                <div class="flex items-center justify-between mt-6">
                    <div class="flex gap-2">
                        @for (s of slides; track $index) {
                        <div class="w-2 h-2 rounded-full border-2 border-espresso transition-all"
                            [class]="$index === step() ? 'bg-primary w-6' : 'bg-transparent'"></div>
                        }
                    </div>
                    <button (click)="next()"
                        class="bg-espresso text-off-white font-marker text-sm px-5 py-2 zine-border zine-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
                        @if (step() < slides.length - 1) { NEXT → } @else { LET'S GO! }
                    </button>
                </div>
            </div>
        </div>
    </div>
    }
    `
})
export class OnboardingComponent {
    step = signal(0);
    visible = signal(this.shouldShow());

    slides = [
        {
            emoji: '☕',
            title: 'Welcome to LepakSpot',
            desc: 'Discover the best cafes in Malaysia, curated by your community. Filter by vibe, Wi-Fi, noise level, and more.'
        },
        {
            emoji: '🗺️',
            title: 'Find Your Vibe',
            desc: 'Use "Open Now", "Late Night", or sort by Nearest / Highest Rated to find the perfect spot for your mood.'
        },
        {
            emoji: '🤝',
            title: 'Lepak Together',
            desc: 'Create a session with friends, vote for a cafe, and split bills — all from one app. Check in to earn points and badges!'
        },
    ];

    private shouldShow(): boolean {
        return !localStorage.getItem('ls_onboarded');
    }

    next() {
        if (this.step() < this.slides.length - 1) {
            this.step.update(s => s + 1);
        } else {
            localStorage.setItem('ls_onboarded', '1');
            this.visible.set(false);
        }
    }
}

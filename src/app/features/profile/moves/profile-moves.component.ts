import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { CheckIn } from '../../../core/models/checkin.model';
import { ToastService } from '../../../shared/components/toast/toast.service';

import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-profile-moves',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, RouterLink, FadeUpDirective],
    templateUrl: './profile-moves.component.html',
})
export class ProfileMovesComponent implements OnInit {
    private authService = inject(AuthService);
    private checkinService = inject(CheckInService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    moves = signal<CheckIn[]>([]);
    loading = signal(true);

    async ngOnInit() {
        const user = this.authService.currentUser();
        if (!user) {
            this.loading.set(false);
            return;
        }

        try {
            const moves = await this.checkinService.getUserCheckins(user.uid, 100);
            this.moves.set(moves);
        } catch {
            this.toastService.show('Could not load your move history.', 'error');
        } finally {
            this.loading.set(false);
        }
    }

    goBack() {
        this.location.back();
    }
}

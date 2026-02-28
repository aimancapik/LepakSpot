import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { Cafe } from '../../../core/models/cafe.model';
import { Location } from '@angular/common';

@Component({
    selector: 'app-cafe-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    templateUrl: './cafe-detail.component.html',
    styleUrl: './cafe-detail.component.scss',
})
export class CafeDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private cafeService = inject(CafeService);
    private location = inject(Location);

    cafe = signal<Cafe | null>(null);

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            const cafes = await this.cafeService.getCafesByIds([id]);
            if (cafes.length > 0) {
                this.cafe.set(cafes[0]);
            }
        }
    }

    goBack() {
        this.location.back();
    }
}

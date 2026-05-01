import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    OnDestroy,
    AfterViewInit,
    ElementRef,
    ViewChild,
    NgZone,
    inject,
    signal,
    computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyValuePipe, UpperCasePipe } from '@angular/common';
import * as L from 'leaflet';
import { SessionService } from '../../../core/services/session.service';
import { CafeService } from '../../../core/services/cafe.service';
import { MeetpointService, MeetpointResult } from '../../../core/services/meetpoint.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cafe } from '../../../core/models/cafe.model';
import { MemberLocation } from '../../../core/models/session.model';

const MEMBER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-meetpoint',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [KeyValuePipe, UpperCasePipe, FadeUpDirective],
    templateUrl: './meetpoint.component.html',
})
export class MeetpointComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private ngZone = inject(NgZone);
    private sessionService = inject(SessionService);
    private cafeService = inject(CafeService);
    private meetpointService = inject(MeetpointService);
    private authService = inject(AuthService);

    private map!: L.Map;
    private sessionId = '';

    result = signal<MeetpointResult | null>(null);
    winnerCafe = signal<Cafe | null>(null);
    selectedCafe = signal<Cafe | null>(null);
    memberLocations = signal<Record<string, MemberLocation>>({});
    loading = signal(true);

    midpointLabel = computed(() => {
        const r = this.result();
        if (!r) return '';
        return `${r.midpoint.lat.toFixed(4)}, ${r.midpoint.lng.toFixed(4)}`;
    });

    nearbyCafes = computed(() => this.result()?.nearbyCafes ?? []);

    ngOnInit() {
        this.sessionId = this.route.snapshot.paramMap.get('id') ?? '';
        this.sessionService.listenSession(this.sessionId);
    }

    async ngAfterViewInit() {
        await this.cafeService.getNearby();

        const session = this.sessionService.activeSession();
        if (!session) {
            this.loading.set(false);
            return;
        }

        const locations = session.memberLocations ?? {};
        this.memberLocations.set(locations);

        // Calculate meetpoint
        const meetResult = this.meetpointService.calculate(locations);
        this.result.set(meetResult);

        // Load winner cafe
        if (session.winnerId) {
            const winner = await this.cafeService.getCafeById(session.winnerId);
            this.winnerCafe.set(winner);
        }

        this.loading.set(false);

        // Wait for Angular to render the @else block (mapEl lives inside it)
        setTimeout(() => {
            this.ngZone.runOutsideAngular(() => {
                this.map = L.map(this.mapEl.nativeElement, {
                    center: [meetResult.midpoint.lat, meetResult.midpoint.lng],
                    zoom: 13,
                    zoomControl: false,
                });

                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19,
                }).addTo(this.map);

                L.control.zoom({ position: 'bottomright' }).addTo(this.map);

                this.map.invalidateSize();
                this.addMarkers(meetResult, locations, session.winnerId);
            });
        }, 50);
    }

    ngOnDestroy() {
        this.map?.remove();
    }

    private addMarkers(
        result: MeetpointResult,
        locations: Record<string, MemberLocation>,
        winnerId: string | null,
    ) {
        const bounds = L.latLngBounds([]);

        // Member markers
        const memberIds = Object.keys(locations);
        memberIds.forEach((uid, i) => {
            const loc = locations[uid];
            const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width:32px; height:32px; border-radius:50%;
                    background:${color}; border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,0.4);
                    display:flex; align-items:center; justify-content:center;
                    font-size:12px; font-weight:bold; color:#fff;
                    font-family:'Space Grotesk',sans-serif;
                ">P${i + 1}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            L.marker([loc.lat, loc.lng], { icon }).addTo(this.map);
            bounds.extend([loc.lat, loc.lng]);
        });

        // Midpoint pin marker (teardrop shape)
        const memberCount = Object.keys(locations).length;
        const midIcon = L.divIcon({
            className: '',
            html: `
                <div style="position:relative;width:36px;height:52px;">
                    <div style="
                        width:36px;height:36px;
                        border-radius:50% 50% 50% 0;
                        transform:rotate(-45deg);
                        background:#d48c3a;
                        border:3px solid white;
                        box-shadow:0 4px 16px rgba(212,140,58,0.55),0 2px 8px rgba(0,0,0,0.35);
                        display:flex;align-items:center;justify-content:center;
                    ">
                        <span style="transform:rotate(45deg);font-size:16px;line-height:1;">⭐</span>
                    </div>
                </div>`,
            iconSize: [36, 52],
            iconAnchor: [18, 52],
        });
        L.marker([result.midpoint.lat, result.midpoint.lng], { icon: midIcon, zIndexOffset: 500 })
            .addTo(this.map)
            .bindPopup(`
                <div style="font-family:'Space Grotesk',sans-serif;min-width:160px;">
                    <div style="font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Geographic Centre</div>
                    <div style="font-size:11px;color:#555;margin-bottom:6px;">Equidistant from all ${memberCount} member${memberCount !== 1 ? 's' : ''}</div>
                    <div style="font-size:10px;color:#999;font-family:monospace;">${result.midpoint.lat.toFixed(5)}, ${result.midpoint.lng.toFixed(5)}</div>
                </div>`, {
                closeButton: false,
                className: 'meetpoint-popup',
            })
            .openPopup();
        bounds.extend([result.midpoint.lat, result.midpoint.lng]);

        // Nearby cafe markers
        result.nearbyCafes.forEach(cafe => {
            const isWinner = cafe.id === winnerId;
            const size = isWinner ? 28 : 16;
            const bg = isWinner ? '#d48c3a' : '#8FAF8F';
            const border = isWinner ? '3px solid #fff' : '2px solid #fff';
            const shadow = isWinner ? '0 0 12px rgba(212,140,58,0.5)' : '0 1px 4px rgba(0,0,0,0.4)';

            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width:${size}px; height:${size}px; border-radius:50%;
                    background:${bg}; border:${border};
                    box-shadow:${shadow};
                    ${isWinner ? 'display:flex; align-items:center; justify-content:center; font-size:14px;' : ''}
                ">${isWinner ? '☕' : ''}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
            });

            const marker = L.marker([cafe.lat, cafe.lng], { icon }).addTo(this.map);
            marker.on('click', () => {
                this.ngZone.run(() => this.selectedCafe.set(cafe));
            });
            bounds.extend([cafe.lat, cafe.lng]);
        });

        // Fit bounds
        if (bounds.isValid()) {
            setTimeout(() => {
                this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }, 100);
        }
    }

    selectCafe(cafe: Cafe) {
        this.selectedCafe.set(cafe);
    }

    getDistanceFromMidpoint(cafe: Cafe): string {
        const r = this.result();
        if (!r) return '';
        return this.meetpointService.distanceFromMidpoint(r.midpoint, cafe);
    }

    getMaxTravel(cafe: Cafe): string {
        return this.meetpointService.maxTravelDistance(this.memberLocations(), cafe);
    }

    isWinner(cafe: Cafe): boolean {
        return cafe.id === this.winnerCafe()?.id;
    }

    goToResult() {
        this.router.navigate(['/session', this.sessionId, 'result']);
    }

    goBack() {
        this.router.navigate(['/home']);
    }
}

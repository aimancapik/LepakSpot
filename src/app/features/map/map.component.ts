import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ElementRef,
    inject,
    signal,
    computed,
    ViewChild,
    AfterViewInit,
    NgZone,
} from '@angular/core';
import * as L from 'leaflet';
import { CafeService } from '../../core/services/cafe.service';
import { CheckInService, CafeDensity } from '../../core/services/checkin.service';
import { AuthService } from '../../core/services/auth.service';
import { Cafe } from '../../core/models/cafe.model';

type DensityLevel = 'empty' | 'chill' | 'moderate' | 'busy' | 'packed';

const DENSITY_CONFIG: Record<DensityLevel, { label: string; color: string; bg: string; fill: number }> = {
    empty: { label: 'Empty', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', fill: 0 },
    chill: { label: 'Chill', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', fill: 20 },
    moderate: { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.15)', fill: 50 },
    busy: { label: 'Busy', color: '#f97316', bg: 'rgba(249,115,22,0.15)', fill: 75 },
    packed: { label: 'Packed!', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', fill: 100 },
};

function createMarkerIcon(color: string, size = 14): L.DivIcon {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:${size}px; height:${size}px;
            border-radius:50%;
            background:${color};
            border:2.5px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

@Component({
    selector: 'app-map',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

    cafeService = inject(CafeService);
    checkInService = inject(CheckInService);
    authService = inject(AuthService);
    private ngZone = inject(NgZone);

    private map!: L.Map;
    private markers: Map<string, L.Marker> = new Map();

    selectedCafe = signal<Cafe | null>(null);
    isDrawerOpen = signal(false);
    isCheckingIn = signal(false);
    checkInSuccess = signal(false);

    activePeople = this.checkInService.activePeopleAtCafe;

    selectedCafeDensity = computed<CafeDensity>(() => {
        const cafe = this.selectedCafe();
        if (!cafe) return { cafeId: '', count: 0, level: 'empty' };
        return this.checkInService.getDensityForCafe(cafe.id);
    });

    densityConfig = computed(() => DENSITY_CONFIG[this.selectedCafeDensity().level as DensityLevel]);

    private unsubscribeDensity?: () => void;
    private unsubscribeCafe?: () => void;

    ngOnInit() {
        this.cafeService.getNearby();
        this.unsubscribeDensity = this.checkInService.watchAllDensity();
    }

    ngAfterViewInit() {
        // Init map outside Angular zone for performance
        this.ngZone.runOutsideAngular(() => {
            this.map = L.map(this.mapContainer.nativeElement, {
                center: [3.139, 101.6869],
                zoom: 13,
                zoomControl: false,
            });

            // OpenStreetMap tiles — completely free, no API key
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(this.map);

            L.control.zoom({ position: 'bottomright' }).addTo(this.map);
        });

        // Add markers after a tick to ensure map is ready
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
            this.addCafeMarkers();
            this.getUserLocation();
        }, 100);
    }

    ngOnDestroy() {
        this.unsubscribeDensity?.();
        this.unsubscribeCafe?.();
        this.map?.remove();
    }

    private addCafeMarkers() {
        const cafes = this.cafeService.filteredCafes();
        cafes.forEach(cafe => {
            const density = this.checkInService.getDensityForCafe(cafe.id);
            const config = DENSITY_CONFIG[density.level as DensityLevel];
            const size = density.count > 0 ? 14 + density.count * 2 : 14;
            const icon = createMarkerIcon(config.color, Math.min(size, 28));

            const marker = L.marker([cafe.lat, cafe.lng], { icon })
                .addTo(this.map)
                .on('click', () => {
                    this.ngZone.run(() => this.onMarkerClick(cafe));
                });

            this.markers.set(cafe.id, marker);
        });
    }

    private getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.ngZone.run(() => {
                        this.map.setView([pos.coords.latitude, pos.coords.longitude], 14);
                    });
                },
                () => { } // Keep default KL center on denial
            );
        }
    }

    onMarkerClick(cafe: Cafe) {
        this.checkInSuccess.set(false);
        this.unsubscribeCafe?.();
        this.selectedCafe.set(cafe);
        this.isDrawerOpen.set(true);
        this.map.panTo([cafe.lat - 0.003, cafe.lng]);
        this.unsubscribeCafe = this.checkInService.watchCafe(cafe.id);
    }

    closeDrawer() {
        this.isDrawerOpen.set(false);
        this.unsubscribeCafe?.();
        this.checkInService.activePeopleAtCafe.set([]);
        setTimeout(() => this.selectedCafe.set(null), 350);
    }

    async handleCheckIn() {
        const cafe = this.selectedCafe();
        if (!cafe) return;
        this.isCheckingIn.set(true);
        try {
            await this.checkInService.checkIn(cafe.id, cafe.name);
            this.checkInSuccess.set(true);
        } catch (e) {
            console.error('Check-in failed:', e);
        } finally {
            this.isCheckingIn.set(false);
        }
    }

    getDensityFill(level: string): number {
        return DENSITY_CONFIG[level as DensityLevel]?.fill ?? 0;
    }

    getDensityColor(level: string): string {
        return DENSITY_CONFIG[level as DensityLevel]?.color ?? '#6b7280';
    }

    get currentUserId(): string {
        return this.authService.currentUser()?.uid ?? '';
    }

    isAlreadyCheckedIn(): boolean {
        return this.activePeople().some(p => p.userId === this.currentUserId);
    }

    getAvatarInitials(name: string): string {
        return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() ?? '?';
    }

    // Expose to template
    getCafes() { return this.cafeService.filteredCafes(); }
}

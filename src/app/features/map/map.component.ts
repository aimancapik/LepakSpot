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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CafeService } from '../../core/services/cafe.service';
import { CheckInService, CafeDensity } from '../../core/services/checkin.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { Cafe } from '../../core/models/cafe.model';

type DensityLevel = 'empty' | 'chill' | 'moderate' | 'busy' | 'packed';

const DENSITY_CONFIG: Record<DensityLevel, { label: string; color: string; bg: string; fill: number }> = {
    empty: { label: 'Empty', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', fill: 0 },
    chill: { label: 'Chill', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', fill: 20 },
    moderate: { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.15)', fill: 50 },
    busy: { label: 'Busy', color: '#f97316', bg: 'rgba(249,115,22,0.15)', fill: 75 },
    packed: { label: 'Packed!', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', fill: 100 },
};

// Month abbreviations for date badge
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// Pseudo-random tilt per cafe id (stable across renders)
function stableRotation(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
    return ((h % 13) - 6); // -6..+6 degrees
}

function createPolaroidIcon(cafe: Cafe, density: { color: string; count: number }, isSelected: boolean): L.DivIcon {
    const photo = cafe.photos?.[0] ?? '';
    const rotation = stableRotation(cafe.id);
    const nameUpper = cafe.name.toUpperCase();
    const now = new Date();
    const month = MONTHS[now.getMonth()];
    const day = now.getDate();
    const densityDot = density.count > 0
        ? `<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${density.color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:3;"></div>`
        : '';
    const selectedRing = isSelected
        ? `box-shadow:0 0 0 3px #7C3AED, 0 6px 24px rgba(124,58,237,0.4), 0 2px 8px rgba(0,0,0,0.2);`
        : `box-shadow:0 4px 20px rgba(0,0,0,0.22),0 1px 4px rgba(0,0,0,0.12);`;

    // Break long names across two lines if needed
    const words = nameUpper.split(' ');
    const label = words.length > 1
        ? `${words.slice(0, Math.ceil(words.length / 2)).join(' ')}<br/>${words.slice(Math.ceil(words.length / 2)).join(' ')}`
        : nameUpper;

    const photoHtml = photo
        ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;display:block;" />`
        : `<div style="width:100%;height:100%;background:#C8B8A8;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:22px;">☕</div>`;

    return L.divIcon({
        className: '',
        html: `
            <div class="polaroid-marker" style="
                position:relative;
                background:white;
                border-radius:6px;
                padding:5px 5px 10px;
                width:110px;
                ${selectedRing}
                transform:rotate(${rotation}deg);
                cursor:pointer;
                transition:transform 0.2s, box-shadow 0.2s;
            ">
                ${densityDot}
                <!-- date badge -->
                <div style="position:absolute;top:-5px;left:-5px;background:white;border-radius:6px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.18);padding:2px 5px;z-index:10;text-align:center;min-width:30px;">
                    <div style="font-size:6px;font-weight:800;color:#EF4444;text-transform:uppercase;letter-spacing:0.5px;line-height:1.3;">${month}</div>
                    <div style="font-size:13px;font-weight:800;color:#1A1A1A;line-height:1.1;">${day}</div>
                </div>
                <!-- photo -->
                <div style="width:100%;height:105px;border-radius:3px;overflow:hidden;position:relative;">
                    ${photoHtml}
                    <!-- name overlay -->
                    <div style="position:absolute;bottom:3px;left:4px;right:4px;
                        font-family:'Bebas Neue',sans-serif;font-size:11px;letter-spacing:1px;
                        color:white;line-height:1.1;
                        text-shadow:-1px -1px 0 #1A1A1A,1px -1px 0 #1A1A1A,-1px 1px 0 #1A1A1A,1px 1px 0 #1A1A1A,0 2px 6px rgba(0,0,0,0.5);">
                        ${label}
                    </div>
                </div>
                <!-- pin stem -->
                <div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);
                    width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
                    border-top:10px solid white;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>
            </div>
        `,
        iconSize: [120, 135],
        iconAnchor: [60, 135],
        popupAnchor: [0, -135],
    });
}

@Component({
    selector: 'app-map',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

    cafeService = inject(CafeService);
    checkInService = inject(CheckInService);
    authService = inject(AuthService);
    private toastService = inject(ToastService);
    private ngZone = inject(NgZone);

    private map!: L.Map;
    private markers: Map<string, L.Marker> = new Map();

    selectedCafe = signal<Cafe | null>(null);
    isDrawerOpen = signal(false);
    isCheckingIn = signal(false);
    isCheckingOut = signal(false);
    checkInSuccess = signal(false);
    checkInStatus = signal<'loading' | 'ready' | 'already' | 'was-here'>('loading');
    searchOpen = signal(false);
    searchQuery = this.cafeService.searchQuery;
    cityName = signal('KUALA LUMPUR');
    userLat = signal<number | null>(null);
    userLng = signal<number | null>(null);
    private watchId: number | null = null;
    private initialPositionSet = false;

    activePeople = this.checkInService.activePeopleAtCafe;

    selectedCafeDensity = computed<CafeDensity>(() => {
        const cafe = this.selectedCafe();
        if (!cafe) return { cafeId: '', count: 0, level: 'empty' };
        return this.checkInService.getDensityForCafe(cafe.id);
    });

    densityConfig = computed(() => DENSITY_CONFIG[this.selectedCafeDensity().level as DensityLevel]);

    distanceToCafe = computed<number | null>(() => {
        const cafe = this.selectedCafe();
        const lat = this.userLat();
        const lng = this.userLng();
        if (!cafe || lat === null || lng === null) return null;
        return this.haversine(lat, lng, cafe.lat, cafe.lng);
    });

    tooFarToCheckIn = computed(() => {
        const d = this.distanceToCafe();
        return d === null || d > 50;
    });

    formatDistance(): string {
        const d = this.distanceToCafe();
        if (d === null) return '';
        return d < 1000 ? `${Math.round(d)}m away` : `${(d / 1000).toFixed(1)}km away`;
    }

    private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private unsubscribeDensity?: () => void;
    private unsubscribeCafe?: () => void;
    private cityNameDebounce: ReturnType<typeof setTimeout> | null = null;

    ngOnInit() {
        this.unsubscribeDensity = this.checkInService.watchAllDensity();
    }

    async ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            this.map = L.map(this.mapContainer.nativeElement, {
                center: [3.139, 101.6869],
                zoom: 13,
                zoomControl: false,
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(this.map);

            // Dynamic city name — must be inside runOutsideAngular so Leaflet wires it properly
            this.map.on('moveend', () => this.updateCityNameFromCenter());

        });

        await this.cafeService.getNearby();

        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
            this.addCafeMarkers();
            this.getUserLocation();
            // Fire initial lookup for default center
            this.updateCityNameFromCenter();
        }, 100);
    }

    ngOnDestroy() {
        this.unsubscribeDensity?.();
        this.unsubscribeCafe?.();
        if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
        if (this.cityNameDebounce) clearTimeout(this.cityNameDebounce);
        this.map?.remove();
    }

    /** Debounced reverse geocode for the current map center. */
    private updateCityNameFromCenter() {
        if (this.cityNameDebounce) clearTimeout(this.cityNameDebounce);
        this.cityNameDebounce = setTimeout(() => {
            const center = this.map.getCenter();
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`)
                .then(r => r.json())
                .then((data: any) => {
                    const a = data.address;
                    const name =
                        a.suburb ||
                        a.city_district ||
                        a.town ||
                        a.city ||
                        a.county ||
                        a.state ||
                        'SOMEWHERE';
                    this.ngZone.run(() => this.cityName.set(name.toUpperCase()));
                })
                .catch(() => {});
        }, 600); // 600 ms debounce — jangan bagi Nominatim kena spam
    }

    private addCafeMarkers() {
        const cafes = this.cafeService.filteredCafes();
        cafes.forEach(cafe => {
            const density = this.checkInService.getDensityForCafe(cafe.id);
            const config = DENSITY_CONFIG[density.level as DensityLevel];
            const isSelected = this.selectedCafe()?.id === cafe.id;
            const icon = createPolaroidIcon(cafe, { color: config.color, count: density.count }, isSelected);

            const marker = L.marker([cafe.lat, cafe.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 })
                .addTo(this.map)
                .on('click', () => {
                    this.ngZone.run(() => this.onMarkerClick(cafe));
                });

            this.markers.set(cafe.id, marker);
        });
    }

    private refreshMarkerIcon(cafeId: string) {
        const cafes = this.cafeService.filteredCafes();
        const cafe = cafes.find(c => c.id === cafeId);
        const marker = this.markers.get(cafeId);
        if (!cafe || !marker) return;
        const density = this.checkInService.getDensityForCafe(cafeId);
        const config = DENSITY_CONFIG[density.level as DensityLevel];
        const isSelected = this.selectedCafe()?.id === cafeId;
        marker.setIcon(createPolaroidIcon(cafe, { color: config.color, count: density.count }, isSelected));
        marker.setZIndexOffset(isSelected ? 1000 : 0);
    }

    private getUserLocation() {
        if (!navigator.geolocation) return;
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                this.ngZone.run(() => {
                    this.userLat.set(lat);
                    this.userLng.set(lng);
                });
                if (!this.initialPositionSet) {
                    this.initialPositionSet = true;
                    this.ngZone.run(() => this.map.setView([lat, lng], 14));
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                        .then(r => r.json())
                        .then((data: any) => {
                            const a = data.address;
                            const name = a.city || a.town || a.village || a.county || a.state || 'YOUR AREA';
                            this.ngZone.run(() => this.cityName.set(name.toUpperCase()));
                        })
                        .catch(() => {});
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
    }

    flyToUser() {
        const lat = this.userLat();
        const lng = this.userLng();
        if (lat !== null && lng !== null) {
            this.map.flyTo([lat, lng], 14, { animate: true, duration: 0.8 });
        }
    }

    async onMarkerClick(cafe: Cafe) {
        const prevId = this.selectedCafe()?.id;
        this.checkInSuccess.set(false);
        this.checkInStatus.set('loading');
        this.unsubscribeCafe?.();
        this.selectedCafe.set(cafe);
        this.isDrawerOpen.set(true);
        this.map.panTo([cafe.lat - 0.003, cafe.lng]);
        this.unsubscribeCafe = this.checkInService.watchCafe(cafe.id);

        // Refresh icons: deselect previous, select new
        if (prevId) this.refreshMarkerIcon(prevId);
        this.refreshMarkerIcon(cafe.id);

        const [isPresent, alreadyIn] = await Promise.all([
            this.checkInService.isCurrentlyPresent(cafe.id),
            this.checkInService.hasCheckedInToday(cafe.id),
        ]);
        if (isPresent) {
            this.checkInStatus.set('already');
        } else if (alreadyIn) {
            this.checkInStatus.set('was-here');
        } else {
            this.checkInStatus.set('ready');
        }
    }

    toggleSearch() {
        const opening = !this.searchOpen();
        this.searchOpen.set(opening);
        if (!opening) {
            this.cafeService.searchQuery.set('');
            this.refreshAllMarkers();
        }
    }

    onSearchInput(query: string) {
        this.cafeService.searchQuery.set(query);
        this.refreshAllMarkers();
        // Pan to first result
        const results = this.cafeService.filteredCafes();
        if (results.length > 0) {
            this.map.panTo([results[0].lat, results[0].lng], { animate: true });
        }
    }

    private refreshAllMarkers() {
        const cafes = this.cafeService.filteredCafes();
        this.markers.forEach((marker, id) => {
            const cafe = cafes.find(c => c.id === id);
            if (cafe) {
                marker.setOpacity(1);
            } else {
                marker.setOpacity(0.2);
            }
        });
    }

    closeDrawer() {
        const prevId = this.selectedCafe()?.id;
        this.isDrawerOpen.set(false);
        this.unsubscribeCafe?.();
        this.checkInService.activePeopleAtCafe.set([]);
        setTimeout(() => {
            this.selectedCafe.set(null);
            if (prevId) this.refreshMarkerIcon(prevId);
        }, 350);
    }

    async handleCheckIn() {
        const cafe = this.selectedCafe();
        if (!cafe || this.checkInStatus() !== 'ready') return;
        if (this.tooFarToCheckIn()) {
            const dist = this.formatDistance();
            this.toastService.show(`You're ${dist} — move within 50m to check in`, 'error');
            return;
        }
        this.isCheckingIn.set(true);
        try {
            await this.checkInService.checkIn(cafe.id, cafe.name);
            this.checkInSuccess.set(true);
            this.checkInStatus.set('already');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Check-in failed. Try again.';
            this.toastService.show(msg, 'error');
        } finally {
            this.isCheckingIn.set(false);
        }
    }

    async handleCheckOut() {
        if (this.isCheckingOut()) return;
        this.isCheckingOut.set(true);
        try {
            await this.checkInService.checkOut();
            this.checkInSuccess.set(false);
            this.checkInStatus.set('was-here');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not check out. Try again.';
            this.toastService.show(msg, 'error');
        } finally {
            this.isCheckingOut.set(false);
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
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
    CafeTag, WifiSpeed, CrowdLevel, NoiseLevel, OutletAvailability
} from '../../../core/models/cafe.model';
import { Location } from '@angular/common';
import {
    Storage, ref, uploadBytes, getDownloadURL
} from '@angular/fire/storage';

@Component({
    selector: 'app-add-cafe',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    templateUrl: './add-cafe.component.html',
})
export class AddCafeComponent {
    private cafeService = inject(CafeService);
    private toastService = inject(ToastService);
    private authService = inject(AuthService);
    private storage = inject(Storage);
    private router = inject(Router);
    private location = inject(Location);

    // ─── Required fields ───────────────────────────────────────────────
    name = signal('');
    address = signal('');

    // ─── Optional fields ───────────────────────────────────────────────
    openingHours = signal('');
    wifiSpeed = signal<WifiSpeed | ''>('');
    crowdLevel = signal<CrowdLevel | ''>('');
    noiseLevel = signal<NoiseLevel | ''>('');
    outletAvailability = signal<OutletAvailability | ''>('');
    isLateNight = signal(false);
    perksText = signal('');         // comma-separated
    selectedTags = signal<CafeTag[]>([]);
    googleMapsUrl = signal('');

    // ─── Photo upload ───────────────────────────────────────────────────
    photoPreviews = signal<string[]>([]);       // data URLs for preview
    photoFiles = signal<File[]>([]);            // raw File objects
    uploadingPhotos = signal(false);

    // ─── Form state ─────────────────────────────────────────────────────
    submitting = signal(false);
    submitted = signal(false);
    pointsEarned = signal(0);

    // ─── Validation ─────────────────────────────────────────────────────
    touched = signal(false);

    // ─── Static option lists ────────────────────────────────────────────
    readonly allTags: { tag: CafeTag; label: string; icon: string }[] = [
        { tag: 'wifi', label: 'WiFi', icon: 'wifi' },
        { tag: 'halal', label: 'Halal', icon: 'verified' },
        { tag: 'aesthetic', label: 'Aesthetic', icon: 'auto_awesome' },
        { tag: 'study', label: 'Study Zone', icon: 'book' },
        { tag: 'chill', label: 'Chill Vibes', icon: 'potted_plant' },
    ];
    readonly wifiOptions: WifiSpeed[] = ['Fast', 'Average', 'Slow', 'None'];
    readonly crowdOptions: CrowdLevel[] = ['Empty', 'Moderate', 'Packed'];
    readonly noiseOptions: NoiseLevel[] = ['Library Quiet', 'Chill Chatter', 'Loud'];
    readonly outletOptions: OutletAvailability[] = ['Many', 'Few', 'None'];

    // ─── Tag helpers ────────────────────────────────────────────────────
    toggleTag(tag: CafeTag) {
        this.selectedTags.update(tags =>
            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
        );
    }
    isTagSelected(tag: CafeTag): boolean {
        return this.selectedTags().includes(tag);
    }

    // ─── Photo helpers ──────────────────────────────────────────────────
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const newFiles = Array.from(input.files).slice(0, 4 - this.photoFiles().length);
        newFiles.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoPreviews.update(p => [...p, e.target!.result as string]);
            };
            reader.readAsDataURL(file);
            this.photoFiles.update(f => [...f, file]);
        });
        input.value = ''; // reset so same file can be re-added
    }

    removePhoto(index: number) {
        this.photoPreviews.update(p => p.filter((_, i) => i !== index));
        this.photoFiles.update(f => f.filter((_, i) => i !== index));
    }

    async uploadPhotos(): Promise<string[]> {
        const user = this.authService.currentUser();
        if (!user || this.photoFiles().length === 0) return [];
        const urls: string[] = [];
        for (const file of this.photoFiles()) {
            const path = `cafe-photos/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(this.storage, path);
            const snap = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snap.ref);
            urls.push(url);
        }
        return urls;
    }

    // ─── Extract lat/lng from Google Maps URL ───────────────────────────
    extractCoords(url: string): { lat: number; lng: number } | null {
        // Handles formats like:
        // https://maps.google.com/?q=3.1390,101.6869
        // https://www.google.com/maps/@3.1478,101.7125,17z
        // https://maps.app.goo.gl/... (short links — can't parse without redirect)
        const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,             // @lat,lng
            /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,         // ?q=lat,lng
            /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,         // ?ll=lat,lng
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
            }
        }
        return null;
    }

    onMapsUrlInput(value: string) {
        this.googleMapsUrl.set(value);
    }

    // ─── Validation ─────────────────────────────────────────────────────
    get nameErr(): string {
        return this.touched() && !this.name().trim() ? 'Cafe name is required' : '';
    }
    get addressErr(): string {
        return this.touched() && !this.address().trim() ? 'Address is required' : '';
    }

    canSubmit(): boolean {
        return this.name().trim().length > 0
            && this.address().trim().length > 0
            && !this.submitting();
    }

    // ─── Submit ──────────────────────────────────────────────────────────
    async submit() {
        this.touched.set(true);
        if (!this.canSubmit()) return;
        this.submitting.set(true);

        try {
            // 1. Upload photos
            this.uploadingPhotos.set(true);
            const photoUrls = await this.uploadPhotos();
            this.uploadingPhotos.set(false);

            // 2. Extract coordinates from Maps URL
            const mapsUrl = this.googleMapsUrl().trim();
            const coords = mapsUrl ? this.extractCoords(mapsUrl) : null;

            // 3. Parse perks
            const perks = this.perksText().trim()
                ? this.perksText().split(',').map(s => s.trim()).filter(Boolean)
                : [];

            // 4. Submit to service
            await this.cafeService.submitCafe({
                name: this.name().trim(),
                address: this.address().trim(),
                tags: this.selectedTags(),
                openingHours: this.openingHours().trim() || undefined,
                wifiSpeed: this.wifiSpeed() || undefined,
                crowdLevel: this.crowdLevel() || undefined,
                noiseLevel: this.noiseLevel() || undefined,
                outletAvailability: this.outletAvailability() || undefined,
                isLateNight: this.isLateNight(),
                perks,
                photos: photoUrls,
                googleMapsUrl: mapsUrl || undefined,
                lat: coords?.lat ?? 3.1390,
                lng: coords?.lng ?? 101.6869,
            });

            this.pointsEarned.set(100);
            this.submitted.set(true);
        } catch (err) {
            console.error(err);
            this.uploadingPhotos.set(false);
            this.toastService.show('Failed to submit. Please try again.', 'error');
        } finally {
            this.submitting.set(false);
        }
    }

    goBack() { this.location.back(); }
    goHome() { this.router.navigate(['/home']); }
}

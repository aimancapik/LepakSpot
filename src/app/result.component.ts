import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
      <style>
        .confetti-pattern {
            background-image: radial-gradient(#d48c3a 1px, transparent 1px), radial-gradient(#4a321f 1px, transparent 1px);
            background-size: 20px 20px;
            background-position: 0 0, 10px 10px;
            opacity: 0.1;
        }
      </style>
      <!-- Top Navigation -->
      <nav class="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-10 border-b border-primary/10">
        <button routerLink="/vote" class="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Result Revealed</h2>
        <button class="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
          <span class="material-symbols-outlined">share</span>
        </button>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col items-center px-6 pt-8 pb-24 relative overflow-hidden">
        <!-- Celebratory Header -->
        <div class="text-center mb-8 relative z-10">
          <div class="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/20 text-primary animate-bounce">
            <span class="material-symbols-outlined text-4xl">celebration</span>
          </div>
          <p class="text-primary font-bold uppercase tracking-widest text-sm mb-2">The Winner!</p>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">🎉 Congrats! 🎉</h1>
          <p class="text-slate-600 dark:text-slate-400">We've found the perfect spot for your coffee break.</p>
        </div>

        <!-- Featured Cafe Card -->
        <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-xl shadow-primary/5 border border-primary/10 relative z-10">
          <div class="h-56 bg-center bg-no-repeat bg-cover relative" data-alt="Interior of a modern cozy coffee shop with wooden tables" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBu0eZaRN2mapgj9foEeFq22uVYFYeaRsrm5xYM_fJzNdZNAOUQ4VPMcLat_-CRKMjaTTJAHdRswBYrx8UPPVtF9zDsMuPXpfcmuW3nYPXo_gsMY1ElZcnyhhKpNHme4I3dsMQs2CKk62Y7-ZZ81ddQeiu2JoIRi7vOSg5SBE1pMdvFcp7MofNVvqTgm6UJG5rHjsRUPxmxtSv6w2ZvPmDFQ5XM-_hZf2P5o7ZPibX8sZpsSlsBTW8xSOepOsN4ybb9NkrFmsaO7Ko");'>
            <div class="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
              <span class="text-sm font-bold">4.9</span>
            </div>
          </div>
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Kopi Lane</h3>
                <p class="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <span class="material-symbols-outlined text-sm">location_on</span>
                  123 Espresso Street, Brew City
                </p>
              </div>
              <div class="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter">
                Open Now
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <!-- Primary Action -->
              <a class="flex items-center justify-center gap-2 w-full py-4 bg-[#4a321f] hover:bg-[#3a2718] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#4a321f]/20" href="#">
                <span class="material-symbols-outlined">directions</span>
                Get Directions
              </a>
              <!-- Secondary Action -->
              <button class="flex items-center justify-center gap-2 w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary rounded-xl font-bold transition-all">
                <span class="material-symbols-outlined">check_circle</span>
                Check In When Arrived
              </button>
            </div>

            <!-- Subtle Amenities -->
            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between text-slate-400">
              <div class="flex flex-col items-center gap-1">
                <span class="material-symbols-outlined">wifi</span>
                <span class="text-[10px] font-medium">Free WiFi</span>
              </div>
              <div class="flex flex-col items-center gap-1">
                <span class="material-symbols-outlined">local_parking</span>
                <span class="text-[10px] font-medium">Parking</span>
              </div>
              <div class="flex flex-col items-center gap-1 text-primary">
                <span class="material-symbols-outlined">ev_station</span>
                <span class="text-[10px] font-medium">Charging</span>
              </div>
              <div class="flex flex-col items-center gap-1">
                <span class="material-symbols-outlined">pets</span>
                <span class="text-[10px] font-medium">Pet Friendly</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Confetti Background Overlay (Static representation) -->
        <div class="fixed inset-0 pointer-events-none confetti-pattern z-0"></div>
      </main>

      <!-- Bottom Navigation Bar -->
      <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 pb-6 pt-3 flex justify-between items-center z-20">
        <a routerLink="/" class="flex flex-col items-center gap-1 text-slate-400">
          <span class="material-symbols-outlined">home</span>
          <span class="text-[10px] font-semibold">Home</span>
        </a>
        <a routerLink="/create" class="flex flex-col items-center gap-1 text-primary">
          <span class="material-symbols-outlined fill-1">explore</span>
          <span class="text-[10px] font-semibold">Discover</span>
        </a>
        <a routerLink="/vote" class="flex flex-col items-center gap-1 text-slate-400">
          <span class="material-symbols-outlined">favorite</span>
          <span class="text-[10px] font-semibold">Favorites</span>
        </a>
        <a routerLink="/profile" class="flex flex-col items-center gap-1 text-slate-400">
          <span class="material-symbols-outlined">person</span>
          <span class="text-[10px] font-semibold">Profile</span>
        </a>
      </div>
    </div>
  `
})
export class ResultComponent {}

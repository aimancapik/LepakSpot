import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-vote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300 min-h-screen">
      <div class="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-background-dark shadow-xl overflow-x-hidden">
        <!-- Header -->
        <div class="flex items-center bg-white dark:bg-background-dark p-4 pb-2 justify-between border-b border-primary/10">
          <div routerLink="/create" class="text-primary flex size-12 shrink-0 items-center justify-start">
            <span class="material-symbols-outlined cursor-pointer">arrow_back</span>
          </div>
          <div class="flex flex-col items-center">
            <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">Afternoon Coffee</h2>
            <p class="text-primary text-xs font-medium">Group Vote</p>
          </div>
          <div class="flex w-12 items-center justify-end">
            <button class="flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">group</span>
            </button>
          </div>
        </div>

        <!-- Progress Section -->
        <div class="flex flex-col gap-3 p-4 bg-primary/5">
          <div class="flex gap-6 justify-between items-center">
            <p class="text-slate-800 dark:text-slate-200 text-sm font-semibold uppercase tracking-wider">Voting Progress</p>
            <div class="flex items-center gap-2">
              <span class="text-primary text-sm font-bold">3/5</span>
              <span class="text-slate-500 dark:text-slate-400 text-sm italic">voted</span>
            </div>
          </div>
          <div class="w-full bg-primary/20 rounded-full h-2">
            <div class="bg-primary h-2 rounded-full" style="width: 60%;"></div>
          </div>
        </div>

        <!-- Main Voting Card -->
        <div class="p-4 flex-1 flex flex-col justify-center">
          <div class="relative flex flex-col items-stretch justify-start rounded-xl shadow-lg bg-white dark:bg-slate-800 overflow-hidden border border-primary/10">
            <div class="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover" data-alt="Cozy modern cafe interior with warm lighting" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAAspe8KWqVNlmWcrSH99sZ4eP0dVXcL5bmvmDoKzdI8sFzNmExkWTUSSqK1QSqXbbluV_XDmMKEKadSomio7dMOItGzIsKEQx2PXKCPNE-y5sLhIXKnhgz02wt-2zSNC--neJZGkCbtFHakbUvrAtKDCKtjHdPqG_TUzQsLRpOl9GlbXxC1f5F4QWQ8_dchBxiRmGepIV7v7IES0IFHxYCl9YAiWslhIzRVBIIXprvrqeFsUCDvdZh5u5mlUg8MJErTkRpqlwrEDQ");'>
              <div class="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                <p class="text-primary text-xs font-bold">200m away</p>
              </div>
            </div>
            <div class="flex w-full flex-col items-stretch justify-center gap-3 p-6">
              <div>
                <h3 class="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight">Artisan Brew Café</h3>
                <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 italic">"Known for their signature honey lattes and warm atmosphere."</p>
              </div>
              <div class="flex gap-2 flex-wrap">
                <div class="flex h-7 items-center justify-center gap-x-1 rounded-lg bg-primary/10 px-3 border border-primary/20">
                  <span class="material-symbols-outlined text-primary text-sm">coffee</span>
                  <p class="text-primary text-xs font-bold">Coffee</p>
                </div>
                <div class="flex h-7 items-center justify-center gap-x-1 rounded-lg bg-primary/10 px-3 border border-primary/20">
                  <span class="material-symbols-outlined text-primary text-sm">cake</span>
                  <p class="text-primary text-xs font-bold">Pastries</p>
                </div>
                <div class="flex h-7 items-center justify-center gap-x-1 rounded-lg bg-primary/10 px-3 border border-primary/20">
                  <span class="material-symbols-outlined text-primary text-sm">wifi</span>
                  <p class="text-primary text-xs font-bold">Fast WiFi</p>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between border-t border-primary/10 pt-4">
                <div class="flex items-center gap-2">
                  <div class="flex -space-x-2">
                    <div class="size-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-300" data-alt="User avatar placeholder"></div>
                    <div class="size-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-400" data-alt="User avatar placeholder"></div>
                    <div class="size-7 rounded-full border-2 border-white dark:border-slate-800 bg-primary text-[10px] text-white flex items-center justify-center font-bold">+1</div>
                  </div>
                  <p class="text-slate-500 dark:text-slate-400 text-xs">Liked by Leo &amp; 2 others</p>
                </div>
                <button class="text-primary text-xs font-bold flex items-center gap-1">
                  DETAILS <span class="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Voting Actions -->
        <div class="px-8 pb-8 flex justify-center gap-12 items-center">
          <button class="size-16 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors group">
            <span class="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">thumb_down</span>
          </button>
          <button routerLink="/result" class="size-20 rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center justify-center text-white hover:scale-105 transition-transform">
            <span class="material-symbols-outlined text-4xl">thumb_up</span>
          </button>
          <button class="size-16 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary transition-colors group">
            <span class="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">star</span>
          </button>
        </div>

        <!-- Waiting Indicator -->
        <div class="px-4 py-3 bg-slate-50 dark:bg-background-dark/50 border-t border-primary/5">
          <div class="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <span>Waiting for Sarah and Mike</span>
            <div class="flex gap-1 items-center h-4">
              <span class="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
              <span class="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            </div>
          </div>
        </div>

        <!-- Bottom Navigation -->
        <div class="flex gap-2 border-t border-primary/10 bg-white dark:bg-background-dark px-4 pb-6 pt-2">
          <a routerLink="/" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">explore</span>
            <p class="text-xs font-medium">Explore</p>
          </a>
          <a routerLink="/create" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">groups</span>
            <p class="text-xs font-medium">Groups</p>
          </a>
          <a routerLink="/vote" class="flex flex-1 flex-col items-center justify-center gap-1 text-primary">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">how_to_vote</span>
            <p class="text-xs font-bold">Votes</p>
          </a>
          <a routerLink="/profile" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">person</span>
            <p class="text-xs font-medium">Profile</p>
          </a>
        </div>
      </div>
    </div>
  `
})
export class VoteComponent {}

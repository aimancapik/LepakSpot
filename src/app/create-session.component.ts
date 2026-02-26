import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-session',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <!-- Top Navigation -->
      <nav class="flex items-center bg-background-light dark:bg-background-dark p-4 justify-between sticky top-0 z-10">
        <button routerLink="/" class="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Create Session</h2>
      </nav>

      <!-- Header Section -->
      <header class="px-6 pt-6 pb-2">
        <h1 class="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center">Where to lepak?</h1>
        <p class="text-primary text-center font-medium mt-1">Pick a spot for the crew</p>
      </header>

      <!-- Horizontal Swipeable Café List -->
      <div class="mt-4">
        <div class="flex overflow-x-auto snap-x snap-mandatory [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 gap-4">
          <!-- Café 1 -->
          <div class="snap-center flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-primary/10">
            <div class="w-full h-80 bg-center bg-no-repeat bg-cover" data-alt="Cozy industrial cafe interior with warm lighting" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDuO5qt_BobsnjaEyyuF35KIClJtal1UZRmKtixFm4aFidMmmqSR5M9t2tREYrgUFKvakRTKA7U_7jwvA-InV09Qs3oWfEJNhchdRyKgHsNxYMRUrInYcZEH9-durbvnn-A6GR2MRJP8LWOz8h6aZnZJl5jQpUNt53hQWX4xIyQdR_rmqAUblf-Qa9GWrWv_CVgLf8xLeDo8_L_3ZoqEy26mWUCe2_oLLd-MPwYZ73TZm6skoUujHSwuYxS25w59TfXgsQbjL9Fi14");'></div>
            <div class="p-4">
              <div class="flex justify-between items-start">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold">The Daily Fix</h3>
                <span class="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">200m</span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
                <p class="text-slate-600 dark:text-slate-400 text-sm">4.8 • Artisan Coffee &amp; Brunch</p>
              </div>
            </div>
          </div>

          <!-- Café 2 -->
          <div class="snap-center flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-primary/10">
            <div class="w-full h-80 bg-center bg-no-repeat bg-cover" data-alt="Modern minimalist cafe with large glass windows" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4miGYfra0QKzU61LYxNgMpQGFOOzlmjgEw1S10vMt4fWA9ejs0BmU1bw6ltWTAy-jRKtoGLHzbckpsMD0nUQIzp1vsKMg7gkORRgowq1FySAgKHqhHXNRdRpxqfmYuYm1V_VRv_QOp4aO38YyWY3Lufq4IJ7W8Nn49AsQDqBQ7paZfnHFyBfYXFIGQtLXyUCVgSWn6EanzJ1HLJ6NtQXP6-KrnUCyYD9JB15zHTtzX4IyG07H3hKY3J4so6bURqK9iR3fIGe7f4M");'></div>
            <div class="p-4">
              <div class="flex justify-between items-start">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold">Common Man</h3>
                <span class="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">450m</span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
                <p class="text-slate-600 dark:text-slate-400 text-sm">4.6 • Speciality Roasters</p>
              </div>
            </div>
          </div>

          <!-- Café 3 -->
          <div class="snap-center flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-primary/10">
            <div class="w-full h-80 bg-center bg-no-repeat bg-cover" data-alt="Rustic cafe with brick walls and plants" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDl6AI6JDstrCdqiTv1w5RSv81nyO1sPBJdz3iGD0ndWaYyGRx0sAQyo7E6nGO2JxBrMJqFSahE8HWpZ7DNxUqgMFkPKngV8ad3KtyUEvPnd5SuJSwYBWOeWj643L6Rh5AgrSGFGnRaJ7V4S8sMsoSTzJPuLAwbIyR28jpmOVNRWP0Jv6-DqM_5Bbr-CmSNpwi9hf66NHHZJA7h-g-vFOroL3WOUWiI9FOrskejfMPwydNHdqCAHv0gQ3kaUuZyMNBuqo7wP8kRfho");'></div>
            <div class="p-4">
              <div class="flex justify-between items-start">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold">Merchant's Lane</h3>
                <span class="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">600m</span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
                <p class="text-slate-600 dark:text-slate-400 text-sm">4.5 • Heritage Vibes</p>
              </div>
            </div>
          </div>

          <!-- Café 4 -->
          <div class="snap-center flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-primary/10">
            <div class="w-full h-80 bg-center bg-no-repeat bg-cover" data-alt="Bustling cafe with baristas working at counter" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCJlJ3ZvLcK4sB9YSxHCC4YgF2so4VAgzs7DEU-pbbujqyzUikjfzdiRJqihnHF4o1VRPdCgw2wf290ExCP0doJT86a3BWHooZqKlvX-GX6_pkMn54lg4fa8kfrZkGN3AV0neZDroEO1wWvmACBhhdDpVgpMugTkkjI0ZzPUGLUb6McQELDrc5jjBQpuXhGysxuYmKX_07x6w1zl69TmbjaxoOXuOw-rifgsv9QEToG7Q65ivhEqqxUhX2KwLY5pnv0UUXSeuj5zwQ");'></div>
            <div class="p-4">
              <div class="flex justify-between items-start">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold">Pulp Roastery</h3>
                <span class="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">800m</span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
                <p class="text-slate-600 dark:text-slate-400 text-sm">4.7 • Expert Brews</p>
              </div>
            </div>
          </div>

          <!-- Café 5 -->
          <div class="snap-center flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-primary/10">
            <div class="w-full h-80 bg-center bg-no-repeat bg-cover" data-alt="Quiet cafe table with laptop and coffee" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFYLICZrIs9eXPw-boKryv-l-Y_aNcQeW1-0tma3cTCGf12pnhR3o9wuok-HHww9YXkJg3ZpOb5wqOTAiLnhbUd8SzPN0gEd0vYpGeN91vAIgzV2FQF44ZEQarS1LZPDNStyvtAO11khTXfZP0yHDt2oxQMVjv-i_TCc0JutOEBVhHdJjyJIfVF9QBYBhYWZm--Sfk2AvDCdDDVQdwhQhc5SPFpi58HA39ELFG1oJEe7-BGH7IysbkeqQaOcfxfR833EybeepB1gs");'></div>
            <div class="p-4">
              <div class="flex justify-between items-start">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold">VCR Café</h3>
                <span class="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">1.2km</span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-primary text-sm fill-1">star</span>
                <p class="text-slate-600 dark:text-slate-400 text-sm">4.6 • Work Friendly</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invite Friends Section -->
      <div class="mt-8 px-6 text-center">
        <h4 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Invite Friends</h4>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-primary/20 inline-block w-full max-w-sm">
          <p class="text-slate-600 dark:text-slate-400 text-xs mb-3">Share this code to join session</p>
          <div class="flex justify-center gap-2 mb-6">
            <!-- Character display for 'KOP1A3' -->
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">K</div>
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">O</div>
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">P</div>
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">1</div>
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">A</div>
            <div class="w-10 h-12 flex items-center justify-center border-b-2 border-primary text-2xl font-bold text-slate-900 dark:text-slate-100">3</div>
          </div>
          <button routerLink="/vote" class="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl w-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-primary/20">
            <span class="material-symbols-outlined">share</span>
            Share Invite Link
          </button>
        </div>
      </div>

      <!-- Bottom Members Section -->
      <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-primary/10 px-6 py-6 rounded-t-[2rem] shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <p class="text-slate-900 dark:text-slate-100 font-bold">Joining now (4)</p>
          <span class="text-primary text-xs font-semibold px-2 py-1 bg-primary/10 rounded-full animate-pulse">Waiting for others...</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- Member Avatars -->
          <div class="relative">
            <div class="w-14 h-14 rounded-full border-2 border-primary overflow-hidden">
              <img alt="User" class="w-full h-full object-cover" data-alt="Portrait of a smiling man" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaTtZRgG7ju7tLO-BnheAA_yxpon_VO77CdYMN5Q4TqH6QNK0_t6VtpK1k9jujOXieaO0vtoaCRxI4orTGr3iO71jUUBf4PXgp-Xcvq2ZxkDvrTsAJZanWRGVlaH3A9PztONIJfT-BJIlRcry6G8K4CVwGtoFbdnUr6DgQlA2SKDnVlXfnrZCYqAziYXc9wPFLYrXjF3Fjnoip4ZQAl8KEzIQHRuj-qiQ1mQvpH8Cbls3WFDfqWoNCfIt7RfDOvCq45PictyQyDQ8"/>
            </div>
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
          <div class="relative">
            <div class="w-14 h-14 rounded-full border-2 border-primary/30 overflow-hidden opacity-90">
              <img alt="User" class="w-full h-full object-cover" data-alt="Portrait of a young woman" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwQRCyW9cFuMPQJvQLtgntsGKXIeJ3l-v9W1vDwNh2BIAhqiRD8RgXSkZmc83tDdVAerhxOpPE3MchbvgZQktdQzkaziVP4sLN-zU3o0b4zq63ejptluYRwh2SvznWJcV-GMGcDK5hmkNuKR5jBNWWgUsHJd-wCE2iXeODsgBWKlESGn7ttc8RdeyfA-EV8vBWaZB2LqZM5WDw7N9BUQ1dC8cSdZc90wRSJmccgeim-jExWNjdes2K_w-deqN8YUATocf0hdXcv1Q"/>
            </div>
          </div>
          <div class="relative">
            <div class="w-14 h-14 rounded-full border-2 border-primary/30 overflow-hidden opacity-90">
              <img alt="User" class="w-full h-full object-cover" data-alt="Portrait of a man with glasses" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7hwgC46_hS7gm4Aj9AN4K8shQECzwSRmxYWSbuGYeHNG8lgFjhnaKImXJrnjZlqTNF3n3TcKuODhBAokiYCAkCjbuH5_gyRTAfK3v7ZRN7ZTG1b3ixsPY5lNr6w9aHhYlQJPFZiOsu6L32l_10_wkWU1T-ChjmmTRNNmx5Tzke9aDn8EwpV9YP31nC5Ga_4qa_YvChhZkbXskPCguWUhQDWGbuoFG3ICX2Q0rhdAEsQX-MiB8zR683dV8mqgGxqCjkXlqxYc8u_0"/>
            </div>
          </div>
          <div class="relative">
            <div class="w-14 h-14 rounded-full border-2 border-primary/30 overflow-hidden opacity-90">
              <img alt="User" class="w-full h-full object-cover" data-alt="Portrait of a woman smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_9a8xBvHY8MHEsZX_5PKYfJ58iXR0bGzMMmqza4EHaFG5T1XI4zeXR0k3Q2hYFyKYfeiC_dpp6Xk0Mo3PJE3aFbdbPR6SG4VlZAhDdex3J9y6LiSmFZjn8SUz5h3aN6ltldPuC-tLBF5QJdhPlFhVqJzoqVB5h8rbopVHRVwc2ynv7f0oJ4aiB04_TQ7z0cmjRPbNpQZAw8WPQxdisnLLe-5thIt29kQmR8gdd0OjJ8U7YsRjUu1QnFZxABfSq7dyGqzDYM1Kec0"/>
            </div>
          </div>
          <div class="w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary bg-primary/5">
            <span class="material-symbols-outlined">add</span>
          </div>
        </div>
      </div>

      <!-- Extra space for bottom nav -->
      <div class="h-32"></div>
    </div>
  `
})
export class CreateSessionComponent {}

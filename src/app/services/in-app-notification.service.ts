import { Injectable, signal } from '@angular/core';

export interface InAppNotice { id: number; title: string; message: string; }

@Injectable({ providedIn: 'root' })
export class InAppNotificationService {
  readonly notice = signal<InAppNotice | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sequence = 0;

  show(title: string, message: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.notice.set({ id: ++this.sequence, title, message });
    this.timer = setTimeout(() => this.notice.set(null), 3500);
  }

  dismiss(): void {
    if (this.timer) clearTimeout(this.timer);
    this.notice.set(null);
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InAppNotificationService } from './in-app-notification.service';
import { REALTIME_URL } from './push-config';

interface ChangeEvent { source: string; title: string; message: string; }

@Injectable({ providedIn: 'root' })
export class RealtimeEventsService {
  private readonly http = inject(HttpClient);
  private readonly notices = inject(InAppNotificationService);
  private readonly url = REALTIME_URL;
  private readonly source = crypto.randomUUID();
  private stream?: EventSource;
  readonly enabled = signal(true);

  constructor() {
    this.connect();
  }

  toggle(): void {
    this.enabled.update((enabled) => !enabled);
    if (this.enabled()) this.connect();
    else { this.stream?.close(); this.stream = undefined; }
  }

  private connect(): void {
    if (typeof EventSource === 'undefined' || this.stream) return;
    this.stream = new EventSource(`${this.url}?source=${encodeURIComponent(this.source)}`);
    this.stream.addEventListener('change', (raw) => {
      if (!this.enabled()) return;
      const event = JSON.parse((raw as MessageEvent<string>).data) as ChangeEvent;
      this.notices.show(event.title, event.message);
    });
  }

  publish(title: string, message: string): void {
    this.notices.show(title, message);
    this.http.post(this.url, { source: this.source, title, message }).subscribe({
      error: () => this.notices.show('Servidor en tiempo real desconectado', 'Inicia el servidor local para avisar a otras sesiones.'),
    });
  }
}

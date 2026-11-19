import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { InAppNotificationService } from './services/in-app-notification.service';
import { RealtimeEventsService } from './services/realtime-events.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly inAppNotice = inject(InAppNotificationService);
  readonly realtime = inject(RealtimeEventsService);
  readonly push = inject(PushNotificationService);
  toggleRealtimeNotices(): void { this.realtime.toggle(); }
  async togglePushSubscription(): Promise<void> {
    if (this.push.enabled()) await this.push.unsubscribe();
    else await this.push.subscribe();
  }
  title = 'pwa-angular';
  
  // Inyectamos el servicio como pÃºblico para poder usarlo en el HTML
}

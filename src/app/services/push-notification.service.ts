import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { PUSH_API_URL, VAPID_PUBLIC_KEY } from './push-config';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly http = inject(HttpClient);

  readonly isSupported = this.swPush.isEnabled;
  readonly enabled = signal(false);
  readonly lastResult = signal<string | null>(null);

  constructor() {
    this.checkSubscription();
  }
  async subscribe(): Promise<void> {
    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: VAPID_PUBLIC_KEY,
      });
      
      // CORREGIDO: Se agregaron las comillas invertidas (backticks) aquÃ­
      await firstValueFrom(this.http.post(`${PUSH_API_URL}/subscribe`, subscription));
      this.enabled.set(true);
      this.lastResult.set('SuscripciÃ³n exitosa.');
    } catch (error) {
      console.error('Error al suscribirse a notificaciones', error);
      this.lastResult.set('No se pudo suscribir. Revisa los permisos del navegador.');
    }
  }

  async unsubscribe(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = encodeURIComponent(subscription.endpoint);
      await firstValueFrom(this.http.delete(`${PUSH_API_URL}/subscribe?endpoint=${endpoint}`));
    }
    await subscription?.unsubscribe();
    this.enabled.set(false);
    this.lastResult.set('SuscripciÃ³n cancelada.');
  }

  async notify(title: string, body: string): Promise<void> {
    try {
      const notificationBody = `${body} MatrÃ­cula: 20223i101142.`;
      // CORREGIDO: Comillas invertidas en la URL y en el mensaje del final
      const response = await firstValueFrom(
        this.http.post<{ enviadas: number }>(`${PUSH_API_URL}/push`, { title, body: notificationBody }),
      );
      this.lastResult.set(`NotificaciÃ³n enviada a ${response.enviadas} suscripciÃ³n(es).`);
    } catch {
      this.lastResult.set('No se pudo enviar la notificaciÃ³n. Revisa que la API estÃ© activa.');
    }
  }

  private async checkSubscription(): Promise<void> {
    if (!this.isSupported) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      this.enabled.set(!!subscription);
      if (subscription) await firstValueFrom(this.http.post(`${PUSH_API_URL}/subscribe`, subscription));
    } catch (e) {
      console.warn('No se pudo verificar la suscripciÃ³n', e);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User, UserDraft, UserService } from '../../services/user';
import { RealtimeEventsService } from '../../services/realtime-events.service';
import { PushNotificationService } from '../../services/push-notification.service';

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  public readonly service = inject(UserService);
  private readonly realtime = inject(RealtimeEventsService);
  private readonly push = inject(PushNotificationService);
  readonly notice = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  formOpen = false;
  saving = false;
  editingId: number | null = null;
  selectedUser: User | null = null;
  draft: UserDraft = this.emptyDraft();

  private emptyDraft(): UserDraft {
    return {
      email: '', username: '', password: '', name: { firstname: '', lastname: '' },
      address: { city: '', street: '', number: 0, zipcode: '', geolocation: { lat: '0', long: '0' } },
      phone: '',
    };
  }

  constructor() {
    this.service.load();
  }

  notify(text: string, type: 'success' | 'error' = 'success'): void {
    this.notice.set({ text: `${text} MatrÃ­cula: 20223i101142.`, type });
    window.setTimeout(() => this.notice.set(null), 4000);
  }

  private notifyPush(text: string): void {
    this.realtime.publish('Cambios en usuarios', text);
    if (this.push.enabled()) void this.push.notify('Cambios en usuarios', text);
  }

  openCreate(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.formOpen = true;
  }

  openEdit(user: User): void {
    this.editingId = user.id;
    this.draft = {
      email: user.email, username: user.username, password: user.password, phone: user.phone,
      name: { ...user.name },
      address: { ...user.address, geolocation: { ...user.address.geolocation } },
    };
    this.formOpen = true;
  }

  closeForm(): void { this.formOpen = false; this.saving = false; }

  saveUser(): void {
    const data: UserDraft = {
      email: this.draft.email.trim(), username: this.draft.username.trim(), password: this.draft.password,
      name: { firstname: this.draft.name.firstname.trim(), lastname: this.draft.name.lastname.trim() },
      address: {
        city: this.draft.address.city.trim(), street: this.draft.address.street.trim(),
        number: Number(this.draft.address.number), zipcode: this.draft.address.zipcode.trim(),
        geolocation: { lat: this.draft.address.geolocation.lat.trim(), long: this.draft.address.geolocation.long.trim() },
      },
      phone: this.draft.phone.trim(),
    };
    this.saving = true;
    if (this.editingId !== null) {
      const id = this.editingId;
      this.service.update(id, data).subscribe({
        next: () => { this.closeForm(); this.notify('Usuario actualizado correctamente.'); this.notifyPush('Se actualizÃ³ un usuario.'); },
        error: () => { this.saving = false; this.notify('No se pudo actualizar el usuario.', 'error'); },
      });
    } else {
      this.service.create(data).subscribe({
        next: (created) => {
          this.closeForm(); this.notify('Usuario creado correctamente.'); this.notifyPush('Se creÃ³ un usuario.');
        },
        error: () => { this.saving = false; this.notify('No se pudo crear el usuario.', 'error'); },
      });
    }
  }

  deleteUser(user: User): void {
    if (!window.confirm(`Â¿Eliminar a ${user.name.firstname} ${user.name.lastname}?`)) return;
    this.service.delete(user.id).subscribe({
      next: () => { this.notify('Usuario eliminado correctamente.'); this.notifyPush('Se eliminÃ³ un usuario.'); },
      error: () => { this.notify('No se pudo eliminar el usuario.', 'error'); },
    });
  }

  showDetails(user: User): void {
    this.selectedUser = this.selectedUser?.id === user.id ? null : user;
    this.notify(this.selectedUser ? `Mostrando datos de ${user.username}.` : 'Detalle de usuario cerrado.');
  }
}

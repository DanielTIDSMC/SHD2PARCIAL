import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';

export interface User {
  id: number;
  email: string;
  username: string;
  password: string;
  name: { firstname: string; lastname: string };
  address: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
    geolocation: { lat: string; long: string };
  };
  phone: string;
}

export type UserDraft = Omit<User, 'id'>;

interface DummyUser {
  id: number; email: string; username: string; password?: string;
  firstName: string; lastName: string; phone: string;
  address: { address: string; city: string; postalCode: string; coordinates: { lat: number; lng: number } };
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly api = 'https://dummyjson.com/users';
  private readonly localKey = 'dummyjson-users-local';
  
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  load(): void {
    const cached = localStorage.getItem(this.localKey);
    if (cached) {
      try {
        this._users.set((JSON.parse(cached) as User[]).map((user) => this.normalize(user)));
        this.loading.set(false);
        this.error.set(null);
        return;
      } catch {
        localStorage.removeItem(this.localKey);
      }
    }
    this.loading.set(true);
    this.error.set(null);
    this.http.get<{ users: DummyUser[] }>(`${this.api}?limit=100`).subscribe({
      next: ({ users }) => {
        this._users.set(users.map((user) => this.fromApi(user)));
        this.persistLocal();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      }
    });
  }

  create(user: UserDraft): Observable<User> {
    this.saving.set(true);
    this.error.set(null);
    return this.http.post<DummyUser>(`${this.api}/add`, this.toApi(user)).pipe(
      tap({
        next: (created) => this.addLocal(this.fromApi({ ...created, id: created.id || Math.max(0, ...this._users().map((item) => item.id)) + 1 })),
        error: () => this.error.set('No se pudo crear el usuario. Intenta de nuevo.'),
      }),
      map((created) => this.fromApi(created)),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, user: UserDraft): Observable<User> {
    this.saving.set(true);
    this.error.set(null);
    return this.http.put<DummyUser>(`${this.api}/${id}`, { ...this.toApi(user), id }).pipe(
      tap({
        next: () => this.updateLocal(this.normalize({ ...user, id })),
        error: () => this.error.set('No se pudo actualizar el usuario. Intenta de nuevo.'),
      }),
      map((updated) => this.fromApi(updated)),
      finalize(() => this.saving.set(false)),
    );
  }

  delete(id: number): Observable<unknown> {
    this.error.set(null);
    return this.http.delete<unknown>(`${this.api}/${id}`).pipe(
      tap({
        next: () => this.removeLocal(id),
        error: () => this.error.set('No se pudo eliminar el usuario. Intenta de nuevo.'),
      }),
    );
  }

  addLocal(user: User): void {
    this._users.update((users) => [this.normalize(user), ...users]);
    this.persistLocal();
  }

  updateLocal(user: User): void {
    this._users.update((users) => users.map((item) => item.id === user.id ? this.normalize(user) : item));
    this.persistLocal();
  }

  removeLocal(id: number): void {
    this._users.update((users) => users.filter((item) => item.id !== id));
    this.persistLocal();
  }

  private persistLocal(): void {
    localStorage.setItem(this.localKey, JSON.stringify(this._users()));
  }

  private normalize(user: User): User {
    const value = user as Partial<User>;
    return {
      id: value.id ?? 0,
      email: value.email ?? '',
      username: value.username ?? '',
      password: value.password ?? '',
      name: { firstname: value.name?.firstname ?? '', lastname: value.name?.lastname ?? '' },
      phone: value.phone ?? '',
      address: {
        city: value.address?.city ?? '', street: value.address?.street ?? '',
        number: value.address?.number ?? 0, zipcode: value.address?.zipcode ?? '',
        geolocation: {
          lat: value.address?.geolocation?.lat ?? '0',
          long: value.address?.geolocation?.long ?? '0',
        },
      },
    };
  }

  private fromApi(user: DummyUser): User {
    return this.normalize({
      id: user.id, email: user.email, username: user.username, password: user.password ?? '',
      name: { firstname: user.firstName, lastname: user.lastName }, phone: user.phone,
      address: {
        city: user.address.city, street: user.address.address, number: 0,
        zipcode: user.address.postalCode,
        geolocation: { lat: String(user.address.coordinates.lat), long: String(user.address.coordinates.lng) },
      },
    });
  }

  private toApi(user: UserDraft) {
    return {
      email: user.email, username: user.username, password: user.password,
      firstName: user.name.firstname, lastName: user.name.lastname, phone: user.phone,
      address: user.address.street, city: user.address.city, postalCode: user.address.zipcode,
    };
  }
}

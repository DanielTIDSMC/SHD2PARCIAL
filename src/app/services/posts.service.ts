import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://jsonplaceholder.typicode.com/posts';
  private readonly cacheKey = 'jsonplaceholder-posts';
  readonly posts = signal<Post[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  loadPosts(): void {
    this.loading.set(true);
    this.error.set(null);
    this.getPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        try { localStorage.setItem(this.cacheKey, JSON.stringify(posts)); } catch { /* El Service Worker conserva su propia caché. */ }
        this.loading.set(false);
      },
      error: () => {
        try {
          const cached = localStorage.getItem(this.cacheKey);
          if (cached) {
            this.posts.set(JSON.parse(cached) as Post[]);
            this.error.set('Sin conexión: se muestran publicaciones guardadas.');
          } else {
            this.error.set('No se pudieron cargar las publicaciones. Revisa tu conexión.');
          }
        } catch {
          this.error.set('No se pudieron cargar las publicaciones guardadas.');
        }
        this.loading.set(false);
      },
    });
  }

  // El service worker cachea esta petición con la estrategia "freshness" (ver ngsw-config.json)
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl);
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${id}`);
  }
}

import { Component, inject } from '@angular/core';
import { PostsService } from '../../services/posts.service';

@Component({
  selector: 'app-posts-page',
  template: `
    <section class="catalog">
      <header class="catalog-head">
        <div><h1>Publicaciones</h1><p>Datos de JSONPlaceholder, una API pública independiente de FakeStore.</p></div>
        <button type="button" (click)="service.loadPosts()">Actualizar</button>
      </header>
      @if (service.loading()) { <p class="state">Cargando publicaciones...</p> }
      @if (service.error()) { <p class="state" role="status">{{ service.error() }}</p> }
      <div class="grid">
        @for (post of service.posts(); track post.id) {
          <article class="card"><span class="category">Publicación {{ post.id }} · Usuario {{ post.userId }}</span><h2>{{ post.title }}</h2><p>{{ post.body }}</p></article>
        } @empty {
          @if (!service.loading()) { <p class="state">Aún no hay publicaciones para mostrar.</p> }
        }
      </div>
    </section>
  `,
  styleUrl: '../acerca/products/products.css',
})
export class PostsPage {
  readonly service = inject(PostsService);

  constructor() { this.service.loadPosts(); }
}

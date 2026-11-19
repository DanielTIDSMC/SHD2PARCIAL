import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { Product } from '../core/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly api = 'https://dummyjson.com/products';

  private readonly _products = signal<Product[]>([]);
  private readonly _categories = signal<string[]>([]);
  private readonly _selectedCategory = signal<string>('all');
  private readonly localKey = 'dummyjson-products-local';

  // Reto 1: Filtramos los productos segÃºn la categorÃ­a
  readonly products = computed(() => {
    const cat = this._selectedCategory();
    if (cat === 'all') return this._products();
    return this._products().filter(p => p.category === cat);
  });

  readonly categories = this._categories.asReadonly();
  
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  
  // Reto 2: Signal para la fecha
  readonly ultimaActualizacion = signal(localStorage.getItem('ultimaActualizacion') || 'Cargando...');

  load(): void {
    const cached = localStorage.getItem(this.localKey);
    if (cached) {
      try {
        const products = JSON.parse(cached) as Product[];
        this._products.set(products);
        this._categories.set([...new Set(products.map((product) => product.category))]);
        this.loading.set(false);
        this.error.set(null);
        return;
      } catch {
        localStorage.removeItem(this.localKey);
      }
    }
    this.loading.set(true);
    this.error.set(null);

    // Reto 1: Cargar categorÃ­as
    this.http.get<{ products: Array<Omit<Product, 'image'> & { thumbnail: string }> }>(`${this.api}?limit=100`).subscribe({
      next: (response) => {
        const products: Product[] = response.products.map(({ thumbnail, ...product }) => ({ ...product, image: thumbnail }));
        this._products.set(products);
        this._categories.set([...new Set(products.map((product) => product.category))]);
        this.persistLocal();
        this.loading.set(false);
        
        // Reto 2: Guardar fecha
        const fecha = new Date().toLocaleString();
        localStorage.setItem('ultimaActualizacion', fecha);
        this.ultimaActualizacion.set(fecha);
      },
      error: () => {
        this.error.set('No se pudieron cargar los productos. Revisa tu conexiÃ³n.');
        this.loading.set(false);
      },
    });
  }

  create(product: Omit<Product, 'id'>): Observable<Product> {
    this.saving.set(true);
    this.error.set(null);
    return this.http.post<Product>(`${this.api}/add`, { ...product, thumbnail: product.image }).pipe(
      tap({
        next: (created) => this.addLocal({ ...product, id: created.id || Math.max(0, ...this._products().map((item) => item.id)) + 1 }),
        error: () => this.error.set('No se pudo crear el producto. Intenta de nuevo.'),
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, product: Omit<Product, 'id'>): Observable<Product> {
    this.saving.set(true);
    this.error.set(null);
    return this.http.put<Product>(`${this.api}/${id}`, { ...product, thumbnail: product.image, id }).pipe(
      tap({
        next: () => this.updateLocal({ ...product, id }),
        error: () => this.error.set('No se pudo actualizar el producto. Intenta de nuevo.'),
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  delete(id: number): Observable<unknown> {
    this.error.set(null);
    return this.http.delete<unknown>(`${this.api}/${id}`).pipe(
      tap({
        next: () => this.removeLocal(id),
        error: () => this.error.set('No se pudo eliminar el producto. Intenta de nuevo.'),
      }),
    );
  }

  addLocal(product: Product): void {
    this._products.update((products) => [product, ...products]);
    this.refreshCategories();
    this.persistLocal();
  }

  updateLocal(product: Product): void {
    this._products.update((products) => products.map((item) => item.id === product.id ? product : item));
    this.refreshCategories();
    this.persistLocal();
  }

  removeLocal(id: number): void {
    this._products.update((products) => products.filter((item) => item.id !== id));
    this.refreshCategories();
    this.persistLocal();
  }

  private persistLocal(): void {
    localStorage.setItem(this.localKey, JSON.stringify(this._products()));
  }

  private refreshCategories(): void {
    this._categories.set([...new Set(this._products().map((product) => product.category))]);
    this.persistLocal();
  }

  setCategory(category: string) {
    this._selectedCategory.set(category);
  }
}

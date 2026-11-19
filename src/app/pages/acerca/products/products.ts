import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../core/product.model';
import { RealtimeEventsService } from '../../../services/realtime-events.service';
import { PushNotificationService } from '../../../services/push-notification.service';

@Component({
  selector: 'app-products',
  imports: [CurrencyPipe, TitleCasePipe, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  public readonly service = inject(ProductService);
  private readonly realtime = inject(RealtimeEventsService);
  private readonly push = inject(PushNotificationService);
  formOpen = false;
  saving = false;
  editingId: number | null = null;
  selectedProduct: Product | null = null;
  productPendingDelete: Product | null = null;
  formError = '';
  draft = this.emptyDraft();

  constructor() {
    this.service.load();
  }

  private emptyDraft() {
    return { title: '', price: 0, description: '', category: '', image: '' };
  }

  openCreate(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.formError = '';
    this.formOpen = true;
  }

  openEdit(product: Product): void {
    this.editingId = product.id;
    this.draft = { title: product.title, price: product.price, description: product.description, category: product.category, image: product.image };
    this.formError = '';
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.saving = false;
  }

  saveProduct(): void {
    const data = { ...this.draft, price: Number(this.draft.price) };
    this.saving = true;
    this.formError = '';
    if (this.editingId !== null) {
      const id = this.editingId;
      this.service.update(id, data).subscribe({
        next: () => { this.closeForm(); this.notifyPush('Producto actualizado', `Se actualizÃ³: ${data.title}.`); },
        error: () => { this.saving = false; },
      });
    } else {
      this.service.create(data).subscribe({
        next: () => { this.closeForm(); this.notifyPush('Producto creado', `Se agregÃ³: ${data.title}.`); },
        error: () => { this.saving = false; },
      });
    }
  }

  deleteProduct(product: Product): void {
    this.productPendingDelete = product;
  }

  cancelDelete(): void { this.productPendingDelete = null; }

  confirmDelete(): void {
    const product = this.productPendingDelete;
    if (!product) return;
    this.productPendingDelete = null;
    this.service.delete(product.id).subscribe({
      next: () => this.notifyPush('Producto eliminado', `Se eliminó: ${product.title}.`),
    });
  }

  private notifyPush(title: string, message: string): void {
    this.realtime.publish(title, message);
    if (this.push.enabled()) void this.push.notify(title, message);
  }

  reload(): void {
    this.service.load();
  }

  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.service.setCategory(select.value);
  }
}

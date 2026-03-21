/**
 * Order Entity
 * @description Types for billing history items
 */

export interface OrderItem {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  productName: string;
  invoiceUrl?: string;
}

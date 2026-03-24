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

// Restaurant Management System Types

export type TableStatus = "available" | "serving" | "payment";

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  status: "available" | "unavailable";
  image?: string;
}

export type OrderItemStatus = "pending" | "submitted" | "cooking" | "done";

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  status: OrderItemStatus;
  notes?: string;
  staffName?: string;
  tableNumber?: number;
  createdAt?: Date;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
  id: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paidAt: Date;
  staffName: string;
}

export type UserRole = "admin" | "staff" | "chef";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

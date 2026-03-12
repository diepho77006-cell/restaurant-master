// Restaurant state management using React context
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Table, MenuItem, Order, OrderItem, Bill, User, TableStatus, OrderItemStatus } from "@/types/restaurant";

// Sample menu data
const sampleMenu: MenuItem[] = [
  { id: "m1", name: "Phở Bò", price: 55000, category: "Món chính", status: "available" },
  { id: "m2", name: "Bún Chả", price: 50000, category: "Món chính", status: "available" },
  { id: "m3", name: "Cơm Tấm", price: 45000, category: "Món chính", status: "available" },
  { id: "m4", name: "Gỏi Cuốn (2 cuốn)", price: 30000, category: "Khai vị", status: "available" },
  { id: "m5", name: "Chả Giò (4 cái)", price: 35000, category: "Khai vị", status: "available" },
  { id: "m6", name: "Canh Chua Cá", price: 65000, category: "Món chính", status: "available" },
  { id: "m7", name: "Bò Lúc Lắc", price: 85000, category: "Món chính", status: "available" },
  { id: "m8", name: "Trà Đá", price: 5000, category: "Đồ uống", status: "available" },
  { id: "m9", name: "Cà Phê Sữa Đá", price: 25000, category: "Đồ uống", status: "available" },
  { id: "m10", name: "Nước Ép Cam", price: 30000, category: "Đồ uống", status: "available" },
  { id: "m11", name: "Kem Dừa", price: 25000, category: "Tráng miệng", status: "available" },
  { id: "m12", name: "Chè Bưởi", price: 20000, category: "Tráng miệng", status: "available" },
];

// Sample tables
const sampleTables: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  seats: i < 4 ? 2 : i < 8 ? 4 : 6,
  status: "available" as TableStatus,
}));

interface RestaurantState {
  // Auth
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, "id">) => boolean;
  deleteUser: (id: string) => void;

  // Tables
  tables: Table[];
  addTable: (seats: number) => void;
  updateTable: (id: string, data: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  clearTable: (id: string) => void;
  transferTable: (fromId: string, toId: string) => void;

  // Menu
  menu: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  // Orders
  orders: Record<string, Order>; // keyed by tableId
  addOrderItem: (tableId: string, menuItem: MenuItem, quantity: number) => void;
  removeOrderItem: (tableId: string, itemId: string) => void;
  updateOrderItemQuantity: (tableId: string, itemId: string, quantity: number) => void;
  updateOrderItemNotes: (tableId: string, itemId: string, notes: string) => void;
  submitOrder: (tableId: string) => void;
  updateOrderItemStatus: (tableId: string, itemId: string, status: OrderItemStatus) => void;

  // Bills
  bills: Bill[];
  clearBills: () => void;
  processPayment: (tableId: string) => void;

  // Kitchen
  getKitchenOrders: () => { tableNumber: number; tableId: string; item: OrderItem }[];
}

const defaultUsers: User[] = [
  { id: "u1", name: "Admin", email: "admin@resto.com", role: "admin" },
  { id: "u2", name: "Nhân viên A", email: "staff@resto.com", role: "staff" },
  { id: "u3", name: "Đầu bếp B", email: "chef@resto.com", role: "chef" },
];

let idCounter = 100;
const genId = () => `id_${++idCounter}`;

export const useRestaurantStore = create<RestaurantState>()(persist((set, get) => ({
  currentUser: null,
  users: defaultUsers,

  login: (email, _password) => {
    const user = get().users.find((u) => u.email === email);
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },

  logout: () => set({ currentUser: null }),

  addUser: (userData) => {
    const existing = get().users.find((u) => u.email === userData.email);
    if (existing) return false;
    set((s) => ({ users: [...s.users, { ...userData, id: genId() }] }));
    return true;
  },

  deleteUser: (id) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  tables: sampleTables,

  addTable: (seats) => {
    set((s) => {
      const maxNum = s.tables.reduce((max, t) => Math.max(max, t.number), 0);
      return {
        tables: [...s.tables, { id: genId(), number: maxNum + 1, seats, status: "available" }],
      };
    });
  },

  updateTable: (id, data) => {
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  deleteTable: (id) => {
    set((s) => ({
      tables: s.tables.filter((t) => t.id !== id),
    }));
  },

  clearTable: (id) => {
    set((s) => {
      const newOrders = { ...s.orders };
      delete newOrders[id];
      return {
        tables: s.tables.map((t) => (t.id === id ? { ...t, status: "available" } : t)),
        orders: newOrders,
      };
    });
  },

  transferTable: (fromId, toId) => {
    set((s) => {
      const order = s.orders[fromId];
      if (!order) return s;
      const newOrders = { ...s.orders };
      delete newOrders[fromId];
      newOrders[toId] = { ...order, tableId: toId };
      return {
        orders: newOrders,
        tables: s.tables.map((t) => {
          if (t.id === fromId) return { ...t, status: "available" };
          if (t.id === toId) return { ...t, status: s.tables.find((x) => x.id === fromId)?.status || "serving" };
          return t;
        }),
      };
    });
  },

  menu: sampleMenu,

  addMenuItem: (item) => {
    set((s) => ({ menu: [...s.menu, { ...item, id: genId() }] }));
  },

  updateMenuItem: (id, data) => {
    set((s) => ({ menu: s.menu.map((m) => (m.id === id ? { ...m, ...data } : m)) }));
  },

  deleteMenuItem: (id) => {
    set((s) => ({ menu: s.menu.filter((m) => m.id !== id) }));
  },

  orders: {},

  addOrderItem: (tableId, menuItem, quantity) => {
    set((s) => {
      const order = s.orders[tableId] || {
        id: genId(),
        tableId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const table = s.tables.find((t) => t.id === tableId);
      const existing = order.items.find((i) => i.menuItem.id === menuItem.id && i.status === "pending");
      let newItems: OrderItem[];
      if (existing) {
        newItems = order.items.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...order.items, {
          id: genId(),
          menuItem,
          quantity,
          status: "pending",
          staffName: s.currentUser?.name || "Unknown",
          tableNumber: table?.number,
          createdAt: new Date(),
        }];
      }
      return {
        orders: {
          ...s.orders,
          [tableId]: { ...order, items: newItems, updatedAt: new Date() },
        },
        tables: s.tables.map((t) =>
          t.id === tableId && t.status === "available" ? { ...t, status: "serving" } : t
        ),
      };
    });
  },

  removeOrderItem: (tableId, itemId) => {
    set((s) => {
      const order = s.orders[tableId];
      if (!order) return s;
      const item = order.items.find((i) => i.id === itemId);
      if (!item || item.status !== "pending") return s; // can't remove submitted/cooking/done items
      const newItems = order.items.filter((i) => i.id !== itemId);
      return {
        orders: {
          ...s.orders,
          [tableId]: { ...order, items: newItems, updatedAt: new Date() },
        },
      };
    });
  },

  updateOrderItemQuantity: (tableId, itemId, quantity) => {
    set((s) => {
      const order = s.orders[tableId];
      if (!order) return s;
      const item = order.items.find((i) => i.id === itemId);
      if (!item || item.status !== "pending") return s;
      return {
        orders: {
          ...s.orders,
          [tableId]: {
            ...order,
            items: order.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  submitOrder: (tableId) => {
    set((s) => {
      const order = s.orders[tableId];
      if (!order) return s;
      return {
        orders: {
          ...s.orders,
          [tableId]: {
            ...order,
            items: order.items.map((i) => (i.status === "pending" ? { ...i, status: "submitted" } : i)),
            updatedAt: new Date(),
          },
        },
        tables: s.tables.map((t) =>
          t.id === tableId ? { ...t, status: "serving" } : t
        ),
      };
    });
  },

  updateOrderItemStatus: (tableId, itemId, status) => {
    set((s) => {
      const order = s.orders[tableId];
      if (!order) return s;
      return {
        orders: {
          ...s.orders,
          [tableId]: {
            ...order,
            items: order.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  bills: [],

  clearBills: () => set({ bills: [] }),

  processPayment: (tableId) => {
    set((s) => {
      const order = s.orders[tableId];
      const table = s.tables.find((t) => t.id === tableId);
      if (!order || !table) return s;
      const bill: Bill = {
        id: genId(),
        tableNumber: table.number,
        items: order.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
        total: order.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0),
        paidAt: new Date(),
        staffName: s.currentUser?.name || "Unknown",
      };
      const newOrders = { ...s.orders };
      delete newOrders[tableId];
      return {
        bills: [bill, ...s.bills],
        orders: newOrders,
        tables: s.tables.map((t) =>
          t.id === tableId ? { ...t, status: "available" } : t
        ),
      };
    });
  },

  getKitchenOrders: () => {
    const { orders, tables } = get();
    const kitchenItems: { tableNumber: number; tableId: string; item: OrderItem }[] = [];
    (Object.entries(orders) as [string, Order][]).forEach(([tableId, order]) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;
      order.items
        .filter((i) => i.status === "submitted" || i.status === "cooking")
        .forEach((item) => {
          kitchenItems.push({ tableNumber: table.number, tableId, item });
        });
    });
    return kitchenItems;
  },

  updateOrderItemNotes: (tableId, itemId, notes) => {
    set((s) => {
      const order = s.orders[tableId];
      if (!order) return s;
      return {
        orders: {
          ...s.orders,
          [tableId]: {
            ...order,
            items: order.items.map((i) => (i.id === itemId ? { ...i, notes } : i)),
            updatedAt: new Date(),
          },
        },
      };
    });
  },
}), {
  name: "restaurant-store",
  version: 3,
  partialize: (state) => ({
    currentUser: state.currentUser,
    users: state.users,
    tables: state.tables,
    menu: state.menu,
    orders: state.orders,
    bills: state.bills,
  }),
}));

// Cross-tab sync: listen for storage changes from other tabs
let _isSyncing = false;

if (typeof window !== "undefined") {
  // Use BroadcastChannel for instant same-origin sync (no ping-pong)
  const channel = new BroadcastChannel("restaurant-sync");

  // Notify other tabs on every state change
  useRestaurantStore.subscribe((state) => {
    if (_isSyncing) return;
    channel.postMessage({
      tables: state.tables,
      menu: state.menu,
      orders: state.orders,
      bills: state.bills,
      users: state.users,
    });
  });

  // Receive updates from other tabs
  channel.onmessage = (event) => {
    _isSyncing = true;
    const currentUser = useRestaurantStore.getState().currentUser;
    useRestaurantStore.setState({
      ...event.data,
      currentUser, // keep current tab's login session
    });
    // Use setTimeout to ensure persist middleware finishes before we allow new broadcasts
    setTimeout(() => { _isSyncing = false; }, 50);
  };

  // Fallback: storage event for tabs that missed BroadcastChannel
  window.addEventListener("storage", (e) => {
    if (e.key === "restaurant-store" && e.newValue && !_isSyncing) {
      try {
        _isSyncing = true;
        const parsed = JSON.parse(e.newValue);
        if (parsed?.state) {
          const currentUser = useRestaurantStore.getState().currentUser;
          useRestaurantStore.setState({
            ...parsed.state,
            currentUser,
          });
        }
        setTimeout(() => { _isSyncing = false; }, 50);
      } catch {
        _isSyncing = false;
      }
    }
  });
}

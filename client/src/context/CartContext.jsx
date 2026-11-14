import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function storageKey(userId) {
  return `canteen-cart-${userId}`;
}

function readCart(userId) {
  if (!userId) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cartUserId, setCartUserId] = useState(null);

  useEffect(() => {
    const nextUserId = user?.role === 'student' ? user.id : null;
    setItems(nextUserId ? readCart(nextUserId) : []);
    setCartUserId(nextUserId);
  }, [user]);

  useEffect(() => {
    if (user?.role === 'student' && cartUserId === user.id) {
      localStorage.setItem(storageKey(user.id), JSON.stringify(items));
    }
  }, [cartUserId, items, user]);

  const updateItems = useCallback((updater) => {
    setItems((current) => updater(current));
  }, []);

  const addItem = useCallback((menuItem) => {
    if (!menuItem.isAvailable) return;
    updateItems((current) => {
      const existing = current.find((item) => item.menuItemId === menuItem._id);
      if (existing) {
        return current.map((item) =>
          item.menuItemId === menuItem._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...current,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
        },
      ];
    });
  }, [updateItems]);

  const changeQuantity = useCallback((menuItemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    updateItems((current) =>
      current.map((item) =>
        item.menuItemId === menuItemId ? { ...item, quantity } : item
      )
    );
  }, [updateItems]);

  const removeItem = useCallback((menuItemId) => {
    updateItems((current) => current.filter((item) => item.menuItemId !== menuItemId));
  }, [updateItems]);

  const clearCart = useCallback(() => setItems([]), []);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, total, itemCount, addItem, changeQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

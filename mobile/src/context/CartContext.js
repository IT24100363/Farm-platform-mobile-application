import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addItem = (product, quantity = 1) => {
    setItems((current) => {
      const exists = current.find((item) => item.productId === product._id);
      if (exists) {
        return current.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...current,
        {
          productId: product._id,
          product,
          quantity,
          farmerId: product.farmerId?._id || product.farmerId
        }
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    setItems((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clearCart, total }),
    [items, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

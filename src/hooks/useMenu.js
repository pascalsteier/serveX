import { useState, useEffect } from 'react';
import { MENU_ITEMS as INITIAL_MENU } from '../data/menu';

const STORAGE_KEY = 'servex_menu';

export function useMenu() {
    const [menuItems, setMenuItems] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : INITIAL_MENU;
    });

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                setMenuItems(e.newValue ? JSON.parse(e.newValue) : INITIAL_MENU);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const updateMenuStorage = (newItems) => {
        setMenuItems(newItems);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
        window.dispatchEvent(new Event('menu-storage-update'));
    };

    // Listen for local updates
    useEffect(() => {
        const handleLocalUpdate = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setMenuItems(JSON.parse(saved));
        }
        window.addEventListener('menu-storage-update', handleLocalUpdate);
        return () => window.removeEventListener('menu-storage-update', handleLocalUpdate);
    }, []);

    // Initialize stock if missing (migration for existing data)
    useEffect(() => {
        const hasMissingStock = menuItems.some(item => item.stock === undefined);
        if (hasMissingStock) {
            const updatedItems = menuItems.map(item => ({
                ...item,
                stock: item.stock !== undefined ? item.stock : 20 // Default stock
            }));
            updateMenuStorage(updatedItems);
        }
    }, []);

    // Migrate from single price to dual pricing (migration for existing data)
    useEffect(() => {
        const hasSinglePrice = menuItems.some(item => item.price !== undefined && (item.priceMidi === undefined || item.priceSoir === undefined));
        if (hasSinglePrice) {
            const updatedItems = menuItems.map(item => ({
                ...item,
                priceMidi: item.priceMidi !== undefined ? item.priceMidi : (item.price || 0),
                priceSoir: item.priceSoir !== undefined ? item.priceSoir : (item.price || 0),
                price: undefined // Remove old price field
            }));
            updateMenuStorage(updatedItems);
        }
    }, []);

    // Migration: Update categories and add new items
    useEffect(() => {
        let hasChanges = false;
        let updatedItems = [...menuItems];

        // 1. Update categories for existing items based on INITIAL_MENU
        updatedItems = updatedItems.map(item => {
            const initialItem = INITIAL_MENU.find(i => i.id === item.id);
            if (initialItem && item.category !== initialItem.category) {
                hasChanges = true;
                return { ...item, category: initialItem.category };
            }
            return item;
        });

        // 2. Add missing items from INITIAL_MENU
        INITIAL_MENU.forEach(initialItem => {
            if (!updatedItems.find(item => item.id === initialItem.id)) {
                hasChanges = true;
                updatedItems.push({ ...initialItem, stock: 20 }); // Default stock for new items
            }
        });

        if (hasChanges) {
            updateMenuStorage(updatedItems);
        }
    }, []);

    const addMenuItem = (item) => {
        const newItem = { ...item, id: Date.now(), stock: 20 };
        updateMenuStorage([...menuItems, newItem]);
    };

    const removeMenuItem = (id) => {
        updateMenuStorage(menuItems.filter(item => item.id !== id));
    };

    const updateMenuItem = (id, updates) => {
        updateMenuStorage(menuItems.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const updateItemStock = (id, newStock) => {
        updateMenuStorage(menuItems.map(item => item.id === id ? { ...item, stock: newStock } : item));
    };

    const decrementStock = (orderedItems) => {
        const itemCounts = {};
        orderedItems.forEach(item => {
            itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
        });

        const updatedItems = menuItems.map(item => {
            if (itemCounts[item.id]) {
                return { ...item, stock: Math.max(0, item.stock - itemCounts[item.id]) };
            }
            return item;
        });
        updateMenuStorage(updatedItems);
    };

    const incrementStock = (orderedItems) => {
        const itemCounts = {};
        orderedItems.forEach(item => {
            itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
        });

        const updatedItems = menuItems.map(item => {
            if (itemCounts[item.id]) {
                return { ...item, stock: item.stock + itemCounts[item.id] };
            }
            return item;
        });
        updateMenuStorage(updatedItems);
    };

    return { menuItems, addMenuItem, removeMenuItem, updateMenuItem, updateItemStock, decrementStock, incrementStock };
}

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'servex_orders';

export function useOrders() {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                setOrders(e.newValue ? JSON.parse(e.newValue) : []);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const updateOrders = (newOrders) => {
        setOrders(newOrders);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
        // Dispatch a custom event so the current tab also updates (storage event only fires for other tabs)
        window.dispatchEvent(new Event('local-storage-update'));
    };

    // Listen for local updates too
    useEffect(() => {
        const handleLocalUpdate = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setOrders(JSON.parse(saved));
            }
        }
        window.addEventListener('local-storage-update', handleLocalUpdate);
        return () => window.removeEventListener('local-storage-update', handleLocalUpdate);
    }, [])


    const addOrder = (items, tableNumber, notes, servicePeriod = 'Midi', coverCount = 2, orderType = 'dine-in') => {
        const newOrder = {
            id: Date.now(),
            tableNumber: tableNumber || 'N/A',
            notes: notes || '',
            servicePeriod: servicePeriod,
            coverCount: coverCount,
            orderType: orderType,
            items: items.map((item, index) => ({
                ...item,
                instanceId: `${Date.now()}-${index}`, // Unique ID for this specific item instance
                status: 'Pending'
            })),
            status: 'Pending', // Overall status
            courseStatus: {
                starter: 'Pending',
                main: 'Pending',
                cheese: 'Pending',
                dessert: 'Pending'
            },
            timestamp: new Date().toISOString(),
        };
        updateOrders([...orders, newOrder]);
    };

    const updateItemStatus = (orderId, itemInstanceId, newStatus) => {
        const newOrders = orders.map(order => {
            if (order.id !== orderId) return order;

            const newItems = order.items.map(item =>
                item.instanceId === itemInstanceId ? { ...item, status: newStatus } : item
            );

            // Derive order status from items
            const allServed = newItems.every(i => i.status === 'Served');
            const allReadyOrServed = newItems.every(i => ['Ready', 'Served'].includes(i.status));
            const anyCooking = newItems.some(i => i.status === 'Cooking');

            let orderStatus = order.status;
            if (allServed) orderStatus = 'Served';
            else if (allReadyOrServed) orderStatus = 'Ready';
            else if (anyCooking) orderStatus = 'Cooking';
            // If some are ready but others pending, it's technically "Cooking" or "In Progress"
            else if (newItems.some(i => i.status !== 'Pending')) orderStatus = 'Cooking';

            return { ...order, items: newItems, status: orderStatus };
        });
        updateOrders(newOrders);
    };

    const updateOrderStatus = (orderId, newStatus) => {
        const newOrders = orders.map(order => {
            if (order.id !== orderId) return order;

            // If updating order status directly, update all items to match (convenience)
            const newItems = order.items.map(item => ({ ...item, status: newStatus }));
            return { ...order, status: newStatus, items: newItems };
        });
        updateOrders(newOrders);
    };

    const updateCourseStatus = (orderId, course, newStatus) => {
        const newOrders = orders.map(order => {
            if (order.id !== orderId) return order;

            const newCourseStatus = { ...order.courseStatus, [course]: newStatus };

            let newOrderStatus = order.status;
            // If the order was Pending and a course is now Ready (or Cooking), move order to Cooking
            if (order.status === 'Pending' && (newStatus === 'Ready' || newStatus === 'Cooking')) {
                newOrderStatus = 'Cooking';
            }

            return { ...order, courseStatus: newCourseStatus, status: newOrderStatus };
        });
        updateOrders(newOrders);
    };

    const deleteOrder = (orderId) => {
        const newOrders = orders.filter(order => order.id !== orderId);
        updateOrders(newOrders);
    };

    const updateOrder = (orderId, updatedOrderData) => {
        const newOrders = orders.map(order => {
            if (order.id !== orderId) return order;
            return { ...order, ...updatedOrderData };
        });
        updateOrders(newOrders);
    };

    return { orders, addOrder, updateOrderStatus, updateItemStatus, deleteOrder, updateOrder, updateCourseStatus };
}

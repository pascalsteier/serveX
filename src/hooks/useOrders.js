import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'servex_orders';

export function useOrders() {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const isLocalUpdate = useRef(false);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                setOrders(e.newValue ? JSON.parse(e.newValue) : []);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Sync to localStorage when orders change, but only if it was a local update
    useEffect(() => {
        if (isLocalUpdate.current) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            // Dispatch a custom event so the current tab also updates (storage event only fires for other tabs)
            window.dispatchEvent(new Event('local-storage-update'));
            isLocalUpdate.current = false;
        }
    }, [orders]);

    const updateOrders = (newOrdersOrFn) => {
        isLocalUpdate.current = true;
        setOrders(newOrdersOrFn);
    };

    // Listen for local updates too
    useEffect(() => {
        const handleLocalUpdate = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                // We don't set isLocalUpdate to true here to avoid loop
                setOrders(JSON.parse(saved));
            }
        }
        window.addEventListener('local-storage-update', handleLocalUpdate);
        return () => window.removeEventListener('local-storage-update', handleLocalUpdate);
    }, [])


    const addOrder = (items, tableNumber, notes, servicePeriod = 'Midi', coverCount = 2, orderType = 'dine-in') => {
        updateOrders(prevOrders => {
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
            return [...prevOrders, newOrder];
        });
    };

    const updateItemStatus = (orderId, itemInstanceId, newStatus) => {
        updateOrders(prevOrders => prevOrders.map(order => {
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
        }));
    };

    const updateOrderStatus = (orderId, newStatus) => {
        updateOrders(prevOrders => prevOrders.map(order => {
            if (order.id !== orderId) return order;

            // If updating order status directly, update all items to match (convenience)
            const newItems = order.items.map(item => ({ ...item, status: newStatus }));
            return { ...order, status: newStatus, items: newItems };
        }));
    };

    const updateCourseStatus = (orderId, course, newStatus) => {
        updateOrders(prevOrders => prevOrders.map(order => {
            if (order.id !== orderId) return order;

            const newCourseStatus = { ...order.courseStatus, [course]: newStatus };

            let newOrderStatus = order.status;
            // If the order was Pending and a course is now Ready (or Cooking), move order to Cooking
            if (order.status === 'Pending' && (newStatus === 'Ready' || newStatus === 'Cooking')) {
                newOrderStatus = 'Cooking';
            }

            return { ...order, courseStatus: newCourseStatus, status: newOrderStatus };
        }));
    };

    const deleteOrder = (orderId) => {
        updateOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    };

    const updateOrder = (orderId, updatedOrderData) => {
        updateOrders(prevOrders => prevOrders.map(order => {
            if (order.id !== orderId) return order;
            return { ...order, ...updatedOrderData };
        }));
    };

    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('servex_sessions');
        return saved ? JSON.parse(saved) : [];
    });

    const [serviceStartTime, setServiceStartTime] = useState(() => {
        const saved = localStorage.getItem('servex_service_start');
        return saved ? JSON.parse(saved) : null;
    });

    // Sync sessions to localStorage
    useEffect(() => {
        localStorage.setItem('servex_sessions', JSON.stringify(sessions));
    }, [sessions]);

    // Sync serviceStartTime to localStorage
    useEffect(() => {
        if (serviceStartTime) {
            localStorage.setItem('servex_service_start', JSON.stringify(serviceStartTime));
        } else {
            localStorage.removeItem('servex_service_start');
        }
    }, [serviceStartTime]);


    const startService = () => {
        // Optional: Check if orders are empty or prompt?
        // For now, we assume starting service might continue with existing orders or user cleared them manually.
        // But typically, starting a NEW service implies a fresh start.
        // Let's just set the start time.
        if (!serviceStartTime) {
            setServiceStartTime(Date.now());
        }
    };

    const endService = () => {
        if (!serviceStartTime) return;

        const endTime = Date.now();
        const currentOrders = [...orders];

        // Calculate Metrics
        const totalRevenue = currentOrders.reduce((total, order) => {
            const orderTotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            return total + orderTotal;
        }, 0);

        const totalCovers = currentOrders.reduce((sum, order) => sum + (parseInt(order.coverCount) || 0), 0);

        // Item Analysis
        const itemCounts = {};
        currentOrders.forEach(order => {
            order.items.forEach(item => {
                if (!itemCounts[item.name]) {
                    itemCounts[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                }
                itemCounts[item.name].quantity += 1;
                itemCounts[item.name].revenue += (parseFloat(item.price) || 0);
            });
        });
        const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);


        const newSession = {
            id: Date.now(),
            startTime: serviceStartTime,
            endTime: endTime,
            orders: currentOrders,
            metrics: {
                totalRevenue,
                totalCovers,
                totalOrders: currentOrders.length,
                topItems
            }
        };

        // Archive Session
        setSessions(prev => [newSession, ...prev]);

        // Clear Orders
        updateOrders([]);

        // Reset Service State
        setServiceStartTime(null);
    };

    return {
        orders,
        addOrder,
        updateOrderStatus,
        updateItemStatus,
        deleteOrder,
        updateOrder,
        updateCourseStatus,
        startService,
        endService,
        serviceStartTime,
        sessions
    };
}


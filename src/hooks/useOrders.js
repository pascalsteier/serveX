import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useOrders() {
    const [orders, setOrders] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const activeSessionIdRef = useRef(null); // Ref to track active session ID for subscriptions
    const [serviceStartTime, setServiceStartTime] = useState(null);

    // Update ref when activeSession changes
    useEffect(() => {
        activeSessionIdRef.current = activeSession?.id || null;
    }, [activeSession]);

    // 1. Fetch Data & Subscribe
    useEffect(() => {
        fetchActiveSession();
        fetchSessions();

        // Realtime Subscriptions
        const ordersSub = supabase
            .channel('orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                // Now we can use the ref to get the current session ID
                fetchOrders(activeSessionIdRef.current);
            })
            .subscribe();

        const sessionsSub = supabase
            .channel('sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchActiveSession();
                fetchSessions();
            })
            .subscribe();

        return () => {
            ordersSub.unsubscribe();
            sessionsSub.unsubscribe();
        };
    }, []);

    // When activeSession changes, fetch its orders
    useEffect(() => {
        if (activeSession) {
            setServiceStartTime(new Date(activeSession.start_time).getTime());
            fetchOrders(activeSession.id);
        } else {
            setServiceStartTime(null);
            fetchOrders(null); // Fetch orphaned orders
        }
    }, [activeSession]);

    const fetchActiveSession = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .is('end_time', null)
            .order('created_at', { ascending: false }) // Get latest if multiple (shouldn't happen)
            .limit(1);

        if (!error && data && data.length > 0) {
            // Check if it's actually the same to avoid loop? React handles strict equality check.
            // But objects are new refs.
            // We can check ID.
            setActiveSession(prev => prev?.id === data[0].id ? prev : data[0]);
        } else {
            setActiveSession(null);
        }
    };

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .not('end_time', 'is', null)
            .order('created_at', { ascending: false });

        if (data) {
            const mappedSessions = data.map(s => ({
                id: s.id,
                startTime: new Date(s.start_time).getTime(),
                endTime: new Date(s.end_time).getTime(),
                metrics: s.metrics,
                // We don't fetch full orders history here to keep it light, 
                // unless the UI needs it. The UI uses metrics.
                // If UI needs orders, we can fetch on demand or store in metrics if small.
                // For now, metrics is enough for the list view.
            }));
            setSessions(mappedSessions);
        }
    };

    const fetchOrders = async (sessionId) => {
        let query = supabase.from('orders').select('*');

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        } else {
            query = query.is('session_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (!error && data) {
            const mappedOrders = data.map(o => ({
                id: o.id,
                tableNumber: o.table_number,
                status: o.status,
                items: o.items, // JSONB
                courseStatus: o.course_status, // JSONB
                servicePeriod: o.service_period,
                coverCount: o.cover_count,
                notes: o.notes,
                orderType: o.order_type,
                timestamp: o.created_at,
                sessionId: o.session_id
            }));
            setOrders(mappedOrders);
        }
    };

    // Actions

    const addOrder = async (items, tableNumber, notes, servicePeriod = 'Midi', coverCount = 2, orderType = 'dine-in') => {
        const newOrder = {
            table_number: tableNumber || 'N/A',
            notes: notes || '',
            service_period: servicePeriod,
            cover_count: coverCount,
            order_type: orderType,
            items: items.map((item, index) => ({
                ...item,
                instanceId: `${Date.now()}-${index}`,
                status: 'Pending'
            })),
            status: 'Pending',
            course_status: {
                starter: 'Pending',
                main: 'Pending',
                cheese: 'Pending',
                dessert: 'Pending'
            },
            session_id: activeSession?.id || null
        };

        await supabase.from('orders').insert([newOrder]);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        // Optimistic update locally? Or wait for realtime?
        // For responsiveness, we could update local state, but let's rely on realtime for simplicity first.
        // Actually, updating local state makes UI snappy.

        // We need to fetch the current order to update items status too (convenience)
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newItems = order.items.map(item => ({ ...item, status: newStatus }));

        await supabase.from('orders').update({
            status: newStatus,
            items: newItems
        }).eq('id', orderId);
    };

    const updateItemStatus = async (orderId, itemInstanceId, newStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newItems = order.items.map(item =>
            item.instanceId === itemInstanceId ? { ...item, status: newStatus } : item
        );

        // Derive order status
        const allServed = newItems.every(i => i.status === 'Served');
        const anyReady = newItems.some(i => i.status === 'Ready');
        const anyPendingOrCooking = newItems.some(i => ['Pending', 'Cooking'].includes(i.status));
        const someStarted = newItems.some(i => i.status !== 'Pending');

        let orderStatus = order.status;
        if (allServed) orderStatus = 'Served';
        else if (anyReady) orderStatus = 'Ready';
        else if (anyPendingOrCooking) orderStatus = 'Cooking';
        else if (someStarted) orderStatus = 'Cooking';

        await supabase.from('orders').update({
            items: newItems,
            status: orderStatus
        }).eq('id', orderId);

        fetchOrders(activeSessionIdRef.current); // Immediate refresh
    };

    const serveReadyCourses = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // 1. Identify Ready items and mark them as Served
        const newItems = order.items.map(item => {
            if (item.status === 'Ready') {
                return { ...item, status: 'Served' };
            }
            return item;
        });

        // 2. Re-evaluate Order Status
        const allServed = newItems.every(i => i.status === 'Served');
        const anyReady = newItems.some(i => i.status === 'Ready');
        const anyPendingOrCooking = newItems.some(i => ['Pending', 'Cooking'].includes(i.status));

        let newOrderStatus = order.status;
        if (allServed) newOrderStatus = 'Served';
        else if (anyReady) newOrderStatus = 'Ready';
        else if (anyPendingOrCooking) newOrderStatus = 'Cooking';

        await supabase.from('orders').update({
            items: newItems,
            status: newOrderStatus
        }).eq('id', orderId);

        fetchOrders(activeSessionIdRef.current); // Immediate refresh
    };

    const updateCourseStatus = async (orderId, course, newStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newCourseStatus = { ...order.courseStatus, [course]: newStatus };

        // 1. Update items in this course if status is 'Ready'
        let newItems = [...order.items];
        if (newStatus === 'Ready') {
            const courseCategories = {
                'starter': ['Starter'],
                'main': ['Main', 'Side'],
                'cheese': ['Cheese'],
                'dessert': ['Dessert']
            };
            const categoriesToUpdate = courseCategories[course] || [];

            newItems = newItems.map(item => {
                if (categoriesToUpdate.includes(item.category)) {
                    return { ...item, status: 'Ready' };
                }
                return item;
            });
        }

        // 2. Re-evaluate Order Status
        const allServed = newItems.every(i => i.status === 'Served');
        const anyReady = newItems.some(i => i.status === 'Ready');
        const anyPendingOrCooking = newItems.some(i => ['Pending', 'Cooking'].includes(i.status));
        const someStarted = newItems.some(i => i.status !== 'Pending');

        let newOrderStatus = order.status;
        if (allServed) newOrderStatus = 'Served';
        else if (anyReady) newOrderStatus = 'Ready';
        else if (anyPendingOrCooking) newOrderStatus = 'Cooking';
        else if (someStarted) newOrderStatus = 'Cooking';

        await supabase.from('orders').update({
            course_status: newCourseStatus,
            items: newItems,
            status: newOrderStatus
        }).eq('id', orderId);

        fetchOrders(activeSessionIdRef.current); // Immediate refresh
    };

    const updateOrder = async (orderId, updatedOrderData) => {
        // Map back to snake_case if needed, but updatedOrderData usually comes from UI with camelCase
        // We need to be careful what we update.
        // For now, assuming updatedOrderData keys match DB or we map them.
        // The only updateOrder usage is in WaiterDashboard for editing.
        // It passes: { items, tableNumber, notes, servicePeriod, coverCount, orderType, status }

        const dbUpdates = {};
        if (updatedOrderData.tableNumber) dbUpdates.table_number = updatedOrderData.tableNumber;
        if (updatedOrderData.coverCount) dbUpdates.cover_count = updatedOrderData.coverCount;
        if (updatedOrderData.servicePeriod) dbUpdates.service_period = updatedOrderData.servicePeriod;
        if (updatedOrderData.orderType) dbUpdates.order_type = updatedOrderData.orderType;
        if (updatedOrderData.notes !== undefined) dbUpdates.notes = updatedOrderData.notes;
        if (updatedOrderData.items) dbUpdates.items = updatedOrderData.items;
        if (updatedOrderData.status) dbUpdates.status = updatedOrderData.status;

        await supabase.from('orders').update(dbUpdates).eq('id', orderId);
    };

    const deleteOrder = async (orderId) => {
        await supabase.from('orders').delete().eq('id', orderId);
    };

    const startService = async () => {
        if (activeSession) return;
        await supabase.from('sessions').insert([{
            start_time: new Date().toISOString(),
            metrics: {}
        }]);
        fetchActiveSession(); // Immediate refresh
    };

    const endService = async () => {
        if (!activeSession) return;

        const currentOrders = orders; // Orders currently in view (linked to session)

        // Calculate Metrics
        const totalRevenue = currentOrders.reduce((total, order) => {
            const orderTotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            return total + orderTotal;
        }, 0);

        const totalCovers = currentOrders.reduce((sum, order) => sum + (parseInt(order.coverCount) || 0), 0);

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

        const metrics = {
            totalRevenue,
            totalCovers,
            totalOrders: currentOrders.length,
            topItems
        };

        const { error } = await supabase.from('sessions').update({
            end_time: new Date().toISOString(),
            metrics: metrics
        }).eq('id', activeSession.id);

        if (error) {
            console.error('Error ending service:', error);
            return;
        }

        // Optimistic update
        setActiveSession(null);
        setServiceStartTime(null);
        setOrders([]); // Clear orders from view

        fetchActiveSession(); // Verify
        fetchSessions();      // Update history list
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
        sessions,
        serveReadyCourses
    };
}


import { useState, useEffect } from 'react';

export default function KitchenDisplaySystem({ orders, updateOrderStatus, updateItemStatus, updateCourseStatus }) {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [stationFilter, setStationFilter] = useState('all');
    const [visibleColumns, setVisibleColumns] = useState({
        toPrepare: true,
        inProgress: true,
        ready: true,
        served: true
    });

    // Update current time every second for timer calculations
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Station mapping for filtering
    const stationCategories = {
        chaud: ['Main', 'Side'],
        froid: ['Starter', 'Cheese'],
        dessert: ['Dessert'],
        bar: ['Drink']
    };

    // Allergy keywords for detection
    const allergyKeywords = ['allergie', 'allergy', 'gluten', 'lactose', 'nuts', 'arachide', 'noix'];

    // Check if notes contain allergy information
    const hasAllergyAlert = (notes) => {
        if (!notes) return false;
        const lowerNotes = notes.toLowerCase();
        return allergyKeywords.some(keyword => lowerNotes.includes(keyword));
    };

    // Filter orders by station
    const filterOrdersByStation = (ordersList) => {
        if (stationFilter === 'all') return ordersList;

        return ordersList.map(order => {
            const filteredItems = order.items.filter(item => {
                const categories = stationCategories[stationFilter] || [];
                return categories.includes(item.category);
            });

            if (filteredItems.length === 0) return null;

            return {
                ...order,
                items: filteredItems
            };
        }).filter(order => order !== null);
    };

    // Calculate elapsed time
    const calculateElapsedTime = (timestamp) => {
        const created = new Date(timestamp).getTime();
        const elapsed = Math.floor((currentTime - created) / 1000); // seconds
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return { minutes, seconds, totalMinutes: minutes };
    };

    // Get timer class based on elapsed time
    const getTimerClass = (totalMinutes) => {
        if (totalMinutes >= 25) return 'critical';
        if (totalMinutes >= 15) return 'warning';
        return 'normal';
    };

    // Format time display
    const formatTime = (minutes, seconds) => {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handle item status change
    const handleItemStatusChange = (orderId, itemInstanceId, currentStatus = 'Pending') => {
        let nextStatus;
        if (currentStatus === 'Pending') nextStatus = 'Cooking';
        else if (currentStatus === 'Cooking') nextStatus = 'Ready';
        else if (currentStatus === 'Ready') nextStatus = 'Served';

        if (nextStatus) {
            updateItemStatus(orderId, itemInstanceId, nextStatus);
        }
    };

    // Handle order status change (click on card)
    const handleOrderStatusChange = (order) => {
        let nextStatus;
        if (order.status === 'Pending') nextStatus = 'Cooking';
        else if (order.status === 'Cooking') nextStatus = 'Ready';
        else if (order.status === 'Ready') nextStatus = 'Served';

        if (nextStatus) {
            updateOrderStatus(order.id, nextStatus);
        }
    };

    // Mark all items in order as ready
    const handleMarkAllReady = (order, e) => {
        e.stopPropagation();
        order.items.forEach(item => {
            if (item.status !== 'Ready' && item.status !== 'Served') {
                updateItemStatus(order.id, item.instanceId, 'Ready');
            }
        });
        // Small delay to ensure all items are updated before changing order status
        setTimeout(() => {
            updateOrderStatus(order.id, 'Ready');
        }, 200);
    };

    // Group orders by status
    const toPrepareOrders = filterOrdersByStation(orders.filter(o => o.status === 'Pending'));
    const inProgressOrders = filterOrdersByStation(orders.filter(o => o.status === 'Cooking'));
    const readyOrders = filterOrdersByStation(orders.filter(o => o.status === 'Ready'));
    const servedOrders = filterOrdersByStation(orders.filter(o => o.status === 'Served'));

    // Render order card
    const renderOrderCard = (order) => {
        const { minutes, seconds, totalMinutes } = calculateElapsedTime(order.timestamp);
        const timerClass = getTimerClass(totalMinutes);
        const hasAllergy = hasAllergyAlert(order.notes);

        // Group items by category
        const itemsByCategory = {
            Starter: [],
            Main: [],
            Side: [],
            Cheese: [],
            Dessert: [],
            Drink: []
        };

        order.items.forEach(item => {
            const cat = item.category || 'Main';
            if (itemsByCategory[cat]) {
                itemsByCategory[cat].push(item);
            } else {
                itemsByCategory['Main'].push(item);
            }
        });

        return (
            <div
                key={order.id}
                className={`kds-order-card status-${order.status.toLowerCase()}`}
                onClick={() => handleOrderStatusChange(order)}
            >
                {/* Header */}
                <div className="kds-card-header">
                    <div className="kds-card-table">
                        <span className="table-number">Table {order.tableNumber}</span>
                        <span className="order-meta">
                            {order.servicePeriod && <span className="service-period">{order.servicePeriod}</span>}
                            {order.coverCount && <span className="cover-count">{order.coverCount} couverts</span>}
                        </span>
                    </div>
                    <div className={`kds-card-timer ${timerClass}`}>
                        {formatTime(minutes, seconds)}
                    </div>
                </div>

                {/* Allergy Alert */}
                {hasAllergy && (
                    <div className="kds-allergy-alert">
                        ⚠️ ALLERGIE - Voir notes
                    </div>
                )}

                {/* Body - Items */}
                <div className="kds-card-body">
                    {Object.entries(itemsByCategory).map(([category, items]) => {
                        if (items.length === 0) return null;

                        const categoryLabels = {
                            Starter: 'Entrées',
                            Main: 'Plats',
                            Side: 'Accompagnements',
                            Cheese: 'Fromages',
                            Dessert: 'Desserts',
                            Drink: 'Boissons'
                        };

                        return (
                            <div key={category} className="kds-category-group">
                                <div className="kds-category-title">{categoryLabels[category]}</div>
                                {items.map((item, idx) => (
                                    <div
                                        key={item.instanceId || idx}
                                        className={`kds-card-item status-${(item.status || 'pending').toLowerCase()}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemStatusChange(order.id, item.instanceId, item.status);
                                        }}
                                    >
                                        <div className="item-info">
                                            <span className="item-name">{item.name}</span>
                                            {item.modifications && (
                                                <span className="item-modifications">{item.modifications}</span>
                                            )}
                                        </div>
                                        <span className={`kds-item-status status-${(item.status || 'pending').toLowerCase()}`}>
                                            {item.status === 'Pending' && '⏸'}
                                            {item.status === 'Cooking' && '🔥'}
                                            {item.status === 'Ready' && '✓'}
                                            {item.status === 'Served' && '✓✓'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className={`kds-card-notes ${hasAllergy ? 'allergy' : ''}`}>
                        <strong>Notes:</strong> {order.notes}
                    </div>
                )}

                {/* Footer */}
                <div className="kds-card-footer">
                    <span className="order-time">
                        {new Date(order.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.status !== 'Ready' && order.status !== 'Served' && (
                        <button
                            className="kds-action-btn mark-ready"
                            onClick={(e) => handleMarkAllReady(order, e)}
                        >
                            ✓ Tout Prêt
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Render column
    const renderColumn = (title, ordersList, columnKey, statusColor) => {
        if (!visibleColumns[columnKey]) return null;

        return (
            <div className="kds-column" data-status={columnKey}>
                <div className={`kds-column-header ${statusColor}`}>
                    <h3>{title}</h3>
                    <span className="order-count">{ordersList.length}</span>
                </div>
                <div className="kds-column-body">
                    {ordersList.length === 0 ? (
                        <p className="empty-column">Aucune commande</p>
                    ) : (
                        ordersList.map(renderOrderCard)
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="kds-container">
            {/* Header */}
            <div className="kds-header">
                <h2>Cuisine Bis</h2>

                {/* Station Filter */}
                <div className="kds-filter-bar">
                    <span className="filter-label">Poste:</span>
                    <button
                        className={`kds-filter-btn ${stationFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStationFilter('all')}
                    >
                        Tous
                    </button>
                    <button
                        className={`kds-filter-btn ${stationFilter === 'chaud' ? 'active' : ''}`}
                        onClick={() => setStationFilter('chaud')}
                    >
                        Chaud
                    </button>
                    <button
                        className={`kds-filter-btn ${stationFilter === 'froid' ? 'active' : ''}`}
                        onClick={() => setStationFilter('froid')}
                    >
                        Froid
                    </button>
                    <button
                        className={`kds-filter-btn ${stationFilter === 'dessert' ? 'active' : ''}`}
                        onClick={() => setStationFilter('dessert')}
                    >
                        Dessert
                    </button>
                    <button
                        className={`kds-filter-btn ${stationFilter === 'bar' ? 'active' : ''}`}
                        onClick={() => setStationFilter('bar')}
                    >
                        Bar
                    </button>
                </div>

                {/* Column Visibility Toggles */}
                <div className="kds-column-toggles">
                    <button
                        className={`column-toggle-btn ${visibleColumns.toPrepare ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, toPrepare: !prev.toPrepare }))}
                    >
                        À Préparer
                    </button>
                    <button
                        className={`column-toggle-btn ${visibleColumns.inProgress ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, inProgress: !prev.inProgress }))}
                    >
                        En Cours
                    </button>
                    <button
                        className={`column-toggle-btn ${visibleColumns.ready ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, ready: !prev.ready }))}
                    >
                        Prêt
                    </button>
                    <button
                        className={`column-toggle-btn ${visibleColumns.served ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, served: !prev.served }))}
                    >
                        Servi
                    </button>
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="kds-columns">
                {renderColumn('À Préparer', toPrepareOrders, 'toPrepare', 'status-pending')}
                {renderColumn('En Cours', inProgressOrders, 'inProgress', 'status-cooking')}
                {renderColumn('Prêt', readyOrders, 'ready', 'status-ready')}
                {renderColumn('Servi', servedOrders, 'served', 'status-served')}
            </div>
        </div>
    );
}

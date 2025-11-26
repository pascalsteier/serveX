import { useState } from 'react';

export default function CookDashboard({ orders, updateOrderStatus, updateItemStatus, updateCourseStatus, serveReadyCourses }) {
    const [visibleColumns, setVisibleColumns] = useState({
        pending: true,
        cooking: true,
        ready: true
    });
    const handleItemStatusChange = (orderId, itemInstanceId, currentStatus = 'Pending') => {
        let nextStatus;
        if (currentStatus === 'Pending') nextStatus = 'Cooking';
        else if (currentStatus === 'Cooking') nextStatus = 'Ready';
        else if (currentStatus === 'Ready') nextStatus = 'Served';

        if (nextStatus) {
            updateItemStatus(orderId, itemInstanceId, nextStatus);

            // Auto-mark course as ready if all items in the course are ready
            if (nextStatus === 'Ready') {
                // Find the order and the item that was just updated
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    // Determine which course this item belongs to
                    const updatedItem = order.items.find(i => i.instanceId === itemInstanceId);
                    if (updatedItem) {
                        const categoryToCourse = {
                            'Starter': 'starter',
                            'Main': 'main',
                            'Side': 'main', // Sides are part of main course
                            'Cheese': 'cheese',
                            'Dessert': 'dessert'
                        };

                        const courseKey = categoryToCourse[updatedItem.category];

                        if (courseKey) {
                            // Get all items in this course
                            const courseCategories = {
                                'starter': ['Starter'],
                                'main': ['Main', 'Side'],
                                'cheese': ['Cheese'],
                                'dessert': ['Dessert']
                            };

                            const relevantCategories = courseCategories[courseKey];
                            const courseItems = order.items.filter(item =>
                                relevantCategories.includes(item.category)
                            );

                            // Check if all items in this course will be Ready (including the one we just updated)
                            const allItemsReady = courseItems.every(item =>
                                item.instanceId === itemInstanceId ? true : item.status === 'Ready'
                            );

                            // Auto-mark course as ready if not already marked and all items are ready
                            if (allItemsReady && (!order.courseStatus || order.courseStatus[courseKey] !== 'Ready')) {
                                // Small delay to ensure item status is updated first
                                setTimeout(() => {
                                    handleCourseReady(orderId, courseKey);
                                }, 100);
                            }
                        }
                    }
                }
            }
        }
    };

    const handleOrderComplete = (orderId) => {
        updateOrderStatus(orderId, 'Served');
    }

    const handleCourseReady = (orderId, course) => {
        updateCourseStatus(orderId, course, 'Ready');
    }

    // Group orders by status
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const cookingOrders = orders.filter(o => o.status === 'Cooking');
    const readyOrders = orders.filter(o => o.status === 'Ready');

    const renderOrderCard = (order) => {
        // Group items by category for display
        const itemsByCategory = {
            Starter: [],
            Main: [],
            Cheese: [],
            Dessert: [],
            Side: [],
            Drink: []
        };

        order.items.forEach(item => {
            const cat = item.category || 'Main';
            if (itemsByCategory[cat]) {
                itemsByCategory[cat].push(item);
            } else {
                itemsByCategory['Main'].push(item); // Fallback
            }
        });

        const courseMapping = {
            Starter: 'starter',
            Main: 'main',
            Cheese: 'cheese',
            Dessert: 'dessert'
        };

        const renderCategoryGroup = (categoryTitle, items, courseKey) => {
            if (items.length === 0) return null;

            const isCourseReady = order.courseStatus && order.courseStatus[courseKey] === 'Ready';

            return (
                <div className="course-group" key={categoryTitle}>
                    <div className="course-header">
                        <span className="course-title">{categoryTitle}</span>
                        {courseKey && !isCourseReady && (
                            <button
                                className="course-ready-btn"
                                onClick={() => handleCourseReady(order.id, courseKey)}
                            >
                                Tout Prêt
                            </button>
                        )}
                        {isCourseReady && <span className="course-status-ready">✓ PRÊT</span>}
                    </div>
                    {items.map((item, i) => (
                        <div key={item.instanceId || i} className="card-item-cook">
                            <span>{item.name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`item-status-badge status-${(item.status || 'pending').toLowerCase()}`}>
                                    {item.status || 'Pending'}
                                </span>
                                {item.status !== 'Ready' && item.status !== 'Served' && (
                                    <button
                                        className="ready-btn"
                                        onClick={() => handleItemStatusChange(order.id, item.instanceId, item.status)}
                                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                    >
                                        {item.status === 'Pending' ? '▶' : '✓'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div key={order.id} className="order-card-new">
                <div className="card-table-number">Table {order.tableNumber}</div>
                {order.notes && <div className="card-notes">Note: {order.notes}</div>}

                <div className="card-items">
                    {renderCategoryGroup('Entrées', itemsByCategory.Starter, 'starter')}
                    {renderCategoryGroup('Plats', [...itemsByCategory.Main, ...itemsByCategory.Side], 'main')}
                    {renderCategoryGroup('Fromages', itemsByCategory.Cheese, 'cheese')}
                    {renderCategoryGroup('Desserts', itemsByCategory.Dessert, 'dessert')}
                    {renderCategoryGroup('Boissons', itemsByCategory.Drink, null)}
                </div>

                <div className="card-footer-new">
                    <span className={`status-badge-new status-${(order.status || 'pending').toLowerCase()}`}>
                        {order.status === 'Pending' ? 'EN ATTENTE' :
                            order.status === 'Cooking' ? 'EN PRÉPARATION' :
                                order.status === 'Ready' ? 'PRÊT' :
                                    order.status === 'Served' ? 'SERVI' : order.status}
                    </span>
                    {order.status === 'Cooking' && (
                        <button
                            className="ready-btn"
                            onClick={() => updateOrderStatus(order.id, 'Ready')}
                            title="Tout marquer comme prêt"
                        >
                            ✓ TOUT PRÊT
                        </button>
                    )}
                    {order.status === 'Ready' && (
                        <button
                            className="ready-btn"
                            onClick={() => serveReadyCourses(order.id)}
                            title="Marquer les plats prêts comme servis"
                        >
                            ✓ SERVICE ENVOYÉ
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard cook-dashboard-columns">
            <div className="dashboard-header">
                <h2>Vue Cuisine</h2>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                    <button
                        className={`filter-toggle-btn ${visibleColumns.pending ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, pending: !prev.pending }))}
                        title="Afficher/masquer En attente"
                    >
                        En attente
                    </button>
                    <button
                        className={`filter-toggle-btn ${visibleColumns.cooking ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, cooking: !prev.cooking }))}
                        title="Afficher/masquer En préparation"
                    >
                        En préparation
                    </button>
                    <button
                        className={`filter-toggle-btn ${visibleColumns.ready ? 'active' : ''}`}
                        onClick={() => setVisibleColumns(prev => ({ ...prev, ready: !prev.ready }))}
                        title="Afficher/masquer Prêt"
                    >
                        Prêt
                    </button>
                </div>
            </div>

            <div className="orders-columns">
                {visibleColumns.pending && (
                    <div className="order-column">
                        <h3 className="column-title pending-title">En attente</h3>
                        <div className="column-cards">
                            {pendingOrders.length === 0 ? (
                                <p className="empty-column">Aucune commande en attente</p>
                            ) : (
                                pendingOrders.map(renderOrderCard)
                            )}
                        </div>
                    </div>
                )}

                {visibleColumns.cooking && (
                    <div className="order-column">
                        <h3 className="column-title cooking-title">En préparation</h3>
                        <div className="column-cards">
                            {cookingOrders.length === 0 ? (
                                <p className="empty-column">Aucune commande en préparation</p>
                            ) : (
                                cookingOrders.map(renderOrderCard)
                            )}
                        </div>
                    </div>
                )}

                {visibleColumns.ready && (
                    <div className="order-column">
                        <h3 className="column-title ready-title">Prêt à servir</h3>
                        <div className="column-cards">
                            {readyOrders.length === 0 ? (
                                <p className="empty-column">Aucune commande prête</p>
                            ) : (
                                readyOrders.map(renderOrderCard)
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

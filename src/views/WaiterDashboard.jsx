import { useState } from 'react';

export default function WaiterDashboard({ orders, addOrder, menuItems, decrementStock, incrementStock, deleteOrder, updateOrder }) {
    const [currentOrder, setCurrentOrder] = useState([]);
    const [tableNumber, setTableNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [servicePeriod, setServicePeriod] = useState('Midi');
    const [expandedMenus, setExpandedMenus] = useState({});
    const [coverCount, setCoverCount] = useState('2');
    const [orderType, setOrderType] = useState('dine-in');
    const [visibleColumns, setVisibleColumns] = useState({
        pending: true,
        cooking: true,
        served: true
    });


    const addToOrder = (item) => {
        if (item.stock <= 0) return;
        const itemWithPrice = {
            ...item,
            price: servicePeriod === 'Midi' ? item.priceMidi : item.priceSoir
        };
        setCurrentOrder([...currentOrder, itemWithPrice]);
    };

    const removeFromOrder = (index) => {
        setCurrentOrder(currentOrder.filter((_, i) => i !== index));
    };

    const handleSendOrder = () => {
        if (currentOrder.length === 0) return;
        if (!tableNumber) {
            alert('Veuillez entrer un numéro de table');
            return;
        }

        const itemCounts = {};
        currentOrder.forEach(item => {
            itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
        });

        for (const [id, count] of Object.entries(itemCounts)) {
            const item = menuItems.find(i => i.id === parseInt(id));
            if (item && item.stock < count) {
                alert(`Stock insuffisant pour ${item.name}. Disponible : ${item.stock}`);
                return;
            }
        }

        if (editingOrderId) {
            const originalOrder = orders.find(o => o.id === editingOrderId);
            incrementStock(originalOrder.items);
            decrementStock(currentOrder);

            updateOrder(editingOrderId, {
                items: currentOrder.map((item, index) => ({
                    ...item,
                    instanceId: `${Date.now()}-${index}`,
                    status: 'Pending'
                })),
                tableNumber,
                notes,
                servicePeriod,
                coverCount: parseInt(coverCount) || 2,
                orderType,
                status: 'Pending'
            });
        } else {
            addOrder(currentOrder, tableNumber, notes, servicePeriod, parseInt(coverCount) || 2, orderType);
            decrementStock(currentOrder);
        }

        setCurrentOrder([]);
        setTableNumber('');
        setNotes('');
        setIsModalOpen(false);
        setEditingOrderId(null);
        setServicePeriod('Midi');
    };

    const handleCancel = () => {
        setCurrentOrder([]);
        setTableNumber('');
        setNotes('');
        setIsModalOpen(false);
        setEditingOrderId(null);
        setServicePeriod('Midi');
        setCoverCount('2');
        setOrderType('dine-in');
    };

    const handleEditOrder = (order) => {
        if (order.status !== 'Pending') {
            alert('Impossible de modifier une commande déjà en préparation');
            return;
        }

        setEditingOrderId(order.id);
        setCurrentOrder(order.items);
        setTableNumber(order.tableNumber);
        setNotes(order.notes);
        setServicePeriod(order.servicePeriod || 'Midi');
        setCoverCount(String(order.coverCount || 2));
        setOrderType(order.orderType || 'dine-in');
        setIsModalOpen(true);
    };

    const handleDeleteOrder = (order) => {
        if (window.confirm(`Supprimer la commande de la Table ${order.tableNumber} ?`)) {
            incrementStock(order.items);
            deleteOrder(order.id);
        }
    };

    const dishes = menuItems.filter(item => item.category !== 'Drink');
    const beverages = menuItems.filter(item => item.category === 'Drink');

    const renderMenuSection = (title, items) => (
        <div className="menu-category-section">
            <h4>{title}</h4>
            <div className="menu-grid">
                {items.map(item => {
                    const inCurrentOrder = currentOrder.filter(i => i.id === item.id).length;
                    const remainingStock = (item.stock || 0) - inCurrentOrder;
                    const isOutOfStock = remainingStock <= 0;
                    const displayPrice = servicePeriod === 'Midi' ? item.priceMidi : item.priceSoir;

                    return (
                        <button
                            key={item.id}
                            className={`menu-item ${isOutOfStock ? 'out-of-stock' : ''}`}
                            onClick={() => addToOrder(item)}
                            disabled={isOutOfStock}
                        >
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">€{displayPrice?.toFixed(2) || '0.00'}</span>
                            <span className={`item-stock ${remainingStock < 5 ? 'low-stock' : ''}`}>
                                {remainingStock > 0 ? `${remainingStock} restants` : 'Épuisé'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Group orders by status
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const cookingOrders = orders.filter(o => o.status === 'Cooking');
    const servedOrders = orders.filter(o => o.status === 'Served' || o.status === 'Ready');

    const renderOrderCard = (order) => {
        // Group items by name for quantity display
        const groupedItems = order.items.reduce((acc, item) => {
            const key = item.name;
            if (!acc[key]) {
                acc[key] = { ...item, quantity: 0, instances: [] };
            }
            acc[key].quantity += 1;
            acc[key].instances.push(item);
            return acc;
        }, {});

        // Group by category
        const categoryGroups = {
            Starter: [],
            Main: [],
            Cheese: [],
            Dessert: [],
            Drink: []
        };

        Object.values(groupedItems).forEach(item => {
            let cat = item.category || 'Main';
            if (cat === 'Side') cat = 'Main'; // Group sides with mains
            if (categoryGroups[cat]) {
                categoryGroups[cat].push(item);
            } else {
                // Fallback
                if (!categoryGroups['Main']) categoryGroups['Main'] = [];
                categoryGroups['Main'].push(item);
            }
        });

        const toggleMenu = (menuKey, orderId, e) => {
            e.stopPropagation();
            const key = `${orderId}-${menuKey}`;
            setExpandedMenus(prev => ({
                ...prev,
                [key]: !prev[key]
            }));
        };

        const formatTime = (timestamp) => {
            if (!timestamp) return '--:--';
            const date = new Date(timestamp);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        };

        const orderType = order.orderType || 'dine-in';
        const coverCount = order.coverCount || 2;

        const catLabels = { Starter: 'Entrées', Main: 'Plats', Cheese: 'Fromages', Dessert: 'Desserts', Drink: 'Boissons' };

        return (
            <div
                key={order.id}
                className={`order-card-enhanced ${order.status === 'Pending' ? 'editable' : ''}`}
                onClick={() => order.status === 'Pending' && handleEditOrder(order)}
                style={{ cursor: order.status === 'Pending' ? 'pointer' : 'default' }}
            >
                {/* Colored Header Bar */}
                <div className={`card-header-bar type-${orderType} status-${(order.status || 'pending').toLowerCase()}`}></div>

                {/* Card Body */}
                <div className="card-body-enhanced">
                    {/* Table and Cover Info */}
                    <div className="card-info-row">
                        <div className="card-info-item">
                            <span className="card-info-icon">🪑</span>
                            <div>
                                <div className="card-info-label">Table</div>
                                <div className="card-info-value">{order.tableNumber}</div>
                            </div>
                        </div>
                        <div className="card-info-item">
                            <span className="card-info-icon">👥</span>
                            <div>
                                <div className="card-info-label">Couverts</div>
                                <div className="card-info-value">{coverCount}</div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Sections */}
                    <div className="card-menu-sections">
                        {['Starter', 'Main', 'Cheese', 'Dessert', 'Drink'].map(catKey => {
                            const items = categoryGroups[catKey];
                            if (!items || items.length === 0) return null;

                            const key = `${order.id}-${catKey}`;
                            const isExpanded = expandedMenus[key] !== false; // Default to expanded
                            const totalArticles = items.reduce((sum, item) => sum + item.quantity, 0);

                            return (
                                <div key={catKey} className="card-menu-section">
                                    <div
                                        className="card-menu-header"
                                        onClick={(e) => toggleMenu(catKey, order.id, e)}
                                    >
                                        <span className="card-menu-title">{catLabels[catKey]}</span>
                                        <div className="card-menu-count">
                                            <span>Articles : {totalArticles}</span>
                                            <span className={`card-menu-toggle ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                        </div>
                                    </div>
                                    <div className={`card-menu-items ${!isExpanded ? 'collapsed' : ''}`}>
                                        {/* Timestamps */}
                                        <div className="card-timestamps">
                                            <div className="card-timestamp">
                                                <span className="card-timestamp-icon">🕐</span>
                                                <span className="card-timestamp-time">{formatTime(order.timestamp)}</span>
                                            </div>
                                            <div className="card-timestamp">
                                                <span className="card-timestamp-icon">▶</span>
                                                <span className="card-timestamp-time">{formatTime(order.timestamp)}</span>
                                            </div>
                                            <div className="card-timestamp">
                                                <span className="card-timestamp-icon">⏱</span>
                                                <span className="card-timestamp-time">
                                                    {order.status === 'Ready' || order.status === 'Served'
                                                        ? formatTime(order.completedAt || order.timestamp)
                                                        : '--:--'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Course Status Indicators - Only show for relevant course */}
                                        {order.courseStatus && (() => {
                                            // Map category to course key
                                            const categoryToCourse = {
                                                'Starter': 'starter',
                                                'Main': 'main',
                                                'Cheese': 'cheese',
                                                'Dessert': 'dessert'
                                            };

                                            const courseKey = categoryToCourse[catKey];
                                            if (!courseKey) return null; // No course status for Drinks

                                            const status = order.courseStatus[courseKey];
                                            if (!status || status === 'Pending') return null;

                                            const labels = { starter: 'Entrée', main: 'Plat', cheese: 'Fromage', dessert: 'Dessert' };

                                            return (
                                                <div className="course-status-indicators">
                                                    <div className={`course-status-badge status-${status.toLowerCase()}`}>
                                                        {labels[courseKey]}: {status === 'Ready' ? 'PRÊT' : status}
                                                    </div>
                                                </div>
                                            );
                                        })()}


                                        {/* Items */}
                                        {items.map((item, idx) => {
                                            const isCompleted = item.instances.every(i => i.status === 'Served' || i.status === 'Ready');
                                            return (
                                                <div key={idx} className="card-item-row">
                                                    <div className={`card-item-checkbox ${isCompleted ? 'checked' : ''}`}></div>
                                                    <span className="card-item-quantity">{item.quantity}</span>
                                                    <span className={`card-item-name ${isCompleted ? 'completed' : ''}`}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div className="card-notes-enhanced">
                            Note: {order.notes}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="card-footer-enhanced">
                    <span className={`status-badge-new status-${(order.status || 'pending').toLowerCase()}`}>
                        {order.status === 'Pending' ? 'EN ATTENTE' :
                            order.status === 'Cooking' ? 'EN PRÉPARATION' :
                                order.status === 'Ready' ? 'PRÊT' :
                                    order.status === 'Served' ? 'SERVI' : order.status}
                    </span>
                    <div className="card-actions">
                        <span className="card-service-period">{order.servicePeriod || 'Midi'}</span>
                        <button
                            className="delete-icon-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order);
                            }}
                            title="Supprimer la commande"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard waiter-dashboard-columns">
            <div className="dashboard-header">
                <h2>Commandes en cours</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                            className={`filter-toggle-btn ${visibleColumns.served ? 'active' : ''}`}
                            onClick={() => setVisibleColumns(prev => ({ ...prev, served: !prev.served }))}
                            title="Afficher/masquer Servi"
                        >
                            Servi
                        </button>
                    </div>
                    <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Nouvelle Commande</button>
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
                                pendingOrders.slice().reverse().map(renderOrderCard)
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
                                cookingOrders.slice().reverse().map(renderOrderCard)
                            )}
                        </div>
                    </div>
                )}

                {visibleColumns.served && (
                    <div className="order-column">
                        <h3 className="column-title served-title">Servi</h3>
                        <div className="column-cards">
                            {servedOrders.length === 0 ? (
                                <p className="empty-column">Aucune commande servie</p>
                            ) : (
                                servedOrders.slice().reverse().map(renderOrderCard)
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={handleCancel}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingOrderId ? 'Modifier la commande' : 'Nouvelle commande'}</h3>
                            <button className="modal-close-btn" onClick={handleCancel}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-menu-section">
                                <div className="service-period-selector">
                                    <button
                                        className={`period-btn ${servicePeriod === 'Midi' ? 'active' : ''}`}
                                        onClick={() => setServicePeriod('Midi')}
                                    >
                                        MIDI
                                    </button>
                                    <button
                                        className={`period-btn ${servicePeriod === 'Soir' ? 'active' : ''}`}
                                        onClick={() => setServicePeriod('Soir')}
                                    >
                                        SOIR
                                    </button>
                                </div>
                                {renderMenuSection('Entrées', menuItems.filter(i => i.category === 'Starter'))}
                                {renderMenuSection('Plats', menuItems.filter(i => i.category === 'Main' || i.category === 'Side'))}
                                {renderMenuSection('Fromages', menuItems.filter(i => i.category === 'Cheese'))}
                                {renderMenuSection('Desserts', menuItems.filter(i => i.category === 'Dessert'))}
                                {renderMenuSection('Boissons', menuItems.filter(i => i.category === 'Drink'))}
                            </div>

                            <div className="modal-order-section">
                                <h4>Commande actuelle</h4>

                                <div className="order-details-inputs">
                                    <input
                                        type="text"
                                        placeholder="N° Table"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        className="table-input"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Nombre de couverts"
                                        value={coverCount}
                                        onChange={(e) => setCoverCount(e.target.value)}
                                        className="table-input"
                                        min="1"
                                    />
                                    <select
                                        value={orderType}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="table-input"
                                    >
                                        <option value="dine-in">Sur place</option>
                                        <option value="takeout">À emporter</option>
                                        <option value="delivery">Livraison</option>
                                    </select>
                                    <textarea
                                        placeholder="Notes / Allergies"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="notes-input"
                                        rows="3"
                                    />
                                </div>

                                {currentOrder.length === 0 ? (
                                    <p className="empty-state">Aucun article sélectionné</p>
                                ) : (
                                    <div className="order-list-container">
                                        {['Starter', 'Main', 'Cheese', 'Dessert', 'Drink'].map(cat => {
                                            const itemsInCat = currentOrder.filter(item => {
                                                if (cat === 'Main') return item.category === 'Main' || item.category === 'Side';
                                                return item.category === cat;
                                            });

                                            if (itemsInCat.length === 0) return null;

                                            const catLabels = { Starter: 'Entrées', Main: 'Plats', Cheese: 'Fromages', Dessert: 'Desserts', Drink: 'Boissons' };

                                            return (
                                                <div key={cat} className="order-summary-category">
                                                    <h5 className="summary-cat-title">{catLabels[cat]}</h5>
                                                    <ul className="order-list">
                                                        {itemsInCat.map((item, index) => {
                                                            // Find original index in currentOrder to remove correctly
                                                            const originalIndex = currentOrder.indexOf(item);
                                                            return (
                                                                <li key={index} className="order-item">
                                                                    <span>{item.name}</span>
                                                                    <span>€{item.price?.toFixed(2)}</span>
                                                                    <button className="remove-btn" onClick={() => removeFromOrder(originalIndex)}>×</button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={handleCancel}>Annuler</button>
                            <button
                                onClick={handleSendOrder}
                                disabled={currentOrder.length === 0}
                                className="send-btn"
                            >
                                {editingOrderId ? 'Mettre à jour' : 'Envoyer en cuisine'} ({currentOrder.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

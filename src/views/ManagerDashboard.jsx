import { useState, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';

export default function ManagerDashboard({ menuItems, addMenuItem, removeMenuItem, updateMenuItem, updateItemStock, orders, startService, endService, serviceStartTime, sessions }) {
    const [activeTab, setActiveTab] = useState('inventory');
    const [newItemName, setNewItemName] = useState('');
    const [newItemStock, setNewItemStock] = useState('20');
    const [newItemType, setNewItemType] = useState('beverage');
    const [newItemPriceMidi, setNewItemPriceMidi] = useState('');
    const [newItemPriceSoir, setNewItemPriceSoir] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Plat');
    const [newItemIsAlaCarte, setNewItemIsAlaCarte] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null); // For history details

    const { employees, addEmployee, removeEmployee, updateSchedule } = useEmployees();
    const [newEmployeeName, setNewEmployeeName] = useState('');

    // Separate items by type
    const beverages = menuItems.filter(item => item.category === 'Drink');
    const ingredients = menuItems.filter(item => item.itemType === 'ingredient');
    const dishes = menuItems.filter(item => item.category !== 'Drink' && item.itemType !== 'ingredient');

    // Analytics
    const analytics = useMemo(() => {
        let totalRevenue = 0;
        const itemCounts = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.status === 'Served') {
                    totalRevenue += item.price || 0;
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
                }
            });
        });

        return { totalRevenue, itemCounts };
    }, [orders]);

    const handleAddInventoryItem = (e) => {
        e.preventDefault();
        if (!newItemName || !newItemStock) return;

        addMenuItem({
            name: newItemName,
            stock: parseInt(newItemStock),
            itemType: newItemType,
            category: newItemType === 'beverage' ? 'Drink' : 'Ingredient',
            priceMidi: newItemType === 'beverage' ? parseFloat(newItemPriceMidi) || 0 : 0,
            priceSoir: newItemType === 'beverage' ? parseFloat(newItemPriceSoir) || 0 : 0,
        });

        setNewItemName('');
        setNewItemStock('20');
        setNewItemPriceMidi('');
        setNewItemPriceSoir('');
    };

    const handleAddDish = (e) => {
        e.preventDefault();
        if (!newItemName || !newItemPriceMidi || !newItemPriceSoir) return;

        addMenuItem({
            name: newItemName,
            priceMidi: parseFloat(newItemPriceMidi),
            priceSoir: parseFloat(newItemPriceSoir),
            category: newItemCategory,
            menuCourse: newItemCategory,
            stock: parseInt(newItemStock) || 20,
            isAlaCarte: newItemIsAlaCarte
        });

        setNewItemName('');
        setNewItemPriceMidi('');
        setNewItemPriceSoir('');
        setNewItemCategory('Plat');
        setNewItemStock('20');
        setNewItemIsAlaCarte(false);
        setNewItemStock('20');
    };

    const handleAddEmployee = (e) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) return;
        addEmployee(newEmployeeName);
        setNewEmployeeName('');
    };

    const days = [
        { key: 'mon', label: 'Lun' },
        { key: 'tue', label: 'Mar' },
        { key: 'wed', label: 'Mer' },
        { key: 'thu', label: 'Jeu' },
        { key: 'fri', label: 'Ven' },
        { key: 'sat', label: 'Sam' },
        { key: 'sun', label: 'Dim' }
    ];

    const renderInventoryTab = () => (
        <div className="tab-content">
            <div className="card">
                <h3>Ajouter un article</h3>
                <form onSubmit={handleAddInventoryItem} className="add-item-form">
                    <input
                        type="text"
                        placeholder="Nom de l'article"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Stock (unités)"
                        value={newItemStock}
                        onChange={(e) => setNewItemStock(e.target.value)}
                        required
                        min="0"
                    />
                    <select
                        value={newItemType}
                        onChange={(e) => setNewItemType(e.target.value)}
                    >
                        <option value="beverage">Boisson</option>
                        <option value="ingredient">Matière première</option>
                    </select>
                    {newItemType === 'beverage' && (
                        <>
                            <input
                                type="number"
                                placeholder="Prix Midi (€)"
                                step="0.01"
                                value={newItemPriceMidi}
                                onChange={(e) => setNewItemPriceMidi(e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Prix Soir (€)"
                                step="0.01"
                                value={newItemPriceSoir}
                                onChange={(e) => setNewItemPriceSoir(e.target.value)}
                            />
                        </>
                    )}
                    <button type="submit">Ajouter</button>
                </form>
            </div>

            <div className="inventory-sections">
                <div className="inventory-section">
                    <h3>🍷 Boissons</h3>
                    <div className="inventory-list">
                        {beverages.length === 0 ? (
                            <p className="empty-state">Aucune boisson</p>
                        ) : (
                            beverages.map(item => (
                                <div key={item.id} className="inventory-item">
                                    <div className="inventory-item-info">
                                        <span className="inventory-item-name">{item.name}</span>
                                        <span className={`inventory-item-stock ${item.stock < 5 ? 'low' : ''}`}>
                                            Stock: {item.stock} unités
                                        </span>
                                    </div>
                                    <div className="inventory-item-actions">
                                        <input
                                            type="number"
                                            className="stock-input"
                                            value={item.stock || 0}
                                            onChange={(e) => updateItemStock(item.id, parseInt(e.target.value))}
                                            min="0"
                                        />
                                        <button
                                            className="delete-btn"
                                            onClick={() => removeMenuItem(item.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="inventory-section">
                    <h3>🥬 Matières premières</h3>
                    <div className="inventory-list">
                        {ingredients.length === 0 ? (
                            <p className="empty-state">Aucune matière première</p>
                        ) : (
                            ingredients.map(item => (
                                <div key={item.id} className="inventory-item">
                                    <div className="inventory-item-info">
                                        <span className="inventory-item-name">{item.name}</span>
                                        <span className={`inventory-item-stock ${item.stock < 5 ? 'low' : ''}`}>
                                            Stock: {item.stock} unités
                                        </span>
                                    </div>
                                    <div className="inventory-item-actions">
                                        <input
                                            type="number"
                                            className="stock-input"
                                            value={item.stock || 0}
                                            onChange={(e) => updateItemStock(item.id, parseInt(e.target.value))}
                                            min="0"
                                        />
                                        <button
                                            className="delete-btn"
                                            onClick={() => removeMenuItem(item.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMenuTab = () => (
        <div className="tab-content">
            <div className="card">
                <h3>Ajouter un plat</h3>
                <form onSubmit={handleAddDish} className="add-item-form">
                    <input
                        type="text"
                        placeholder="Nom du plat"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Prix Midi (€)"
                        step="0.01"
                        value={newItemPriceMidi}
                        onChange={(e) => setNewItemPriceMidi(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Prix Soir (€)"
                        step="0.01"
                        value={newItemPriceSoir}
                        onChange={(e) => setNewItemPriceSoir(e.target.value)}
                        required
                    />
                    <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value)}
                    >
                        <option value="Entrée">Entrée</option>
                        <option value="Plat">Plat</option>
                        <option value="Fromage">Fromage</option>
                        <option value="Dessert">Dessert</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Stock initial"
                        value={newItemStock}
                        onChange={(e) => setNewItemStock(e.target.value)}
                        min="0"
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={newItemIsAlaCarte}
                            onChange={(e) => setNewItemIsAlaCarte(e.target.checked)}
                        />
                        <span>À la carte</span>
                    </label>
                    <button type="submit">Ajouter le plat</button>
                </form>
            </div>

            <div className="menu-cards-grid">
                {dishes.map(item => {
                    const isEditing = editingItemId === item.id;

                    return (
                        <div key={item.id} className="menu-card">
                            {/* Header: Name and Category */}
                            <div className="menu-card-header">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateMenuItem(item.id, { name: e.target.value })}
                                        style={{
                                            fontSize: '1.2rem',
                                            fontWeight: 600,
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid var(--color-primary)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            color: 'var(--color-text-primary)',
                                            minWidth: 0,
                                            maxWidth: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                ) : (
                                    <h4 className="menu-card-title">{item.name}</h4>
                                )}
                                {isEditing ? (
                                    <select
                                        value={item.category || item.menuCourse || 'Plat'}
                                        onChange={(e) => updateMenuItem(item.id, {
                                            category: e.target.value,
                                            menuCourse: e.target.value
                                        })}
                                        className="menu-card-category"
                                        style={{
                                            cursor: 'pointer',
                                            background: 'rgba(187, 134, 252, 0.3)',
                                            border: '1px solid var(--color-primary)'
                                        }}
                                    >
                                        <option value="Entrée">Entrée</option>
                                        <option value="Plat">Plat</option>
                                        <option value="Fromage">Fromage</option>
                                        <option value="Dessert">Dessert</option>
                                    </select>
                                ) : (
                                    <span className="menu-card-category">{item.category || item.menuCourse || 'Plat'}</span>
                                )}
                            </div>

                            {/* Midi Price Row */}
                            <div className="menu-card-row">
                                <label>Midi:</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={item.priceMidi || 0}
                                        onChange={(e) => updateMenuItem(item.id, { priceMidi: parseFloat(e.target.value) })}
                                        step="0.01"
                                        min="0"
                                    />
                                ) : (
                                    <span style={{ padding: '8px 12px' }}>{item.priceMidi?.toFixed(2) || '0.00'} €</span>
                                )}
                            </div>

                            {/* Soir Price Row */}
                            <div className="menu-card-row">
                                <label>Soir:</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={item.priceSoir || 0}
                                        onChange={(e) => updateMenuItem(item.id, { priceSoir: parseFloat(e.target.value) })}
                                        step="0.01"
                                        min="0"
                                    />
                                ) : (
                                    <span style={{ padding: '8px 12px' }}>{item.priceSoir?.toFixed(2) || '0.00'} €</span>
                                )}
                            </div>

                            {/* Stock Row */}
                            <div className="menu-card-row">
                                <label>Stock:</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={item.stock || 0}
                                        onChange={(e) => updateItemStock(item.id, parseInt(e.target.value))}
                                        min="0"
                                    />
                                ) : (
                                    <span style={{ padding: '8px 12px' }}>{item.stock || 0} unités</span>
                                )}
                            </div>

                            {/* À la carte Row */}
                            <div className="menu-card-row">
                                <label>À la carte:</label>
                                {isEditing ? (
                                    <input
                                        type="checkbox"
                                        checked={item.isAlaCarte || false}
                                        onChange={(e) => updateMenuItem(item.id, { isAlaCarte: e.target.checked })}
                                        style={{ cursor: 'pointer' }}
                                    />
                                ) : (
                                    <span style={{ padding: '8px 12px' }}>
                                        {item.isAlaCarte ? (
                                            <span style={{
                                                background: 'rgba(187, 134, 252, 0.3)',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                            }}>✓ À la carte</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Menu</span>
                                        )}
                                    </span>
                                )}
                            </div>

                            {/* Actions Row */}
                            <div className="menu-card-actions">
                                {isEditing ? (
                                    <button
                                        className="ready-btn"
                                        onClick={() => setEditingItemId(null)}
                                    >
                                        ✓ Terminé
                                    </button>
                                ) : (
                                    <button
                                        className="ready-btn"
                                        onClick={() => setEditingItemId(item.id)}
                                    >
                                        ✏️ Éditer
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={() => removeMenuItem(item.id)}
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="tab-content">
            <h3>Historique des Services</h3>

            {selectedSession ? (
                <div className="session-detail-view">
                    <button className="back-btn" onClick={() => setSelectedSession(null)}>← Retour à la liste</button>

                    <div className="session-header-detail">
                        <h4>Service du {new Date(selectedSession.startTime).toLocaleDateString()}</h4>
                        <span className="session-time">
                            {new Date(selectedSession.startTime).toLocaleTimeString()} - {new Date(selectedSession.endTime).toLocaleTimeString()}
                        </span>
                    </div>

                    <div className="summary-stats">
                        <div className="stat-box">
                            <span className="stat-label">Chiffre d'Affaires</span>
                            <span className="stat-value">{selectedSession.metrics.totalRevenue.toFixed(2)}€</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Couverts</span>
                            <span className="stat-value">{selectedSession.metrics.totalCovers}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Commandes</span>
                            <span className="stat-value">{selectedSession.metrics.totalOrders}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Panier Moyen</span>
                            <span className="stat-value">
                                {selectedSession.metrics.totalOrders > 0
                                    ? (selectedSession.metrics.totalRevenue / selectedSession.metrics.totalOrders).toFixed(2)
                                    : '0.00'}€
                            </span>
                        </div>
                    </div>

                    <div className="session-analysis-grid">
                        <div className="analysis-card">
                            <h4>Top 5 Plats</h4>
                            <ul className="top-items-list">
                                {selectedSession.metrics.topItems.map((item, idx) => (
                                    <li key={idx} className="top-item-row">
                                        <span className="item-rank">#{idx + 1}</span>
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-qty">x{item.quantity}</span>
                                        <span className="item-rev">{item.revenue.toFixed(2)}€</span>
                                    </li>
                                ))}
                                {selectedSession.metrics.topItems.length === 0 && <p>Aucune donnée</p>}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="sessions-list">
                    {sessions.length === 0 ? (
                        <p className="empty-state">Aucun historique de service disponible.</p>
                    ) : (
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Début</th>
                                    <th>Fin</th>
                                    <th>Commandes</th>
                                    <th>Couverts</th>
                                    <th>Revenu</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(session => (
                                    <tr key={session.id}>
                                        <td>{new Date(session.startTime).toLocaleDateString()}</td>
                                        <td>{new Date(session.startTime).toLocaleTimeString()}</td>
                                        <td>{new Date(session.endTime).toLocaleTimeString()}</td>
                                        <td>{session.metrics.totalOrders}</td>
                                        <td>{session.metrics.totalCovers}</td>
                                        <td>{session.metrics.totalRevenue.toFixed(2)}€</td>
                                        <td>
                                            <button
                                                className="action-btn"
                                                onClick={() => setSelectedSession(session)}
                                            >
                                                Détails
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );

    const renderEmployeesTab = () => (
        <div className="tab-content">
            <div className="card">
                <h3>Gestion des employés</h3>
                <form onSubmit={handleAddEmployee} className="add-item-form">
                    <input
                        type="text"
                        placeholder="Nom de l'employé"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        required
                    />
                    <button type="submit" className="add-btn">Ajouter</button>
                </form>

                <div className="employees-table-container">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                {days.map(day => (
                                    <th key={day.key} className="day-header">{day.label}</th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}>
                                    <td className="employee-name">{emp.name}</td>
                                    {days.map(day => (
                                        <td key={day.key} className="day-cell">
                                            <input
                                                type="checkbox"
                                                checked={emp.schedule[day.key]}
                                                onChange={() => updateSchedule(emp.id, day.key)}
                                                className="schedule-checkbox"
                                            />
                                        </td>
                                    ))}
                                    <td>
                                        <button
                                            onClick={() => removeEmployee(emp.id)}
                                            className="delete-btn"
                                            title="Supprimer"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={days.length + 2} className="empty-table">
                                        Aucun employé enregistré
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard manager-dashboard">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Dashboard Manager</h2>
                <div className="service-controls">
                    {serviceStartTime ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className="service-status active">
                                🟢 Service en cours (Début: {new Date(serviceStartTime).toLocaleTimeString()})
                            </span>
                            <button
                                className="end-service-btn"
                                onClick={() => {
                                    if (window.confirm('Êtes-vous sûr de vouloir terminer le service ? Cela archivera toutes les commandes actuelles.')) {
                                        endService();
                                    }
                                }}
                                style={{ backgroundColor: '#CF6679', color: 'white' }}
                            >
                                Terminer le Service
                            </button>
                        </div>
                    ) : (
                        <button
                            className="start-service-btn"
                            onClick={startService}
                            style={{ backgroundColor: '#03DAC6', color: 'black' }}
                        >
                            Démarrer le Service
                        </button>
                    )}
                </div>
            </div>

            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    📦 Inventaire
                </button>
                <button
                    className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                >
                    🍽️ Menu
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📊 Historique
                </button>
                <button
                    className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
                    onClick={() => setActiveTab('employees')}
                >
                    👥 Présence Employés
                </button>
            </div>

            {activeTab === 'inventory' && renderInventoryTab()}
            {activeTab === 'menu' && renderMenuTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'employees' && renderEmployeesTab()}
        </div>
    );
}

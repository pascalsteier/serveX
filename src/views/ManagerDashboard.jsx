import { useState, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';

export default function ManagerDashboard({ menuItems, addMenuItem, removeMenuItem, updateMenuItem, updateItemStock, orders }) {
    const [activeTab, setActiveTab] = useState('inventory');
    const [newItemName, setNewItemName] = useState('');
    const [newItemStock, setNewItemStock] = useState('20');
    const [newItemType, setNewItemType] = useState('beverage');
    const [newItemPriceMidi, setNewItemPriceMidi] = useState('');
    const [newItemPriceSoir, setNewItemPriceSoir] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Plat');
    const [editingItemId, setEditingItemId] = useState(null);

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
            stock: parseInt(newItemStock) || 20
        });

        setNewItemName('');
        setNewItemPriceMidi('');
        setNewItemPriceSoir('');
        setNewItemCategory('Plat');
        setNewItemStock('20');
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
            <div className="history-summary">
                <div className="history-stat-card">
                    <div className="history-stat-label">Revenu Total</div>
                    <div className="history-stat-value">€{analytics.totalRevenue.toFixed(2)}</div>
                </div>
                <div className="history-stat-card">
                    <div className="history-stat-label">Articles Vendus</div>
                    <div className="history-stat-value">
                        {Object.values(analytics.itemCounts).reduce((a, b) => a + b, 0)}
                    </div>
                </div>
                <div className="history-stat-card">
                    <div className="history-stat-label">Commandes Servies</div>
                    <div className="history-stat-value">
                        {orders.filter(o => o.status === 'Served').length}
                    </div>
                </div>
            </div>

            <div className="history-table-container">
                <h3>Articles consommés</h3>
                {Object.keys(analytics.itemCounts).length === 0 ? (
                    <p className="empty-state">Aucun article servi</p>
                ) : (
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Article</th>
                                <th>Quantité</th>
                                <th>Revenu estimé</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(analytics.itemCounts)
                                .sort(([, a], [, b]) => b - a)
                                .map(([name, count]) => {
                                    const item = menuItems.find(i => i.name === name);
                                    const avgPrice = item ? ((item.priceMidi || 0) + (item.priceSoir || 0)) / 2 : 0;
                                    const revenue = avgPrice * count;

                                    return (
                                        <tr key={name}>
                                            <td>{name}</td>
                                            <td>{count}</td>
                                            <td>€{revenue.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>
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
            <div className="dashboard-header">
                <h2>Gestion</h2>
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

import { useState } from 'react'
import './App.css'
import { useOrders } from './hooks/useOrders';
import WaiterDashboard from './views/WaiterDashboard';
import CookDashboard from './views/CookDashboard';
import ManagerDashboard from './views/ManagerDashboard';
import KitchenDisplaySystem from './views/KitchenDisplaySystem';
import { useMenu } from './hooks/useMenu';

function App() {
  const [role, setRole] = useState(null); // 'waiter' | 'cook' | 'manager' | null
  const { orders, addOrder, updateOrderStatus, updateItemStatus, deleteOrder, updateOrder, updateCourseStatus, startService, endService, serviceStartTime, sessions, serveReadyCourses } = useOrders();
  const { menuItems, addMenuItem, removeMenuItem, updateMenuItem, updateItemStock, decrementStock, incrementStock } = useMenu();

  if (!role) {
    return (
      <div className="role-selection">
        <h1>ServeX</h1>
        <p>Sélectionnez votre rôle</p>
        <div className="role-buttons">
          <button onClick={() => setRole('waiter')}>Service</button>
          <button onClick={() => setRole('cook')} className="secondary">Cuisine</button>
          <button onClick={() => setRole('kds')} className="secondary">Cuisine Bis</button>
          <button onClick={() => setRole('manager')} className="secondary outline">Gestion</button>
        </div>
      </div>
    );
  }

  const getRoleTitle = () => {
    switch (role) {
      case 'waiter': return 'Vue Service';
      case 'cook': return 'Vue Cuisine';
      case 'kds': return 'Cuisine Bis';
      case 'manager': return 'Gestion';
      default: return '';
    }
  }

  return (
    <div className="app-container">
      <header>
        <button className="back-btn" onClick={() => setRole(null)}>← Retour</button>
        <h2>{getRoleTitle()}</h2>
      </header>

      <main>
        {role === 'waiter' && (
          <WaiterDashboard
            orders={orders}
            addOrder={addOrder}
            menuItems={menuItems}
            decrementStock={decrementStock}
            incrementStock={incrementStock}
            deleteOrder={deleteOrder}
            updateOrder={updateOrder}
          />
        )}
        {role === 'cook' && (
          <CookDashboard
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            updateItemStatus={updateItemStatus}
            updateCourseStatus={updateCourseStatus}
            serveReadyCourses={serveReadyCourses}
          />
        )}
        {role === 'kds' && (
          <KitchenDisplaySystem
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            updateItemStatus={updateItemStatus}
            updateCourseStatus={updateCourseStatus}
          />
        )}
        {role === 'manager' && (
          <ManagerDashboard
            menuItems={menuItems}
            addMenuItem={addMenuItem}
            removeMenuItem={removeMenuItem}
            updateMenuItem={updateMenuItem}
            updateItemStock={updateItemStock}
            orders={orders}
            startService={startService}
            endService={endService}
            serviceStartTime={serviceStartTime}
            sessions={sessions}
          />
        )}
      </main>
    </div>
  )
}

export default App

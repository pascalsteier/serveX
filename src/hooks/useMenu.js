import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MENU_ITEMS as INITIAL_MENU } from '../data/menu';

export function useMenu() {
    const [menuItems, setMenuItems] = useState([]);

    // Fetch Menu & Subscribe to Realtime
    useEffect(() => {
        fetchMenu();

        const subscription = supabase
            .channel('menu_items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
                fetchMenu(); // Refresh on any change
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchMenu = async () => {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching menu:', error);
            return;
        }

        // Map snake_case to camelCase
        const mappedItems = data.map(item => ({
            id: item.id,
            name: item.name,
            priceMidi: item.price_midi,
            priceSoir: item.price_soir,
            category: item.category,
            stock: item.stock,
            isAlaCarte: item.is_ala_carte,
            itemType: item.item_type
        }));

        // Seed if empty
        if (mappedItems.length === 0) {
            seedMenu();
        } else {
            setMenuItems(mappedItems);
        }
    };

    const seedMenu = async () => {
        // Double check count to prevent race conditions
        const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true });
        if (count > 0) return;

        const itemsToInsert = INITIAL_MENU.map(item => ({
            name: item.name,
            price_midi: item.priceMidi || item.price || 0,
            price_soir: item.priceSoir || item.price || 0,
            category: item.category,
            stock: 20,
            is_ala_carte: false,
            item_type: item.itemType || 'dish'
        }));

        const { error } = await supabase.from('menu_items').insert(itemsToInsert);
        if (error) console.error('Error seeding menu:', error);
    };

    const addMenuItem = async (item) => {
        const newItem = {
            name: item.name,
            price_midi: item.priceMidi,
            price_soir: item.priceSoir,
            category: item.category,
            stock: item.stock || 20,
            is_ala_carte: item.isAlaCarte,
            item_type: item.itemType || 'dish'
        };
        await supabase.from('menu_items').insert([newItem]);
    };

    const removeMenuItem = async (id) => {
        await supabase.from('menu_items').delete().eq('id', id);
    };

    const updateMenuItem = async (id, updates) => {
        const dbUpdates = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.priceMidi) dbUpdates.price_midi = updates.priceMidi;
        if (updates.priceSoir) dbUpdates.price_soir = updates.priceSoir;
        if (updates.category) dbUpdates.category = updates.category;
        if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
        if (updates.isAlaCarte !== undefined) dbUpdates.is_ala_carte = updates.isAlaCarte;

        await supabase.from('menu_items').update(dbUpdates).eq('id', id);
    };

    const updateItemStock = async (id, newStock) => {
        await supabase.from('menu_items').update({ stock: newStock }).eq('id', id);
    };

    const decrementStock = async (orderedItems) => {
        // Optimistic update or sequential update?
        // For simplicity, we loop. In production, use RPC for atomic updates.
        for (const item of orderedItems) {
            // Fetch current stock first to be safe, or just decrement
            // Supabase doesn't have a simple "decrement" without RPC, so we read-modify-write
            // This is a race condition risk but acceptable for prototype
            const { data } = await supabase.from('menu_items').select('stock').eq('id', item.id).single();
            if (data) {
                const newStock = Math.max(0, data.stock - 1);
                await supabase.from('menu_items').update({ stock: newStock }).eq('id', item.id);
            }
        }
    };

    const incrementStock = async (orderedItems) => {
        for (const item of orderedItems) {
            const { data } = await supabase.from('menu_items').select('stock').eq('id', item.id).single();
            if (data) {
                await supabase.from('menu_items').update({ stock: data.stock + 1 }).eq('id', item.id);
            }
        }
    };

    return { menuItems, addMenuItem, removeMenuItem, updateMenuItem, updateItemStock, decrementStock, incrementStock };
}

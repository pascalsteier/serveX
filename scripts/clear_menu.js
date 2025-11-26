import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearMenu() {
    console.log('Clearing menu_items...')
    const { error } = await supabase.from('menu_items').delete().neq('id', 0) // Delete all where id != 0 (all)
    if (error) {
        console.error('Error clearing menu:', error)
    } else {
        console.log('Menu cleared successfully.')
    }
}

clearMenu()

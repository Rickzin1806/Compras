
// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://vueokhozcdfihceuzguh.supabase.co',
  'sb_publishable_AuT8LuEwY9th_d0sskl14g_YGeY--4S'
)
    
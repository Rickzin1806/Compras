// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://vueokhozcdfihceuzguh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZW9raG96Y2RmaWhjZXV6Z3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTE3NTgsImV4cCI6MjA4NzY4Nzc1OH0.dQzKWW5VYFrW7YLWxXGoBpSKquy1eEMkpAJpiwisDhE'
)

    

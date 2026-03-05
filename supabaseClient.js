
// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://ygqwwewymlfpgkebdryo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXd3ZXd5bWxmcGdrZWJkcnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTE2ODYsImV4cCI6MjA4NzY4NzY4Nn0.PiZpCLY5TjBrWr2ko-92xpALR1A6EE1Wx7ZnxSnoFfw'
)

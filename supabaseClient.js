// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://ixugmhmmnvobcnzkqygu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dWdtaG1tbnZvYmNuemtxeWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTE1NzIsImV4cCI6MjA4NzY4NzU3Mn0.jRmwGRlHik1oActu6K07qpLRaLzFL0JNlnoRyYhAtDQ'
)
    
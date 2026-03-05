import { supabase } from './supabaseClient.js'

// Recupera o usuÃ¡rio logado. Redireciona para login se nÃ£o estiver autenticado.
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) window.location.href = 'login.html'
  return user
}

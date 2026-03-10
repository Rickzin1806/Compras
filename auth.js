import { supabase } from './supabaseClient.js'

// Função para login do usuário
window.login = async function () {
  const email = document.getElementById('email').value
  const senha = document.getElementById('senha').value

  // Autentica com Supabase
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) {
    alert('Erro no login: ' + error.message)
  } else {
    // Redireciona para página principal
    window.location.href = 'index.html'
  }
}

// Função para cadastrar novo usuário
window.cadastro = async function () {
  const email = document.getElementById('email').value
  const senha = document.getElementById('senha').value

  const { error } = await supabase.auth.signUp({ email, password: senha })
  if (error) {
    alert('Erro no cadastro: ' + error.message)
  } else {
    alert('Cadastro realizado! Faça login.')
  }
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    const caminho = window.location.pathname
    if (caminho.includes('login')) {
      login()
    } else if (caminho.includes('cadastro')) {
      cadastro()
    }
  }
})
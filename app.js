import { supabase } from './supabaseClient.js'

// Recupera o usuário logado. Redireciona para login se não estiver autenticado.
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) window.location.href = 'login.html'
  return user
}

// Elementos do DOM
const lista = document.getElementById('lista')
const input = document.getElementById('item')

// Carrega a lista de compras do Supabase
async function carregarLista() {
  const { data, error } = await supabase.from('lista_de_compras').select('*')
  if (error) {
    console.error('Erro ao carregar lista:', error)
    return
  }

  // Limpa a lista e renderiza os itens
  lista.innerHTML = ''
  data.forEach((item) => {
    const li = document.createElement('li')
    li.innerHTML = `${item.item} <button onclick="removerItem('${item.id}')">Remover</button>`
    lista.appendChild(li)
  })
}

// Adiciona novo item Ã  lista de compras
window.adicionarItem = async function () {
  const user = await getUser()
  console.log('UsuÃ¡rio:', user)
  console.log('Item:', input.value)

  const { error } = await supabase.from('lista_de_compras').insert({
    item: input.value,
    adicionado_por: user.id // Certifique-se que a coluna existe e Ã© do tipo uuid
  })

  if (error) return alert('Erro ao adicionar: ' + error.message)

  input.value = ''
  carregarLista()
}

// Remove item da lista pelo ID
window.removerItem = async function (id) {
  const { error } = await supabase.from('lista_de_compras').delete().eq('id', id)
  if (error) return alert('Erro ao remover: ' + error.message)
  carregarLista()
}

// Realiza logout do usuÃ¡rio
window.logout = async function () {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

// Inicializa: verifica se o usuÃ¡rio estÃ¡ logado e carrega a lista
getUser().then(carregarLista)

// enter funciona para adicionar item
document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
      adicionarItem()
 }
})

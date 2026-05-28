export interface DocPage {
  slug: string
  title: string
  section: string
}

// Ordem = ordem de exibição na sidebar. Agrupado por `section`.
export const DOCS_PAGES: DocPage[] = [
  { slug: 'overview', title: 'O que é o PDV Local', section: 'Começar' },
  { slug: 'primeiros-passos', title: 'Primeiros passos', section: 'Começar' },
  { slug: 'venda', title: 'Venda rápida', section: 'No dia a dia' },
  { slug: 'pedidos', title: 'Pedidos', section: 'No dia a dia' },
  { slug: 'caixa', title: 'Caixa', section: 'No dia a dia' },
  { slug: 'kds', title: 'Tela da cozinha (KDS)', section: 'No dia a dia' },
  { slug: 'painel', title: 'Painel do cliente', section: 'No dia a dia' },
  { slug: 'produtos', title: 'Produtos', section: 'Cadastros' },
  { slug: 'adicionais', title: 'Adicionais e extras', section: 'Cadastros' },
  { slug: 'clientes', title: 'Clientes', section: 'Cadastros' },
  { slug: 'relatorios', title: 'Relatórios', section: 'Gestão' },
  { slug: 'configuracoes', title: 'Configurações', section: 'Gestão' },
  { slug: 'backup', title: 'Backup dos dados', section: 'Gestão' },
]

export const FIRST_DOC_SLUG = DOCS_PAGES[0].slug

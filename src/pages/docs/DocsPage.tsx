import { useEffect, useState, type ComponentPropsWithoutRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { docsContentUrl } from '../../lib/docsBase'
import { FIRST_DOC_SLUG } from '../../../docs/guide/manifest'
import './DocsPage.css'

interface DocsPageProps {
  slug?: string
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; content: string }
  | { kind: 'error' }

// Links internos (relativos, ex: `[Caixa](caixa)`) viram navegação da SPA com
// destino absoluto `/caixa`, independente da URL atual ter barra final. Links
// externos, âncoras (#) e mailto continuam como <a> nativo.
function isInternalDocLink(href: string): boolean {
  return !/^([a-z]+:|\/\/|#|\/)/i.test(href)
}

const markdownComponents: Components = {
  a({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
    if (href && isInternalDocLink(href)) {
      return <Link to={`/${href}`}>{children}</Link>
    }
    return <a href={href} {...props}>{children}</a>
  },
}

// Resolve o slug atual e remonta o conteúdo a cada troca (via `key`), o que
// reinicia o estado para "loading" sem precisar de setState no efeito.
export function DocsPage({ slug: slugProp }: DocsPageProps) {
  const params = useParams()
  const slug = slugProp ?? params.slug ?? FIRST_DOC_SLUG
  return <DocsContent key={slug} slug={slug} />
}

function DocsContent({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(docsContentUrl(slug))
      .then(res => {
        if (!res.ok) throw new Error(String(res.status))
        return res.text()
      })
      .then(text => { if (!cancelled) setState({ kind: 'ready', content: text }) })
      .catch(() => { if (!cancelled) setState({ kind: 'error' }) })
    return () => { cancelled = true }
  }, [slug])

  return (
    <div className="docs-page">
      {state.kind === 'loading' && <p className="docs-status">Carregando…</p>}
      {state.kind === 'error' && (
        <p className="docs-status">
          Não encontramos esta página. <Link to={`/${FIRST_DOC_SLUG}`}>Voltar ao início da documentação</Link>.
        </p>
      )}
      {state.kind === 'ready' && (
        <div className="docs-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
            components={markdownComponents}
          >
            {state.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

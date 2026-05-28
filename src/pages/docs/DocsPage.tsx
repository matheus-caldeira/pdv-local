import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
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

export function DocsPage({ slug: slugProp }: DocsPageProps) {
  const params = useParams()
  const slug = slugProp ?? params.slug ?? FIRST_DOC_SLUG
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => { if (!cancelled) setState({ kind: 'loading' }) })
      .then(() => fetch(docsContentUrl(slug)))
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
            {state.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

import { Mail, Phone, Linkedin, BookOpen } from 'lucide-react';
import { Modal } from '../molecules/Modal';
import { DOCS_BASE } from '../../lib/docsBase';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const LINK_CLASS =
  'flex items-center gap-3 rounded-md border border-border bg-surface-inset px-4 py-3 text-sm font-medium text-ink-primary transition-colors hover:border-border-emphasis [&>svg]:shrink-0 [&>svg]:text-accent';

export function ContactModal({ open, onClose }: ContactModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Sobre / Contato">
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="PDV Local"
          className="h-16 w-16 object-contain"
        />
        <p className="text-sm leading-relaxed text-ink-secondary">
          PDV Local — ponto de venda gratuito para o celular. Desenvolvido por{' '}
          <strong>Matheus Caldeira</strong>.
        </p>
        <div className="flex w-full flex-col gap-2">
          <a className={LINK_CLASS} href={`${DOCS_BASE}/`}>
            <BookOpen size={18} />
            <span>Documentação / Ajuda</span>
          </a>
          <a className={LINK_CLASS} href="mailto:matheuscardozo4@gmail.com">
            <Mail size={18} />
            <span>matheuscardozo4@gmail.com</span>
          </a>
          <a className={LINK_CLASS} href="tel:+5541995245271">
            <Phone size={18} />
            <span>+55 41 99524-5271</span>
          </a>
          <a
            className={LINK_CLASS}
            href="https://www.linkedin.com/in/caldeiramatheus/"
            target="_blank"
            rel="noopener"
          >
            <Linkedin size={18} />
            <span>in/caldeiramatheus</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}

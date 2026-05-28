import { Mail, Phone, Linkedin, BookOpen } from 'lucide-react';
import { Modal } from './Modal';
import { DOCS_BASE } from '../lib/docsBase';
import './ContactModal.css';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Sobre / Contato">
      <div className="contact-modal">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="PDV Local"
          className="contact-modal-logo"
        />
        <p className="contact-modal-intro">
          PDV Local — ponto de venda gratuito para o celular. Desenvolvido por{' '}
          <strong>Matheus Caldeira</strong>.
        </p>
        <div className="contact-modal-links">
          <a className="contact-modal-link" href={`${DOCS_BASE}/`}>
            <BookOpen size={18} />
            <span>Documentação / Ajuda</span>
          </a>
          <a
            className="contact-modal-link"
            href="mailto:matheuscardozo4@gmail.com"
          >
            <Mail size={18} />
            <span>matheuscardozo4@gmail.com</span>
          </a>
          <a className="contact-modal-link" href="tel:+5541995245271">
            <Phone size={18} />
            <span>+55 41 99524-5271</span>
          </a>
          <a
            className="contact-modal-link"
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

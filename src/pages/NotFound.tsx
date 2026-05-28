import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import './NotFound.css';

export function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <Compass size={40} className="notfound-icon" />
        <h1>Página não encontrada</h1>
        <p>O endereço que você abriu não existe ou foi movido.</p>
        <Link to="/" className="btn btn-accent">
          <Home size={16} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}

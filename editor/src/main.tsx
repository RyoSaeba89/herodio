import { createRoot } from 'react-dom/client';
import { lang } from './i18n';
import { App } from './ui/App';
import './styles.css';

document.documentElement.lang = lang;
createRoot(document.getElementById('root')!).render(<App />);

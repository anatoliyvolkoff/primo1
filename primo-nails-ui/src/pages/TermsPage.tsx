import { LegalPage } from '../components/LegalPage';
import { TERMS } from '../data/legal';

export function TermsPage() {
  return <LegalPage doc={TERMS} canonicalPath="/termini" />;
}

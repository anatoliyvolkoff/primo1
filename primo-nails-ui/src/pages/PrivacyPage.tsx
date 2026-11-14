import { LegalPage } from '../components/LegalPage';
import { PRIVACY } from '../data/legal';

export function PrivacyPage() {
  return <LegalPage doc={PRIVACY} canonicalPath="/privacy" />;
}

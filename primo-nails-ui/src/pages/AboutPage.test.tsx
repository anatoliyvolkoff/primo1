import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'it' }) }));
vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../hooks/useStoreContent', () => ({ useStoreSetting: () => '' }));

import { AboutPage } from './AboutPage';

describe('AboutPage — Primo1 "Chi siamo"', () => {
  it('renders the eight sections and links to the shop, the academy and the contacts', () => {
    const { container } = render(<MemoryRouter><AboutPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('aboutPage.hero.title1');
    for (const cls of ['abc-hero', 'abc-intro', 'abc-time', 'abc-founder', 'abc-gal', 'abc-values', 'abc-paths', 'abc-contact']) {
      expect(container.querySelector(`.${cls}`)).not.toBeNull();
    }
    expect(screen.getByRole('link', { name: /aboutPage.paths.shop.cta/ })).toHaveAttribute('href', '/tutti-prodotti');
    expect(screen.getByRole('link', { name: /aboutPage.paths.school.cta/ })).toHaveAttribute('href', '/corsi');
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/393893193049');
    expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:primonailspro@gmail.com');
  });

  it('gallery photos open a lightbox that steps through the photos and closes', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>);
    const tiles = within(screen.getByRole('list', { name: 'aboutPage.gal.label' })).getAllByRole('listitem');
    expect(tiles).toHaveLength(5);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(tiles[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('1 / 5');
    fireEvent.click(screen.getByRole('button', { name: 'a11y.image.next' }));
    expect(screen.getByRole('dialog').textContent).toContain('2 / 5');
    fireEvent.click(screen.getByRole('button', { name: 'a11y.image.prev' }));
    fireEvent.click(screen.getByRole('button', { name: 'a11y.image.prev' }));
    expect(screen.getByRole('dialog').textContent).toContain('5 / 5');
    fireEvent.click(screen.getByRole('button', { name: 'a11y.close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

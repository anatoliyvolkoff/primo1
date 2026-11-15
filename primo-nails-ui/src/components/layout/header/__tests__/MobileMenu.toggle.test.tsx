import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'it', setLanguage: () => {}, t: (k: string) => k }),
}));
vi.mock('../../../../lib/scrollLock', () => ({ useScrollLock: () => {} }));

import { MobileMenu } from '../MobileMenu';

const navItems = [
  { label: 'Top', link: '/top' },
  {
    label: 'Gel',
    link: '/gel',
    subItems: [
      { label: 'Tutti', link: '/gel' },
      { label: 'Gel Medio', link: '/gel-medio' },
    ],
  },
];

const Where = () => <div data-testid="path">{useLocation().pathname}</div>;

const setup = (start = '/top') => {
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={[start]}>
      <MobileMenu isOpen onClose={onClose} navItems={navItems} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose };
};

describe('MobileMenu submenu chevron', () => {
  it('toggles the submenu without navigating or closing the menu', () => {
    const { onClose } = setup('/top');
    const toggle = screen.getByTestId('mobile-submenu-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Gel Medio')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Gel Medio')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/top');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts expanded when the current page is inside the section', () => {
    setup('/gel-medio');
    expect(screen.getByTestId('mobile-submenu-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Gel Medio')).toBeInTheDocument();
  });

  it('the label itself still navigates', () => {
    const { onClose } = setup('/top');
    fireEvent.click(screen.getByRole('link', { name: 'Gel' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/gel');
    expect(onClose).toHaveBeenCalled();
  });
});

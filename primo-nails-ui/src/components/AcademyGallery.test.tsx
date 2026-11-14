import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, v?: Record<string, string | number>) => (v ? `${k} ${Object.values(v).join(' ')}` : k) }),
}));
vi.mock('./GalleryLightbox', () => ({
  GalleryLightbox: ({ photos, index, onClose }: { photos: { src: string }[]; index: number; onClose: () => void }) => (
    <div role="dialog"><span data-testid="lb-src">{photos[index].src}</span><button onClick={onClose}>close</button></div>
  ),
}));

import { AcademyGallery } from './AcademyGallery';

describe('AcademyGallery', () => {
  beforeEach(() => {
    (HTMLElement.prototype as unknown as { scrollBy: unknown }).scrollBy = vi.fn();
  });

  it('shows the shared Academy photos by default and opens one enlarged', () => {
    render(<AcademyGallery />);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    fireEvent.click(screen.getAllByRole('listitem')[2]);
    expect(screen.getByTestId('lb-src').textContent).toBe('/about/course3.jpg');
    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uses the per-course photos when given', () => {
    render(<AcademyGallery images={['/a.jpg', '/b.jpg']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('listitem')[1]);
    expect(screen.getByTestId('lb-src').textContent).toBe('/b.jpg');
  });

  it('scrolls the track with the arrow buttons', () => {
    render(<AcademyGallery />);
    fireEvent.click(screen.getByLabelText('a11y.image.next'));
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalled();
  });
});

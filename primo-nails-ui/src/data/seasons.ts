export interface Season {
  name: string;
  title: string;
  description: string;
  color: string;
  image: string;
  gallery: string[];
  colors: string[];
}

export const SEASONS: Season[] = [
  {
    name: 'WINTER',
    title: 'Collezione Inverno',
    description: 'Eleganza glaciale con tonalità fredde e raffinate',
    color: '#6B8CAE',
    image: '/collections/le-stagioni/winter.png',
    gallery: ['/collections/le-stagioni/winter.png'],
    colors: ['#D9E4EC', '#A9C2D4', '#7A9EBB', '#4B7A9D', '#2C5A7D', '#1A3A5A'],
  },
  {
    name: 'AUTUMN',
    title: 'Collezione Autunno',
    description: 'Tonalità calde e avvolgenti ispirate ai colori del foliage autunnale',
    color: '#C17A4A',
    image: '/collections/le-stagioni/autumn.png',
    gallery: ['/collections/le-stagioni/autumn.png'],
    colors: ['#E8D5C4', '#D4A373', '#C17A4A', '#A0522D', '#8B4513', '#5C2E0B'],
  },
  {
    name: 'SPRING',
    title: 'Collezione Primavera',
    description: 'Freschezza e delicatezza nei toni pastello',
    color: '#E8A5B8',
    image: '/collections/le-stagioni/spring.png',
    gallery: ['/collections/le-stagioni/spring.png'],
    colors: ['#FDE2E4', '#FAD2E1', '#E8A5B8', '#D8829D', '#C55A7D', '#A03A5C'],
  },
  {
    name: 'SUMMER',
    title: 'Collezione Estate',
    description: 'Colori vivaci e luminosi per l\u2019estate',
    color: '#F4A460',
    image: '/collections/le-stagioni/summer.png',
    gallery: ['/collections/le-stagioni/summer.png'],
    colors: ['#FFE4B5', '#FFDAB9', '#F4A460', '#FF8C00', '#FF4500', '#B22222'],
  },
];

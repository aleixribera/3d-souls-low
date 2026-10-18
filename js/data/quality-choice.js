'use strict';
// Real captures of one scene at each preset; see assets/quality/README.md.
const QUALITY_CHOICES = [
  { id: 'low', name: 'Low', systems: 'Older integrated laptops', image: 'assets/quality/low.webp',
    look: 'Simple lighting', alt: 'Low: the ruined arena with simple lighting and base character detail.' },
  { id: 'high', name: 'High', systems: 'Midrange gaming computers', image: 'assets/quality/high.webp',
    look: 'Reflections and bloom', alt: 'High: the same arena with metal reflections, bloom and richer surfaces.' },
  { id: 'ultra', name: 'Ultra', systems: 'Powerful gaming computers', image: 'assets/quality/ultra.webp',
    look: 'Shadows and atmosphere', alt: 'Ultra: the same arena with shadows, atmospheric lighting and full model detail.' },
];

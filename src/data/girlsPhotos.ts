export interface GirlPhotoGallery {
  id: string;
  name: string;
  photos: string[];
}

export const girlsPhotos: GirlPhotoGallery[] = [
  {
    id: '1',
    name: 'София',
    photos: [
      'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/6147b4a2-6c60-4638-a5f4-29e331a21609.jpg',
    ],
  },
  {
    id: '2',
    name: 'Анастасия',
    photos: [
      'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/9397c83f-dbf6-4071-8280-46c17107c166.jpg',
    ],
  },
  {
    id: '3',
    name: 'Виктория',
    photos: [
      'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/b91a1828-cdb5-457c-a11a-f629175d21b9.jpg',
    ],
  },
];
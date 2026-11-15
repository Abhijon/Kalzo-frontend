import { describe, expect, it } from 'vitest';
import { artistGender, assignArtistPhotos, photoGender } from './artist-photos';

describe('artist portrait assignment', () => {
  it('gives female names female faces and male names male faces', () => {
    const names = ['Ananya Iyer', 'Rohan Sood', 'Meera Rathore', 'DJ Arjun', 'Kavya Sharma', 'Aman Mehra'];
    const artists = assignArtistPhotos(names.map((name) => ({ name })));
    const expected = ['F', 'M', 'F', 'M', 'F', 'M'];
    artists.forEach((artist, i) => {
      expect(artistGender(artist.name)).toBe(expected[i]);
      expect(photoGender(artist.photo)).toBe(expected[i]);
    });
  });

  it('gives a bride-facing Kiran Khan a woman photo, different from Sneha Khan', () => {
    const [sneha, kiran] = assignArtistPhotos([{ name: 'Sneha Khan' }, { name: 'Kiran Khan' }]);
    expect(sneha.photo).toBeTruthy();
    expect(kiran.photo).toBeTruthy();
    expect(sneha.photo).not.toBe(kiran.photo);
    expect(photoGender(kiran.photo)).toBe('F');
  });

  it('does not repeat faces in a full set of 24 listings', () => {
    const artists = assignArtistPhotos(Array.from({ length: 24 }, (_, i) => ({ name: `Performer ${i}` })));
    expect(new Set(artists.map((artist) => artist.photo)).size).toBe(24);
  });

  it('keeps the same portrait when returning to a person', () => {
    const assigned = new Map();
    const first = assignArtistPhotos([{ name: 'Meera Rathore' }], assigned)[0].photo;
    const later = assignArtistPhotos([{ name: 'Meera Rathore' }], assigned)[0].photo;
    expect(later).toBe(first);
  });
});

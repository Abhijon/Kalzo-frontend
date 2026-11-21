import snehaPhoto from '../assets/sneha-khan-portrait.jpg';
import genders from './portrait-genders.json';

// Named identities keep their own photo; everyone else is drawn from the pool below.
const namedPhotos = new Map([
  ['Sneha Khan', snehaPhoto],
]);
const namedGenders = new Map([[snehaPhoto, 'F']]);

const portraits = import.meta.glob('../assets/artist-portraits/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const photos = Object.keys(portraits).sort().map((key) => portraits[key]);

// A face should read as the name it sits under, so first names carry a gender.
const NAME_GENDER = {
  Aarav: 'M', Ananya: 'F', Ishaan: 'M', Kavya: 'F', Rohan: 'M', Meera: 'F', Arjun: 'M', Priya: 'F',
  Vikram: 'M', Nisha: 'F', Kabir: 'M', Tara: 'F', Aditya: 'M', Sana: 'F', Dev: 'M', Riya: 'F',
  Farhan: 'M', Lakshmi: 'F', Siddharth: 'M', Zoya: 'F', Neel: 'M', Gauri: 'F', Imran: 'M', Pooja: 'F',
  Harsh: 'M', Aditi: 'F', Rahul: 'M', Mira: 'F', Kiran: 'F', Anjali: 'F', Yash: 'M', Sneha: 'F',
  Varun: 'M', Diya: 'F', Nikhil: 'M', Lata: 'F', Om: 'M', Rekha: 'F', Sameer: 'M', Uma: 'F',
  Aman: 'M', Shahid: 'M',
};

export function artistGender(name) {
  const words = String(name || '').split(' ');
  for (const word of words) {
    if (NAME_GENDER[word]) return NAME_GENDER[word];
  }
  return null;
}

const ALL = photos.map((_, index) => index);
const FEMALE = ALL.filter((index) => genders[index] === 'F');
const MALE = ALL.filter((index) => genders[index] === 'M');

function poolFor(name) {
  const gender = artistGender(name);
  if (gender === 'F') return FEMALE;
  if (gender === 'M') return MALE;
  return ALL;
}

// Which face a photo is, so listings can be checked against the name above it.
export function photoGender(url) {
  if (namedGenders.has(url)) return namedGenders.get(url);
  const index = photos.indexOf(url);
  return index === -1 ? null : genders[index];
}

export function assignArtistPhotos(artists, assigned = new Map()) {
  const used = new Set();
  for (const artist of artists) {
    // Live verified artists keep their uploaded profile photo from the API.
    // Never replace a real media URL with a bundled pool face.
    const existing = String(artist.photo || "");
    if (/^https?:\/\//i.test(existing) || existing.startsWith("/api/")) continue;
    if (artist.sample === false) {
      // No inventing faces for real accounts when photo failed to resolve.
      artist.photo = existing;
      continue;
    }

    const dedicated = namedPhotos.get(artist.name);
    if (dedicated) {
      artist.photo = dedicated;
      continue;
    }
    const pool = poolFor(artist.name);
    let index = assigned.get(artist.name);
    if (index === undefined || !pool.includes(index) || used.has(index)) {
      let hash = 0;
      for (const ch of artist.name) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;
      let pos = hash % pool.length;
      for (let step = 0; used.has(pool[pos]) && step < pool.length; step += 1) pos = (pos + 1) % pool.length;
      index = pool[pos];
      assigned.set(artist.name, index);
    }
    used.add(index);
    artist.photo = photos[index];
  }
  return artists;
}

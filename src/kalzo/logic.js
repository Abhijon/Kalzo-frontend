// Ported view logic from the Kalzo design.
import { DCLogic } from "./dc";
import { assignArtistPhotos } from "./artist-photos";
import { serviceFee, bookingMoney } from "./extras/fees";
import { artistCityPrice } from "../lib/bookingPrice";
import { loadVerifiedArtistsList } from "../lib/artists.functions";

// Bookable hours for real artists until they set their own (10 AM to 10 PM).
const REAL_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"];
const artGlob = import.meta.glob("../assets/art/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});
const ART = Object.keys(artGlob)
  .sort()
  .map((k) => artGlob[k]);
import musicianPhoto from "@/assets/musician-performer.jpg";
import sampleReel from "@/assets/artist-sample-reel.mp4.asset.json";
import { nextSaved, savedCounts } from "./extras/saved";
import indiaMap from "./india-map.json";

var SAVED_KEY = "kalzo-saved";
function loadSaved() {
  try {
    if (typeof window === "undefined") return {};
    return JSON.parse(window.localStorage.getItem(SAVED_KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
}
function persistSaved(f) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(f));
  } catch (e) {}
}

function artistPhoto(artist) {
  return artist.photo;
}

export class KalzoLogic extends DCLogic {
  constructor(props) {
    super(props);
    this.publicArtists = [];
    this.artistDetails = {};
    this._verifiedReqId = 0;
    this.mediaDurations = {};
    /** GET /art-forms map: { Type: subtypes[] } — finder uses main types only. */
    this.catalogArtForms = null;
    /** GET /locations rows: [{ name, cities }] — finder prefers states. */
    this.catalogLocations = null;
    this.state = {
      screen: "home",
      locQ: "",
      loc: null,
      arts: [],
      fDay: 0,
      tod: "Any",
      price: "any",
      minStar: 0,
      onlyFree: true,
      sort: "renown",
      q: "",
      limit: 24,
      ci: 0,
      saved: loadSaved(),
      onlySaved: false,
      artistId: "a1",
      tab: "about",
      bDay: 0,
      slot: null,
      hours: 2,
      plates: 50,
      event: "birthday",
      address: "",
      area: "",
      landmark: "",
      guests: "",
      note: "",
      method: "UPI",
      esc: 0,
      otpIn: "",
      otpErr: false,
      stars: 0,
      rTags: {},
      customTag: "",
      rated: false,
      hrs: 0,
      media: "",
      flowOpen: false,
      roomOpen: false,
      tier: "all",
      maxRate: 20000,
      payBusy: false,
      payErr: "",
    };
    this.tx = null;
    this.artistPortraits = new Map();
    if (typeof window !== "undefined") {
      window.addEventListener("kalzo:booked", () =>
        this.setState({
          screen: "done",
          esc: 0,
          otpIn: "",
          otpErr: false,
          stars: 0,
          rTags: {},
          customTag: "",
          rated: false,
          payBusy: false,
          payErr: "",
        }),
      );
      window.addEventListener("kalzo:book-failed", (e) =>
        this.setState({
          payBusy: false,
          payErr:
            (e.detail && e.detail.reason) ||
            "Booking failed. Please try again.",
        }),
      );
    }
  }

  /**
   * Refetch GET /artists/verified with city/state + location tier + day availability.
   * Called when the finder location, tier, or day filter changes.
   */
  refreshVerifiedFromApi(overrides) {
    var s = Object.assign({}, this.state, overrides || {});
    var loc = s.loc;
    var params = { page: 1, limit: 100 };
    if (loc && loc.type === "city" && loc.city) {
      params.city = loc.city;
      params.tier = s.tier || "all";
    } else if (loc && loc.type === "state" && loc.state) {
      params.state = loc.state;
      params.tier = s.tier || "all";
    }
    // Availability day: -1 = Any day (at least one open weekday)
    if (s.fDay === -1) {
      params.anyDay = true;
    } else if (typeof s.fDay === "number" && s.fDay >= 0) {
      var today0 = new Date(Date.now() + 330 * 60000);
      var dt = new Date(
        Date.UTC(today0.getUTCFullYear(), today0.getUTCMonth(), today0.getUTCDate() + s.fDay),
      );
      params.date = dt.toISOString().slice(0, 10);
    }
    var reqId = ++this._verifiedReqId;
    var self = this;
    loadVerifiedArtistsList(params)
      .then(function (artists) {
        if (reqId !== self._verifiedReqId) return;
        self.publicArtists = artists;
        if (self._notify) self._notify();
      })
      .catch(function () {});
  }

  renderVals() {
    var s = this.state,
      self = this;
    var counts = savedCounts(s.saved);
    var INK = "#2A1D18",
      CREAM = "#F2E7D3",
      RUST = "#9C3A22",
      AMBER = "#E7A042",
      MUTE = "#6B5246";
    function hsh(x) {
      x = Math.imul((x >>> 16) ^ x, 0x45d9f3b);
      x = Math.imul((x >>> 16) ^ x, 0x45d9f3b);
      return ((x >>> 16) ^ x) >>> 0;
    }
    function rupees(n) {
      return "₹" + n.toLocaleString("en-IN");
    }
    function starStr(n) {
      var r = Math.round(n),
        o = "";
      for (var k = 1; k <= 5; k++) o += k <= r ? "★" : "☆";
      return o;
    }
    /** One entry per star — fill 0/50/100 so 4.5 is four full + one half. */
    function starItems(rating, hasReviews) {
      var n = hasReviews ? Math.max(0, Math.min(5, Number(rating) || 0)) : 0;
      var out = [];
      for (var i = 1; i <= 5; i++) {
        var fill = 0;
        if (n >= i) fill = 100;
        else if (n > i - 1) fill = Math.round((n - (i - 1)) * 100);
        out.push({
          fill: fill,
          // CSS var on the star shell; clip width is applied in CSS (glyph stays full-size).
          style: "--kstar-fill: " + fill + "%",
          aria: fill === 100 ? "full" : fill > 0 ? "half" : "empty",
        });
      }
      return out;
    }
    /** Legacy overlay width (home cards). */
    function starFillStyle(rating, hasReviews) {
      var pct = hasReviews ? Math.max(0, Math.min(100, Math.round((Number(rating) / 5) * 100))) : 0;
      return "width: " + pct + "%";
    }
    function pad(n) {
      return n < 10 ? "00" + n : n < 100 ? "0" + n : "" + n;
    }
    function cp(cx, cy, r) {
      return (
        "M" +
        (cx - r) +
        " " +
        cy +
        "a" +
        r +
        " " +
        r +
        " 0 1 0 " +
        2 * r +
        " 0a" +
        r +
        " " +
        r +
        " 0 1 0 " +
        -2 * r +
        " 0Z"
      );
    }
    function ep(cx, cy, rx, ry) {
      return (
        "M" +
        (cx - rx) +
        " " +
        cy +
        "a" +
        rx +
        " " +
        ry +
        " 0 1 0 " +
        2 * rx +
        " 0a" +
        rx +
        " " +
        ry +
        " 0 1 0 " +
        -2 * rx +
        " 0Z"
      );
    }

    var IC = {
      all: "M12 3l2.4 6H21l-5.3 4 2 6.5L12 16l-5.7 3.5 2-6.5L3 9h6.6z",
      mic: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M18 10v1a6 6 0 0 1-12 0v-1 M12 17v4 M9 21h6",
      harmonium:
        "M3 10h18v9H3z M3 14h18 M6 14v5 M9 14v5 M12 14v5 M15 14v5 M18 14v5 M5 10l2-5h10l2 5",
      ektara: "M12 2v13 M10 3h4 M7 17a5 4 0 1 0 10 0a5 4 0 1 0 -10 0 M12 4v17",
      sitar:
        "M19.5 2.5l2 2 M18 6l-7.2 7.2 M10.3 10.6a4 4 0 0 0-5.4.5 3.4 3.4 0 0 0-1 2.4 2.8 2.8 0 0 1-.9 2 3.7 3.7 0 0 0 5.3 5.2 2.8 2.8 0 0 1 2-.9 3.4 3.4 0 0 0 2.4-1 4 4 0 0 0 .5-5.4 M15 9l2 2 M13 11l2 2",
      tabla:
        "M3 9h7v10H3z M3 9c0-1.5 7-1.5 7 0 M13 11c0-2 8-2 8 0v6c0 2-8 2-8 0z M13 11c0 2 8 2 8 0",
      flute: "M3 18L20 5 M7.5 14.6l1 1 M10.5 12.3l1 1 M13.5 10l1 1 M16.5 7.7l1 1",
      violin:
        "M12 2v5 M9.5 7h5 M9 7c-3 1.5-3 4.5 0 5.5c-3 1-3 6 3 8.5c6-2.5 6-7.5 3-8.5c3-1 3-4 0-5.5 M12 7v14",
      guitar:
        "M19.5 2.5l2 2 M17 5l2 2 M18 6l-6.2 6.2 M10.3 10.6a4 4 0 0 0-5.4.5 3.4 3.4 0 0 0-1 2.4 2.8 2.8 0 0 1-.9 2 3.7 3.7 0 0 0 5.3 5.2 2.8 2.8 0 0 1 2-.9 3.4 3.4 0 0 0 2.4-1 4 4 0 0 0 .5-5.4 M7.5 14.5l2 2",
      dhol: "M6 6h12l2 6-2 6H6l-2-6z M6 6v12 M18 6v12 M8.5 8.5l7 7 M15.5 8.5l-7 7 M2 3l4 3 M22 3l-4 3",
      trumpet: "M2 10v4 M2 12h11 M13 9l8-4v14l-8-4z M6 12V9 M9 12V9",
      vinyl:
        "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M6 12a6 6 0 0 1 3-5.2",
      headphones:
        "M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
      dancer:
        "M14 2.5a1.6 1.6 0 1 1-.01 0 M13 6.5l-3 5 4 2-2 7.5 M13 6.5l4 3 3.5-1.5 M10 11.5l-4.5-1 M14 13.5l3 2.5 1 5.5",
      ghungroo:
        "M3 8c4 3 14 3 18 0 M4 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M9 13.5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M14 13a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M18 11a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
      quill: "M20 3C13 3 8.5 8 7.5 15L6 19l4-1.5C17 16.5 21 11 20 3z M7.5 16.5l7-7.5 M4 21h16",
      book: "M3 5c3-1 6-1 9 1c3-2 6-2 9-1v14c-3-1-6-1-9 1c-3-2-6-2-9-1z M12 6v14",
      mask: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5 M9 9.5h.01 M15 9.5h.01",
      speech: "M4 5h16v10H9l-5 4z M8 9h8 M8 12h5",
      hat: "M5 19h14 M7.5 19l1.5-9h6l1.5 9 M4 10h16 M9 15h6",
      wand: "M4 20L14 10 M17 3l1 2.5L20.5 6.5 18 7.5 17 10l-1-2.5L13.5 6.5 16 5.5z",
      cards: "M4 6h9v14H4z M10 4l9 2-3 14",
      flame:
        "M12 22c4 0 7-3 7-7 0-4.5-3.5-6.5-4.5-10-1.2 2-2.3 3-3.5 3 0-2-1-4-3-6 0 4.5-4 7-4 13 0 4 3.5 7 8 7z",
      juggle:
        "M4 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M10 4a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M16 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M4 20c2-4 4-6 8-6s6 2 8 6",
      palette:
        "M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3.5 3H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21z M7.5 10.5h.01 M10.5 7h.01 M15.5 7.5h.01",
      brush: "M14 3l7 7-7 7-7-7z M7 10l-4 7 4 4 7-4",
      pot: "M9 2.5h6 M10 2.5v3C7 6.5 5 9.5 5 13.5 5 17.6 8.1 21 12 21s7-3.4 7-7.5c0-4-2-7-5-8v-3 M6 12h12",
      needle: "M20 3L8 15 M17 3h3v3 M8 15c-3 1-5 4-3 6s5 0 6-3 M10 13c3 2 7 1 10-3",
      hand: "M18 11V6a2 2 0 0 0-4 0v4 M14 10V4a2 2 0 0 0-4 0v6 M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0 M12 15.5a1.5 1.5 0 1 0 0-.01",
      cone: "M8 3h8l-4 15z M12 18v3 M10 7h4",
      puppet:
        "M4 2h16 M8 2v6 M16 2v6 M12 2v5 M12 7a2.4 2.4 0 1 1-.01 0 M8 8l2 4 M16 8l-2 4 M9.5 12h5l1.5 6h-8z",
      phone:
        "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M10 8.5l4.5 2.5L10 13.5z",
      ring: "M5 11a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M9 11a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 18v3 M9 21h6",
      hanger:
        "M12 7.5a2.2 2.2 0 1 1 2.2-2.2 M12 7.5v2 M12 9.5L2.5 16.5a1 1 0 0 0 .6 1.8h17.8a1 1 0 0 0 .6-1.8z",
      camera: "M3 8h4l2-3h6l2 3h4v11H3z M8 13a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
      vmic: "M9 3h6v8a3 3 0 0 1-6 0z M9 6h6 M9 9h6 M5 9a7 7 0 0 0 14 0 M12 16v4 M8 21h8",
      cloche: "M3 18h18 M4.5 18a7.5 7.5 0 0 1 15 0 M12 10.5V8 M10 8h4 M2 21h20",
      handi:
        "M5 9h14 M6 9c-3 3-2 11 6 11s9-8 6-11 M9 9V7h6v2 M8 3c1 1 0 2 1 3 M12 2c1 1 0 2 1 3 M16 3c1 1 0 2 1 3",
      clipboard:
        "M9 2.5h6v3H9z M7 4H5a1 1 0 0 0-1 1v15.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2 M8.5 13.5l2.5 2.5 4.5-5",
      marigold:
        "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M5.6 18.4l2.8-2.8 M15.6 8.4l2.8-2.8",
    };
    var CATS = [
      "Folk singers",
      "Musicians",
      "Band baja",
      "DJs",
      "Dancers",
      "Poets",
      "Comedians",
      "Magicians",
      "Special acts",
      "Artists",
      "Artisans",
      "Mehendi artists",
      "Puppeteers",
      "Influencers",
      "Models",
      "Anchors",
      "Caterers",
      "Event planners",
    ];
    var CRAFTS = {
      "Folk singers": [
        ["Sufi & folk vocalist", "ektara"],
        ["Baul singer", "ektara"],
        ["Lavani singer", "mic"],
        ["Bhajan & ghazal singer", "harmonium"],
        ["Bihu singer", "mic"],
        ["Qawwal with chorus", "harmonium"],
        ["Punjabi folk singer", "mic"],
        ["Rabindra sangeet vocalist", "harmonium"],
      ],
      Musicians: [
        ["Sitar player", "sitar"],
        ["Tabla player", "tabla"],
        ["Bansuri flautist", "flute"],
        ["Violinist", "violin"],
        ["Acoustic guitarist", "guitar"],
        ["Veena player", "sitar"],
        ["Santoor player", "sitar"],
        ["Acoustic Bollywood band", "guitar"],
      ],
      "Band baja": [
        ["Baraat brass band", "trumpet"],
        ["Dhol troupe", "dhol"],
        ["Nadaswaram ensemble", "trumpet"],
        ["Punjabi dhol & bhangra", "dhol"],
      ],
      DJs: [
        ["Bollywood & Punjabi DJ", "vinyl"],
        ["Retro vinyl DJ", "vinyl"],
        ["House & sangeet DJ", "headphones"],
      ],
      Dancers: [
        ["Kathak dancer", "dancer"],
        ["Bharatanatyam dancer", "ghungroo"],
        ["Ghoomar troupe", "dancer"],
        ["Bhangra crew", "dancer"],
        ["Odissi dancer", "ghungroo"],
        ["Sangeet choreographer", "dancer"],
      ],
      Poets: [
        ["Urdu shayar", "quill"],
        ["Hindi kavi", "quill"],
        ["Dastangoi storyteller", "book"],
        ["Spoken-word poet", "book"],
      ],
      Comedians: [
        ["Clean stand-up comic", "mask"],
        ["Mimicry artist", "speech"],
        ["Improv comic", "mask"],
      ],
      Magicians: [
        ["Close-up magician", "cards"],
        ["Stage illusionist", "hat"],
        ["Kids magic show", "wand"],
      ],
      "Special acts": [
        ["Fire performer", "flame"],
        ["Juggler", "juggle"],
        ["Stilt walker", "juggle"],
        ["LED & fire show", "flame"],
      ],
      Artists: [
        ["Live caricaturist", "brush"],
        ["Portrait painter", "palette"],
        ["Rangoli artist", "palette"],
        ["Madhubani painter", "brush"],
      ],
      Artisans: [
        ["Blue pottery maker", "pot"],
        ["Terracotta potter", "pot"],
        ["Block-print workshop", "needle"],
        ["Phulkari embroiderer", "needle"],
      ],
      "Mehendi artists": [
        ["Bridal mehendi artist", "hand"],
        ["Arabic mehendi artist", "cone"],
        ["Guest mehendi team", "hand"],
      ],
      Puppeteers: [
        ["Kathputli troupe", "puppet"],
        ["Shadow puppet theatre", "puppet"],
        ["Glove puppet show", "puppet"],
      ],
      Influencers: [
        ["Lifestyle creator", "phone"],
        ["Food creator", "phone"],
        ["Travel vlogger", "ring"],
      ],
      Models: [
        ["Fashion model", "hanger"],
        ["Catalogue model", "camera"],
        ["Ramp model", "hanger"],
      ],
      Anchors: [
        ["Wedding emcee", "vmic"],
        ["Corporate host", "vmic"],
        ["Bilingual compère", "speech"],
      ],
      Caterers: [
        ["Rajasthani thali caterer", "handi"],
        ["Live chaat counter", "cloche"],
        ["South Indian breakfast counter", "cloche"],
        ["Mughlai caterer", "handi"],
        ["Bengali home-style caterer", "handi"],
      ],
      "Event planners": [
        ["Wedding planner", "marigold"],
        ["Birthday & décor planner", "clipboard"],
        ["Corporate event planner", "clipboard"],
      ],
    };
    var BASE = {
      "Folk singers": 3000,
      Musicians: 3500,
      "Band baja": 6000,
      DJs: 4000,
      Dancers: 3500,
      Poets: 2500,
      Comedians: 4500,
      Magicians: 3000,
      "Special acts": 5000,
      Artists: 2200,
      Artisans: 2000,
      "Mehendi artists": 1800,
      Puppeteers: 3000,
      Influencers: 9000,
      Models: 5000,
      Anchors: 3500,
      Caterers: 500,
      "Event planners": 30000,
    };
    var GROUPS = {
      music: ["#F3D98F", "#C9963C", "#7E5A1C", "#3E2A0E"],
      perform: ["#ECBE92", "#A8683A", "#5E3418", "#2E1A0C"],
      craft: ["#DCE2C8", "#9DAA87", "#5F6C4E", "#2A3220"],
      media: ["#F1EDE3", "#BDB6A6", "#6F6758", "#2E2A22"],
      feast: ["#F2D2C2", "#C9907A", "#8A5040", "#3A1E14"],
    };
    var CGROUP = {
      "Folk singers": "music",
      Musicians: "music",
      "Band baja": "music",
      DJs: "music",
      Dancers: "perform",
      Poets: "perform",
      Comedians: "perform",
      Magicians: "perform",
      "Special acts": "perform",
      Anchors: "perform",
      Artists: "craft",
      Artisans: "craft",
      "Mehendi artists": "craft",
      Puppeteers: "craft",
      Influencers: "media",
      Models: "media",
      Caterers: "feast",
      "Event planners": "feast",
    };

    var ST =
      "Andhra Pradesh;Telugu;Visakhapatnam,Vijayawada,Guntur,Tirupati,Nellore,Kurnool,Rajahmundry,Kakinada,Anantapur|Arunachal Pradesh;Hindi;Itanagar,Tawang,Pasighat,Ziro|Assam;Assamese;Guwahati,Dibrugarh,Jorhat,Silchar,Tezpur,Nagaon,Majuli|Bihar;Bhojpuri;Patna,Gaya,Bhagalpur,Muzaffarpur,Darbhanga,Purnia,Nalanda|Chhattisgarh;Chhattisgarhi;Raipur,Bilaspur,Durg,Bhilai,Jagdalpur|Goa;Konkani;Panaji,Margao,Vasco da Gama,Mapusa|Gujarat;Gujarati;Ahmedabad,Surat,Vadodara,Rajkot,Bhavnagar,Jamnagar,Kutch,Gandhinagar|Haryana;Haryanvi;Gurugram,Faridabad,Panipat,Ambala,Karnal,Hisar,Rohtak|Himachal Pradesh;Pahari;Shimla,Manali,Dharamshala,Mandi,Kullu,Solan|Jharkhand;Hindi;Ranchi,Jamshedpur,Dhanbad,Bokaro,Hazaribagh|Karnataka;Kannada;Bengaluru,Mysuru,Mangaluru,Hubballi,Belagavi,Udupi,Hampi|Kerala;Malayalam;Kochi,Thiruvananthapuram,Kozhikode,Thrissur,Kannur,Alappuzha,Kollam|Madhya Pradesh;Hindi;Bhopal,Indore,Gwalior,Jabalpur,Ujjain,Khajuraho|Maharashtra;Marathi;Mumbai,Pune,Nagpur,Nashik,Aurangabad,Kolhapur,Thane,Solapur|Manipur;Manipuri;Imphal,Churachandpur|Meghalaya;Khasi;Shillong,Tura,Cherrapunji|Mizoram;Mizo;Aizawl,Lunglei|Nagaland;Nagamese;Kohima,Dimapur|Odisha;Odia;Bhubaneswar,Cuttack,Puri,Rourkela,Sambalpur|Punjab;Punjabi;Amritsar,Ludhiana,Jalandhar,Patiala,Bathinda,Mohali|Rajasthan;Marwari;Jaipur,Jodhpur,Udaipur,Bikaner,Ajmer,Kota,Jaisalmer,Pushkar,Alwar,Chittorgarh|Sikkim;Nepali;Gangtok,Namchi,Pelling|Tamil Nadu;Tamil;Chennai,Coimbatore,Madurai,Tiruchirappalli,Salem,Thanjavur,Tirunelveli,Vellore|Telangana;Telugu;Hyderabad,Warangal,Nizamabad,Karimnagar,Khammam|Tripura;Bengali;Agartala,Udaipur|Uttar Pradesh;Hindi;Lucknow,Varanasi,Agra,Kanpur,Prayagraj,Noida,Ghaziabad,Mathura,Ayodhya,Meerut,Gorakhpur|Uttarakhand;Garhwali;Dehradun,Rishikesh,Haridwar,Nainital,Mussoorie|West Bengal;Bengali;Kolkata,Darjeeling,Siliguri,Durgapur,Howrah,Shantiniketan|Delhi;Hindi;New Delhi,North Delhi,South Delhi,Dwarka|Chandigarh;Punjabi;Chandigarh|Jammu and Kashmir;Kashmiri;Srinagar,Jammu,Gulmarg|Ladakh;Ladakhi;Leh,Kargil|Puducherry;Tamil;Puducherry,Karaikal|Andaman and Nicobar Islands;Hindi;Port Blair|Lakshadweep;Malayalam;Kavaratti|Dadra and Nagar Haveli and Daman and Diu;Gujarati;Daman,Silvassa,Diu";
    // Prefer GET /locations (states + cities); fall back to the bundled India list.
    var catalogLocs = self.catalogLocations;
    var STATES =
      catalogLocs && catalogLocs.length
        ? catalogLocs.map(function (r) {
            return {
              name: r.name,
              lang: "",
              cities: Array.isArray(r.cities) ? r.cities : [],
            };
          })
        : ST.split("|").map(function (x) {
            var p = x.split(";");
            return { name: p[0], lang: p[1], cities: p[2].split(",") };
          });
    // Finder art-form filter uses main types only (not subtypes) from GET /art-forms.
    var catalogForms = self.catalogArtForms;
    var ART_TYPES =
      catalogForms && typeof catalogForms === "object" && Object.keys(catalogForms).length
        ? Object.keys(catalogForms)
        : CATS;
    var FIRST = [
      "Aarav",
      "Ananya",
      "Ishaan",
      "Kavya",
      "Rohan",
      "Meera",
      "Arjun",
      "Priya",
      "Vikram",
      "Nisha",
      "Kabir",
      "Tara",
      "Aditya",
      "Sana",
      "Dev",
      "Riya",
      "Farhan",
      "Lakshmi",
      "Siddharth",
      "Zoya",
      "Neel",
      "Gauri",
      "Imran",
      "Pooja",
      "Harsh",
      "Aditi",
      "Rahul",
      "Mira",
      "Kiran",
      "Anjali",
      "Yash",
      "Sneha",
      "Varun",
      "Diya",
      "Nikhil",
      "Lata",
      "Om",
      "Rekha",
      "Sameer",
      "Uma",
    ];
    var LAST = [
      "Sharma",
      "Iyer",
      "Das",
      "Singh",
      "Khan",
      "Patel",
      "Nair",
      "Reddy",
      "Bose",
      "Gill",
      "Shaikh",
      "Rao",
      "Menon",
      "Joshi",
      "Kulkarni",
      "Banerjee",
      "Pillai",
      "Naidu",
      "Chauhan",
      "Rathore",
      "Bhati",
      "Mehta",
      "Shah",
      "Desai",
      "Thakur",
      "Verma",
      "Gupta",
      "Mishra",
      "Yadav",
      "Ansari",
      "Qureshi",
      "Hegde",
      "Shetty",
      "Gowda",
      "Kaur",
      "Sandhu",
      "Borah",
      "Sangma",
      "Lyngdoh",
      "Mohanty",
    ];
    var SLOTSETS = [
      ["11:00 AM", "4:00 PM", "7:30 PM"],
      ["12:00 PM", "6:00 PM", "9:00 PM"],
      ["10:00 AM", "2:00 PM", "8:00 PM"],
      ["5:00 PM", "7:00 PM", "9:30 PM"],
    ];
    var GROUPCAT = {
      "Band baja": " Band",
      Caterers: " Caterers",
      "Event planners": " Events",
      Puppeteers: " Troupe",
    };

    var A = [
      [
        "a1",
        "Priya Bhati",
        "Folk singers",
        "Sufi & Marwari folk vocalist",
        "Jodhpur",
        "Rajasthan",
        ["Jaipur", "Udaipur"],
        3000,
        4.9,
        126,
        1,
        SLOTSETS[0],
        "Hindi, Marwari, Urdu",
        "Sings Sufi kalaam and Marwari folk with a harmonium and dholak player. Loves intimate house mehfils and sangeets.",
        "hour",
        "ektara",
      ],
      [
        "a2",
        "Rohan the Magician",
        "Magicians",
        "Close-up magic & stage illusions",
        "Jaipur",
        "Rajasthan",
        ["Jodhpur"],
        2500,
        4.8,
        89,
        2,
        SLOTSETS[1],
        "Hindi, English",
        "Card work, mind reading and a 45-minute children’s programme that ends with balloon art for every guest.",
        "hour",
        "hat",
      ],
      [
        "a3",
        "Meera Rathore",
        "Dancers",
        "Kathak & Ghoomar performer",
        "Udaipur",
        "Rajasthan",
        ["Jodhpur"],
        3500,
        4.9,
        64,
        3,
        SLOTSETS[3],
        "Hindi, Rajasthani",
        "Classical Kathak solos and Ghoomar ensembles. Will also teach guests a short routine for the sangeet.",
        "hour",
        "ghungroo",
      ],
      [
        "a4",
        "The Thar Strings",
        "Musicians",
        "Acoustic quartet of film melodies",
        "Jodhpur",
        "Rajasthan",
        ["Jaipur"],
        6000,
        4.7,
        152,
        4,
        SLOTSETS[1],
        "Hindi, English",
        "Guitar, cajon, violin and voice. Old film songs to new, with requests taken from the floor.",
        "hour",
        "guitar",
      ],
      [
        "a5",
        "Ishaan Sketches",
        "Artists",
        "Caricaturist & portrait sketcher",
        "New Delhi",
        "Delhi",
        ["South Delhi", "Dwarka"],
        2000,
        4.8,
        210,
        5,
        SLOTSETS[2],
        "Hindi, English",
        "Draws twelve to fifteen guests an hour. Each sitter takes home a signed sketch as a keepsake.",
        "hour",
        "brush",
      ],
      [
        "a6",
        "Lakshmi Pottery",
        "Artisans",
        "Blue pottery & live clay workshop",
        "Jaipur",
        "Rajasthan",
        ["Jodhpur", "Udaipur"],
        1800,
        4.9,
        47,
        6,
        SLOTSETS[2],
        "Hindi",
        "Brings a portable wheel. Guests throw and paint a small vessel of their own, fired and delivered afterwards.",
        "hour",
        "pot",
      ],
      [
        "a7",
        "Shahid Band Baja",
        "Band baja",
        "Twelve-piece baraat brass band",
        "Jodhpur",
        "Rajasthan",
        ["Bikaner", "Jaipur"],
        5500,
        4.6,
        301,
        7,
        SLOTSETS[1],
        "Hindi, Marwari",
        "Brass, dhol and lamp-bearers in matching livery. Knows every wedding favourite by heart.",
        "hour",
        "trumpet",
      ],
      [
        "a8",
        "Kavya Sharma",
        "Poets",
        "Hindi & Urdu verse; mushaira host",
        "Jaipur",
        "Rajasthan",
        [],
        2200,
        4.9,
        38,
        8,
        SLOTSETS[3],
        "Hindi, Urdu",
        "Composes verses to order for birthdays and anniversaries, and recites shayari to a room of admirers.",
        "hour",
        "quill",
      ],
      [
        "a9",
        "Aman Mehra",
        "Comedians",
        "Clean humour for families & offices",
        "South Delhi",
        "Delhi",
        ["New Delhi"],
        4000,
        4.5,
        73,
        9,
        SLOTSETS[3],
        "Hindi, English",
        "A gentle programme of observation, crowd work and a good-natured toast to the guest of honour.",
        "hour",
        "mask",
      ],
      [
        "a10",
        "Kathputli Kala Mandal",
        "Puppeteers",
        "Rajasthani string-puppet theatre",
        "Udaipur",
        "Rajasthan",
        ["Jodhpur", "Jaipur"],
        2800,
        4.8,
        56,
        10,
        SLOTSETS[0],
        "Hindi, Rajasthani",
        "The traditional kathputli play with live music, admired by children and visiting guests alike.",
        "hour",
        "puppet",
      ],
      [
        "a11",
        "Nisha Mehendi",
        "Mehendi artists",
        "Bridal & guest mehendi",
        "Jodhpur",
        "Rajasthan",
        ["Udaipur"],
        1500,
        4.9,
        412,
        11,
        SLOTSETS[2],
        "Hindi, Marwari",
        "Bridal designs of great detail, with a company of four to attend to some twenty guest hands an hour.",
        "hour",
        "hand",
      ],
      [
        "a14",
        "DJ Arjun",
        "DJs",
        "Bollywood & Punjabi DJ, own setup",
        "Jodhpur",
        "Rajasthan",
        ["Jaipur", "Udaipur"],
        3500,
        4.8,
        198,
        14,
        SLOTSETS[3],
        "Hindi, English",
        "Brings sound and lights for up to a hundred and fifty guests, and keeps the floor full till the last song.",
        "hour",
        "vinyl",
      ],
      [
        "a17",
        "Marwar Rasoi",
        "Caterers",
        "Rajasthani thali caterer",
        "Jodhpur",
        "Rajasthan",
        ["Udaipur", "Bikaner"],
        450,
        4.8,
        267,
        17,
        SLOTSETS[2],
        "Hindi, Marwari",
        "Dal baati churma, gatte ki sabzi, a live jalebi counter and more. Staff and crockery included, from twenty-five plates.",
        "plate",
        "handi",
      ],
    ];
    var langOf = {};
    STATES.forEach(function (st) {
      langOf[st.name] = st.lang;
    });
    var STATE_IDX = {};
    STATES.forEach(function (st, i) {
      STATE_IDX[st.name] = i;
    });
    var TOPC = STATES.map(function (st) {
      return { city: st.cities[0], state: st.name };
    });
    var all = A.map(function (r) {
      return {
        id: r[0],
        name: r[1],
        cat: r[2],
        craft: r[3],
        city: r[4],
        state: r[5],
        travels: r[6],
        rate: r[7],
        rating: r[8],
        reviews: r[9],
        seed: r[10] * 7919,
        slots: r[11],
        langs: r[12],
        bio: r[13],
        unit: r[14],
        icon: r[15],
      };
    });
    all = all.slice(0, 1).map(function (a) {
      return Object.assign({}, a, {
        name: "Kalzo Sample Artist",
        rating: 0,
        reviews: 0,
        sample: true,
      });
    });
    var realArtists = (self.publicArtists || []).map(function (p, i) {
      var detail = (self.artistDetails && self.artistDetails[p.id]) || {};
      var photo =
        detail.photo ||
        detail.photo_url ||
        p.photo ||
        p.photo_url ||
        "";
      var artPhoto =
        detail.artPhoto ||
        detail.art_photo_url ||
        p.artPhoto ||
        p.art_photo_url ||
        "";
      var faceVideoUrl =
        detail.faceVideoUrl ||
        detail.face_video_url ||
        p.faceVideoUrl ||
        p.face_video_url ||
        "";
      var reelUrls =
        (detail.reelUrls && detail.reelUrls.length && detail.reelUrls) ||
        (detail.reel_urls && detail.reel_urls.length && detail.reel_urls) ||
        p.reelUrls ||
        p.reel_urls ||
        [];
      var primaryReel = Number(
        detail.primary_reel != null
          ? detail.primary_reel
          : detail.primaryReel != null
            ? detail.primaryReel
            : p.primary_reel != null
              ? p.primary_reel
              : p.primaryReel != null
                ? p.primaryReel
                : 0,
      );
      return {
        id: p.id,
        name: detail.stage_name || p.stage_name || "",
        cat: detail.discipline || p.discipline || "",
        // Subcategory is the specialty line on the card (e.g. Guitarist).
        craft: detail.subcategory || p.subcategory || detail.discipline || p.discipline || "",
        city: detail.base_city || p.base_city || "",
        state: detail.state_name || p.state_name || "",
        travels: detail.preferred_cities || p.preferred_cities || [],
        preferredStates: detail.preferred_states || p.preferred_states || [],
        rate: Number(detail.rate_inr != null ? detail.rate_inr : p.rate_inr) || 0,
        rating: Number(
          detail.avg_rating != null
            ? detail.avg_rating
            : detail.rating != null
              ? detail.rating
              : p.avg_rating != null
                ? p.avg_rating
                : p.rating != null
                  ? p.rating
                  : 0,
        ),
        reviews: Number(
          detail.review_count != null
            ? detail.review_count
            : detail.reviews != null
              ? detail.reviews
              : p.review_count != null
                ? p.review_count
                : p.reviews != null
                  ? p.reviews
                  : 0,
        ),
        reviewList: detail.reviewList || p.reviewList || [],
        ratingBreakdown: detail.ratingBreakdown || p.ratingBreakdown || null,
        seed: i + 100,
        slots: REAL_SLOTS,
        pricing: detail.pricing || p.pricing || {
          rate_inr: Number(detail.rate_inr != null ? detail.rate_inr : p.rate_inr) || 0,
          pricing_unit: detail.pricing_unit || p.pricing_unit || "hour",
          travel_setting: detail.travel_setting || p.travel_setting || "including",
          travel_charge_inr: Number(detail.travel_charge_inr != null ? detail.travel_charge_inr : p.travel_charge_inr) || 0,
          stay_charge_inr: Number(detail.stay_charge_inr != null ? detail.stay_charge_inr : p.stay_charge_inr) || 0,
          city_rates: detail.city_rates || p.city_rates || {},
        },
        langs: "",
        bio: detail.bio || p.bio || "",
        unit: detail.pricing_unit || p.pricing_unit || "hour",
        icon: (CRAFTS[detail.discipline || p.discipline] || [["", "mic"]])[0][1],
        // Main poster + circle avatar + live face video from API S3 URLs.
        photo: photo,
        artPhoto: artPhoto,
        faceVideoUrl: faceVideoUrl,
        reelUrls: reelUrls,
        primaryReel: primaryReel,
        availability: detail.availability || p.availability || [],
        weekAvailability:
          detail.weekAvailability || p.weekAvailability || detail.availability || p.availability || [],
        currentCity: detail.current_city || p.current_city || "",
        currentState: detail.current_state || p.current_state || "",
        travelSetting: detail.travel_setting || p.travel_setting || "including",
        instagram: detail.instagram || p.instagram || "",
        sample: false,
      };
    });
    all = all.concat(realArtists);
    /** Backend weekday 0=Sunday … 6=Saturday from ISO date */
    function weekdayFromIso(iso) {
      var p = String(iso || "").split("-");
      if (p.length < 3) return 0;
      return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    }
    function dayOff(a, d) {
      if (a.sample) return false;
      // Finder "Any day" (-1) or out-of-range index — not a concrete diary day.
      if (!dates || typeof d !== "number" || d < 0 || !dates[d]) return false;
      var week = a.weekAvailability || [];
      if (week.length) {
        var wd = weekdayFromIso(dates[d].iso);
        var row = week.find(function (v) {
          return Number(v.weekday) === wd;
        });
        // Explicit closed, or weekday row missing → treat as unavailable.
        return !(row && row.isActive);
      }
      var legacy = a.availability || [];
      if (legacy.length) {
        return !legacy.some(function (v) {
          return v.day === d;
        });
      }
      // No schedule loaded yet — don't hide the card; OPEN/CLOSED strip stays empty-data open.
      return false;
    }
    function slotFree(a, d, si) {
      if (a.sample) return true;
      if (dayOff(a, d)) return false;
      // Real artists: no time slots — whole weekday is open or closed.
      if (a.weekAvailability && a.weekAvailability.length) return true;
      if (d === 0 && a.slots[si]) {
        var nowH = new Date().getHours() + new Date().getMinutes() / 60;
        if (hourOf(a.slots[si]) < nowH + 2) return false;
      }
      return true;
    }
    function hourOf(t) {
      var p = t.split(/[: ]/),
        h = +p[0] % 12;
      return h + (p[2] === "PM" ? 12 : 0) + +p[1] / 60;
    }
    var TODR = {
      Any: [0, 24],
      Morning: [0, 12],
      Afternoon: [12, 16],
      Evening: [16, 20],
      Night: [20, 24],
    };
    function hasAnyOpenDay(a) {
      if (a.sample) return true;
      var week = a.weekAvailability || [];
      if (week.length) {
        return week.some(function (v) {
          return !!v.isActive;
        });
      }
      // No schedule loaded — don't hide the card.
      return true;
    }
    function freeSlots(a, d, tod) {
      if (d === -1) {
        return hasAnyOpenDay(a) ? ["Available"] : [];
      }
      if (a.weekAvailability && a.weekAvailability.length) {
        return dayOff(a, d) ? [] : ["Open"];
      }
      var r = TODR[tod || "Any"];
      return a.slots.filter(function (t, si) {
        var h = hourOf(t);
        return slotFree(a, d, si) && h >= r[0] && h < r[1];
      });
    }
    function freeOn(a, d) {
      if (d === -1) return hasAnyOpenDay(a);
      return !dayOff(a, d);
    }
    function maxHrs(a) {
      return 2 + ((a.seed >>> 19) % 5);
    }

    var DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      DOWL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    // The next 14 days from today (India time), so the calendar never goes stale.
    var MON = [], dates = [];
    var today0 = new Date(Date.now() + 330 * 60000);
    for (var i = 0; i < 14; i++) {
      var dt = new Date(Date.UTC(today0.getUTCFullYear(), today0.getUTCMonth(), today0.getUTCDate() + i));
      MON.push(MONTHS[dt.getUTCMonth()]);
      dates.push({
        d: (dt.getUTCDay() + 6) % 7,
        num: dt.getUTCDate(),
        month: MONTHS_LONG[dt.getUTCMonth()],
        iso: dt.toISOString().slice(0, 10),
      });
    }
    function dayLong(d) {
      if (d === -1) return "Any day";
      return (
        (d === 0 ? "Tonight, " : d === 1 ? "Tomorrow, " : "") +
        DOWL[dates[d].d] +
        " " +
        dates[d].num +
        " " +
        dates[d].month
      );
    }
    function dayShort(d) {
      if (d === -1) return "Any day";
      return d === 0
        ? "Tonight"
        : d === 1
          ? "Tomorrow"
          : DOWL[dates[d].d].slice(0, 3) + " " + dates[d].num + " " + MON[d];
    }
    function pill(on) {
      return (
        "display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; border: 1px solid " +
        INK +
        "; padding: 6px 13px; min-height: 36px; font-size: 16px; background: " +
        (on ? INK : "transparent") +
        "; color: " +
        (on ? CREAM : INK)
      );
    }
    function pillD(on) {
      return (
        "border-radius: 999px; border: 1px solid " +
        INK +
        "; padding: 8px 16px; min-height: 40px; font-size: 18px; font-style: italic; background: " +
        (on ? INK : "transparent") +
        "; color: " +
        (on ? CREAM : INK)
      );
    }
    function hrsBtn(on) {
      return (
        "width: 100%; min-height: 34px; padding: 0 4px; border: 1px solid " +
        INK +
        "; border-radius: 2px; background: " +
        (on ? INK : "transparent") +
        "; color: " +
        (on ? CREAM : INK) +
        "; font-family: DM Mono, monospace; font-size: 13px; letter-spacing: .06em; cursor: pointer;"
      );
    }
    function tileStyle(on) {
      return (
        "flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 92px; padding: 14px 10px; box-sizing: border-box; border: 1px solid " +
        INK +
        "; border-radius: 46px 46px 6px 6px; background: " +
        (on ? INK : "transparent") +
        "; color: " +
        (on ? CREAM : INK) +
        "; font-family: DM Mono, monospace; font-size: 11px; letter-spacing: 0.14em; cursor: pointer"
      );
    }
    function txt(on) {
      return (
        "background: none; border: none; padding: 6px 4px; min-height: 36px; font-size: 17px; color: " +
        (on ? RUST : INK) +
        "; font-style: " +
        (on ? "italic" : "normal") +
        "; text-decoration: " +
        (on ? "underline" : "none") +
        "; text-underline-offset: 4px"
      );
    }
    function unitWord(a) {
      return a.unit === "plate" ? "/ plate" : a.unit === "event" ? "/ event" : "/ hr";
    }
    function medStyle(cat, size) {
      var g = GROUPS[CGROUP[cat]];
      return (
        "flex: none; width: " +
        size +
        "px; height: " +
        size +
        "px; border-radius: 999px; border: none; padding: 0; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 34% 28%, " +
        g[0] +
        ", " +
        g[1] +
        " 60%, " +
        g[2] +
        "); box-shadow: inset 0 0 0 2px rgba(255,250,232,.5), inset 0 0 0 3px " +
        g[2] +
        ", 0 2px 0 " +
        g[2] +
        ", 0 4px 8px rgba(42,29,24,.22)"
      );
    }
    function medInk(cat) {
      return GROUPS[CGROUP[cat]][3];
    }

    // ---- illustrations (animated) ----
    function P(d, c, f, st, w, o) {
      return {
        d: d,
        c: c || "",
        f: f || "none",
        s: st || INK,
        w: w || 2.2,
        o: o ? "transform-origin: " + o : "",
      };
    }
    function IL(fillD, fillC, base, bs, p1, p2, p3) {
      var z = P("");
      p1 = p1 || z;
      p2 = p2 || z;
      p3 = p3 || z;
      return {
        fillD: fillD,
        fillC: fillC || "none",
        base: base,
        bs: bs || INK,
        a1: p1.d,
        c1: p1.c,
        f1: p1.f,
        s1: p1.s,
        w1: p1.w,
        o1: p1.o,
        a2: p2.d,
        c2: p2.c,
        f2: p2.f,
        s2: p2.s,
        w2: p2.w,
        o2: p2.o,
        a3: p3.d,
        c3: p3.c,
        f3: p3.f,
        s3: p3.s,
        w3: p3.w,
        o3: p3.o,
      };
    }
    function note(x, y) {
      return "M" + x + " " + y + "V" + (y - 18) + "q9 2 9 11" + ep(x - 5, y, 5, 4);
    }
    var ILL = {
      "Folk singers": IL(
        ep(100, 142, 34, 28),
        "#C9853E",
        "M100 28V128 M88 34h24 M100 34V168 M84 168h32" + ep(100, 150, 9, 6),
        INK,
        P(note(142, 74), "knote", "none", INK, 2.4, "140px 60px"),
        P(note(128, 100), "knote kd2", "none", INK, 2.4, "128px 90px"),
        P(note(62, 90), "knote kd3", "none", INK, 2.4, "60px 80px"),
      ),
      Musicians: IL(
        ep(66, 150, 32, 26) + ep(156, 42, 11, 9),
        "#B5733A",
        "M84 134L150 50 M94 142L160 58 M104 118l8 7 M116 103l8 7 M128 88l8 7 M140 73l8 7",
        INK,
        P("M60 156L154 40 M66 160L160 44", "kvib", "none", "#3A2416", 1.4),
        P(note(176, 106), "knote", "none", INK, 2.4, "170px 96px"),
        P(note(36, 92), "knote kd2", "none", INK, 2.4, "34px 84px"),
      ),
      "Band baja": IL(
        "M50 92H150V150H50Z",
        "#B5502E",
        "M50 92L75 150 M75 92L100 150 M100 92L125 150 M125 92L150 150 M50 150L75 92 M75 150L100 92 M100 150L125 92 M125 150L150 92",
        CREAM,
        P("M36 52L74 90", "kbeatL", "none", "#5A3D2A", 4.5, "36px 52px"),
        P("M166 50Q154 72 130 90", "kbeatR", "none", "#5A3D2A", 4.5, "166px 50px"),
        P("M100 72V60 M84 76l-7-9 M116 76l7-9", "kflash", "none", AMBER, 3, "100px 70px"),
      ),
      DJs: IL(
        "M30 62H170V158H30Z",
        "#6F4E49",
        "M156 72V122L138 138 M150 72h12",
        CREAM,
        P(cp(100, 110, 42), "kspinA", "#1E1410", "#1E1410", 2, "100px 110px"),
        P(
          cp(100, 110, 32) + "M80 92a26 26 0 0 1 22 -9",
          "kspinA",
          "none",
          "#7A6555",
          1.4,
          "100px 110px",
        ),
        P(cp(100, 110, 12) + "M100 98v6", "kspinA", AMBER, INK, 2, "100px 110px"),
      ),
      Dancers: IL(
        "",
        "none",
        cp(100, 40, 10) + "M100 50V94 M100 62L76 42 M100 62L126 44 M94 150V170 M106 150V170",
        INK,
        P("M100 92L58 150Q100 164 142 150Z", "ktwirl", "#9C3A22", INK, 2, "100px 92px"),
        P("M76 42Q56 74 70 104", "kswing", "none", AMBER, 3, "76px 42px"),
        P(cp(92, 170, 3) + cp(108, 170, 3), "kflash", AMBER, INK, 1.4, "100px 170px"),
      ),
      Poets: IL(
        "M40 118H140V172H40Z",
        "#F4ECDD",
        "M164 26C132 44 112 74 106 112 M106 112l-4 12 M124 68l20-14 M114 88l22-10",
        INK,
        P("M52 136c8-6 14 6 22 0s14 6 22 0 14 6 22 0", "kdraw", "none", "#3A2416", 2),
        P("M52 154c8-6 14 6 22 0s14 6 22 0", "kdraw kd2", "none", "#3A2416", 2),
        P("M150 98H172V122H150Z", "", INK, INK, 2),
      ),
      Comedians: IL(
        "",
        "none",
        "",
        INK,
        P("M58 48H142V100C142 136 122 158 100 158S58 136 58 100Z", "kbob", AMBER, INK, 2.2),
        P("M76 82q9-9 18 0 M106 82q9-9 18 0 M78 112q22 26 44 0", "kbob", "none", INK, 3),
        P(
          "M152 52l12-8 M156 66l14-2 M48 52l-12-8 M44 66l-14-2",
          "kflash",
          "none",
          RUST,
          3,
          "100px 60px",
        ),
      ),
      Magicians: IL(
        "M70 58H130V132H70Z M48 132H152V146H48Z",
        INK,
        "M136 158L172 116 M168 120l8-8",
        INK,
        P("M70 112H130V124H70Z", "", RUST, INK, 1.5),
        P("M176 90l3 8 8 3-8 3-3 8-3-8-8-3 8-3z", "kflash", AMBER, AMBER, 1, "176px 104px"),
        P(
          "M150 74l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M188 128l2 4 4 2-4 2-2 4-2-4-4-2 4-2z",
          "kflash kd2",
          AMBER,
          AMBER,
          1,
          "170px 100px",
        ),
      ),
      "Special acts": IL(
        "",
        "none",
        "M80 174L92 102 M120 174L108 102",
        "#5A3D2A",
        P(
          "M92 102C76 92 80 70 92 56C94 70 104 76 100 90C98 98 94 100 92 102Z",
          "kflame",
          AMBER,
          RUST,
          1.5,
          "92px 102px",
        ),
        P(
          "M108 102C100 90 104 72 114 60C114 74 124 80 118 92C116 98 112 100 108 102Z",
          "kflame kd2",
          "#D4622A",
          RUST,
          1.5,
          "108px 102px",
        ),
        P(
          "M92 98C86 92 88 84 92 78C94 86 98 88 94 96Z",
          "kflame",
          "#FFF1C2",
          "none",
          1,
          "92px 98px",
        ),
      ),
      Artists: IL(
        "M50 38H150V118H50Z",
        "#F4ECDD",
        "M70 118L56 176 M130 118L144 176 M100 118V170 M60 150H140",
        INK,
        P("M62 98c14-24 30 8 44-14s26 10 34-6", "kdraw", "none", RUST, 6),
        P(cp(84, 64, 10), "", AMBER, "none", 1),
        P("M150 156L178 116 M176 114l7-9", "kbob", "none", "#5A3D2A", 3),
      ),
      Artisans: IL(
        ep(100, 162, 62, 13),
        "#6F4E49",
        "",
        INK,
        P(cp(100, 100, 50), "kspinA", "#F4ECDD", INK, 2, "100px 100px"),
        P(
          cp(100, 100, 38) +
            "M100 70q10 15 0 30q-10-15 0-30Z M130 100q-15 10-30 0q15-10 30 0Z" +
            cp(76, 100, 5),
          "kspinA",
          "none",
          "#3F5E7A",
          3,
          "100px 100px",
        ),
      ),
      "Mehendi artists": IL(
        "M72 172V104C72 96 82 96 82 104V60C82 52 94 52 94 60V98V52C94 44 106 44 106 52V98V58C106 50 118 50 118 58V112C124 102 136 106 132 116L118 146C112 160 104 172 88 172Z",
        "#E8C9A8",
        "",
        INK,
        P(cp(96, 124, 11) + "M96 113V92 M84 146c8 7 18 7 26 0", "kdraw", "none", "#7A3B1A", 2.2),
        P("M146 56L164 38L174 48L156 66Z M146 56L138 64", "kbob", "#C9853E", INK, 2),
      ),
      Puppeteers: IL(
        "",
        "none",
        "M58 30H142 M100 20V40",
        INK,
        P(
          "M70 30L86 96 M130 30L114 96 M100 30V68" + cp(100, 78, 10) + "M92 138V164 M108 138V164",
          "kswing",
          "none",
          INK,
          1.6,
          "100px 30px",
        ),
        P("M86 92H114L122 138H78Z M88 74Q100 60 112 74Z", "kswing", RUST, INK, 2, "100px 30px"),
      ),
      Influencers: IL(
        "M70 38H130V162H70Z",
        INK,
        "",
        INK,
        P("M76 50H124V146H76Z", "", "#E2C27A", "none", 1),
        P(cp(90, 64, 5), "kflash", "#D23B2A", "none", 1, "90px 64px"),
        P(
          "M152 84c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8Z",
          "knote",
          RUST,
          "none",
          1,
          "152px 90px",
        ),
      ),
      Models: IL(
        "M40 70H160V146H40Z M70 56H110V70H70Z",
        INK,
        cp(100, 108, 24),
        "#E2C27A",
        P(cp(100, 108, 15), "", "#5E6B5A", "#E2C27A", 2),
        P(cp(146, 50, 8), "", "#FFF1C2", INK, 2),
        P(
          "M146 32V22 M160 38l8-6 M132 38l-8-6 M164 50h10 M128 50h-10",
          "kflash",
          "none",
          AMBER,
          3,
          "146px 50px",
        ),
      ),
      Anchors: IL(
        "M80 38H120V96A20 20 0 0 1 80 96Z",
        "#B9A98E",
        "M84 52H116 M84 62H116 M84 72H116 M84 82H116 M100 116V170 M76 170H124",
        INK,
        P("M136 60q12 16 0 32 M148 50q20 26 0 52", "kwave", "none", AMBER, 3, "130px 76px"),
        P("M64 60q-12 16 0 32 M52 50q-20 26 0 52", "kwave kd2", "none", AMBER, 3, "70px 76px"),
      ),
      Caterers: IL(
        "M54 100H146C150 140 130 164 100 164S50 140 54 100Z",
        "#8E4A3E",
        "M48 98H152 M70 98V88H130V98 M62 164H138",
        INK,
        P("M80 78c-8-10 8-16 0-26", "ksteam", "none", MUTE, 2.6, "80px 66px"),
        P("M100 74c-8-10 8-16 0-26", "ksteam kd2", "none", MUTE, 2.6, "100px 62px"),
        P("M120 78c-8-10 8-16 0-26", "ksteam kd3", "none", MUTE, 2.6, "120px 66px"),
      ),
      "Event planners": IL(
        "",
        "none",
        "M30 50Q100 92 170 50",
        INK,
        P(
          "M50 60V98 M75 68V114 M100 71V122 M125 68V114 M150 60V98",
          "kswing",
          "none",
          INK,
          1.6,
          "100px 60px",
        ),
        P(
          cp(50, 104, 7) + cp(75, 120, 7) + cp(100, 128, 7) + cp(125, 120, 7) + cp(150, 104, 7),
          "kswing",
          AMBER,
          "#C2541E",
          2,
          "100px 60px",
        ),
        P("M62 62l8 14 8-14Z M92 70l8 14 8-14Z M122 62l8 14 8-14Z", "", "#55624F", INK, 1.2),
      ),
    };
    var DISC = [
      "radial-gradient(ellipse at 50% 35%, #F6E9CC 0%, #DCC49A 58%, #B39168 100%)",
      "radial-gradient(ellipse at 50% 35%, #F8DCA8 0%, #E2A75A 60%, #B87634 100%)",
      "radial-gradient(ellipse at 50% 35%, #E6E8D3 0%, #ADB89B 58%, #7D8B6E 100%)",
      "radial-gradient(ellipse at 50% 35%, #F5DFD2 0%, #D2A48E 58%, #A0705B 100%)",
    ];
    function discStyle(i, size) {
      return (
        "width: " +
        size +
        "px; height: " +
        size +
        "px; border-radius: 999px; border: none; padding: 0; display: flex; align-items: center; justify-content: center; background: " +
        DISC[i % 4] +
        "; outline: 1px dashed rgba(42,29,24,.35); outline-offset: -" +
        Math.round(size * 0.07) +
        "px; box-shadow: inset 0 0 0 8px rgba(255,250,232,.3), inset 0 0 0 9px rgba(42,29,24,.3), 0 22px 40px rgba(42,29,24,.25)"
      );
    }

    var ccount = {};
    all.forEach(function (a) {
      ccount[a.cat] = (ccount[a.cat] || 0) + 1;
    });
    var ci = s.ci;
    var carousel = CATS.map(function (c, i) {
      var d = i - ci,
        ad = Math.abs(d);
      return Object.assign({}, ILL[c], {
        label: c,
        labelUp: c.toUpperCase(),
        count: (ccount[c] || 0) + " PROFILES",
        isCenter: d === 0,
        aria: d === 0 ? c : "Show " + c,
        focus: function () {
          self.setState({ ci: i });
        },
        choose: function () {
          self.setState({ arts: [c], limit: 24, onlySaved: false });
        },
        disc: discStyle(i, 180),
        wrap:
          "flex: none; width: 180px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; transition: transform .6s cubic-bezier(.3,.7,.3,1), opacity .6s; transform: scale(" +
          (ad === 0 ? 1 : 0.72) +
          "); opacity: " +
          (ad === 0 ? 1 : ad === 1 ? 0.6 : ad === 2 ? 0.3 : 0) +
          ";",
      });
    });
    var trackStyle =
      "position: absolute; left: 50%; top: 0; display: flex; gap: 30px; transition: transform .6s cubic-bezier(.3,.7,.3,1); transform: translateX(-" +
      (ci * 210 + 90) +
      "px)";

    // ---- location ----
    var cityCount = {},
      stateCount = {};
    function bumpState(st) {
      if (!st) return;
      stateCount[st] = (stateCount[st] || 0) + 1;
    }
    all.forEach(function (a) {
      var k = a.city + "|" + a.state;
      cityCount[k] = (cityCount[k] || 0) + 1;
      bumpState(a.state);
      bumpState(a.currentState);
      (a.preferredStates || []).forEach(bumpState);
    });
    var loc = s.loc;
    function normPlace(v) {
      return String(v || "")
        .trim()
        .toLowerCase();
    }
    function sameName(a, b) {
      return !!a && !!b && normPlace(a) === normPlace(b);
    }
    /** Live "current" place from the artist profile (not inventing visits). */
    function currentOf(a) {
      if (!a.currentCity && !a.currentState) return null;
      return { city: a.currentCity || "", state: a.currentState || "" };
    }
    /**
     * Location match for finder:
     * - state pick → base / current / preferred states (and preferred cities in that state)
     * - city pick → base / current / preferred cities
     * Tier filter narrows; default "all" returns closest match label for sort.
     */
    function matchOf(a) {
      if (!loc) return "any";
      var isSt = loc.type === "state";
      var cur = currentOf(a);
      var base = isSt
        ? sameName(a.state, loc.state)
        : sameName(a.city, loc.city) && sameName(a.state, loc.state);
      var current = cur
        ? isSt
          ? sameName(cur.state, loc.state)
          : sameName(cur.city, loc.city) && sameName(cur.state || a.state, loc.state)
        : false;
      var pref = false;
      if (isSt) {
        pref = (a.preferredStates || []).some(function (st) {
          return sameName(st, loc.state);
        });
        if (!pref) {
          // Preferred city that belongs to this state's catalog city list.
          var stRow = STATE_IDX[loc.state] != null ? STATES[STATE_IDX[loc.state]] : null;
          var citySet = stRow ? stRow.cities.map(normPlace) : [];
          pref = (a.travels || []).some(function (c) {
            return citySet.indexOf(normPlace(c)) >= 0;
          });
        }
      } else {
        pref = (a.travels || []).some(function (c) {
          return sameName(c, loc.city);
        });
      }
      var t = s.tier;
      if (t === "base") return base ? "base" : "";
      if (t === "pref") return pref ? "pref" : "";
      if (t === "visiting" || t === "current") return current ? "current" : "";
      if (current) return "current";
      if (base) return "base";
      if (pref) return "pref";
      return "";
    }
    function inLoc(a) {
      return !!matchOf(a);
    }
    var lq = s.locQ.trim().toLowerCase(),
      locLabel = loc ? (loc.type === "state" ? loc.state : loc.city + ", " + loc.state) : "";
    var sugg = [];
    if (lq.length > 0 && s.locQ !== locLabel) {
      var hits = [];
      STATES.forEach(function (st) {
        var sn = st.name.toLowerCase();
        if (sn.indexOf(lq) >= 0)
          hits.push({
            rank: sn.indexOf(lq) === 0 ? 0 : 2,
            label: st.name,
            sub: "entire state",
            count: stateCount[st.name] || 0,
            v: { type: "state", state: st.name },
          });
        st.cities.forEach(function (c) {
          var cn = c.toLowerCase();
          if (cn.indexOf(lq) >= 0)
            hits.push({
              rank: cn.indexOf(lq) === 0 ? 1 : 3,
              label: c,
              sub: st.name,
              count: cityCount[c + "|" + st.name] || 0,
              v: { type: "city", city: c, state: st.name },
            });
        });
      });
      hits.sort(function (x, y) {
        return x.rank - y.rank || y.count - x.count;
      });
      sugg = hits.slice(0, 8).map(function (h) {
        return {
          label: h.label,
          sub: "· " + h.sub,
          count: h.count + " ARTISTS",
          pick: function () {
            var patch = {
              loc: h.v,
              locQ: h.v.type === "state" ? h.v.state : h.v.city + ", " + h.v.state,
              tier: "all",
              limit: 24,
            };
            self.setState(patch);
            self.refreshVerifiedFromApi(patch);
          },
        };
      });
    }

    // ---- filtering ----
    var fd = s.fDay,
      arts = s.arts;
    var PR = { any: [0, 1e9], lt2: [0, 1999], m25: [2000, 5000], gt5: [5001, 1e9] };
    var locList = all.filter(inLoc);
    var locFreeTonight = locList.filter(function (a) {
      return freeOn(a, fd);
    }).length;
    var qn = s.q.trim().toLowerCase();
    var list = (
      s.onlySaved
        ? all.filter(function (a) {
            return !!s.saved[a.id];
          })
        : locList
    )
      .filter(function (a) {
        if (s.onlySaved) return true;
        if (arts.length && arts.indexOf(a.cat) < 0) return false;
        if (s.maxRate < 20000 && (a.unit !== "hour" || a.rate > s.maxRate)) return false;
        // Ratings not live yet — keep minStar unused.
        // if (a.rating < s.minStar) return false;
        if (s.hrs && a.unit === "hour" && maxHrs(a) < s.hrs) return false;
        if (qn && a.name.toLowerCase().indexOf(qn) < 0) return false;
        // Availability date filter (Tonight / Tomorrow / …) — hide artists closed that day.
        if (!a.sample && !freeOn(a, fd)) return false;
        return true;
      })
      .map(function (a) {
        return { a: a, fs: freeSlots(a, fd, s.tod), match: matchOf(a) };
      });
    if (s.onlyFree && !s.onlySaved)
      list = list.filter(function (x) {
        return x.a.sample || freeOn(x.a, fd);
      });
    var MATCH_RANK = { current: 0, visiting: 0, base: 1, pref: 2, any: 3 };
    var SORT = {
      renown: function (x, y) {
        // No renown metrics yet — fall back to name, then rate.
        return (x.a.name || "").localeCompare(y.a.name || "") || x.a.rate - y.a.rate;
      },
      // rating: function (x, y) {
      //   return y.a.rating - x.a.rating || y.a.reviews - x.a.reviews;
      // },
      priceLo: function (x, y) {
        return x.a.rate - y.a.rate;
      },
      priceHi: function (x, y) {
        return y.a.rate - x.a.rate;
      },
      soonest: function (x, y) {
        var hx = x.fs.length ? hourOf(x.fs[0]) : 99,
          hy = y.fs.length ? hourOf(y.fs[0]) : 99;
        return hx - hy || x.a.rate - y.a.rate;
      },
    };
    var sortKey = s.sort === "rating" ? "renown" : s.sort;
    var sortFn = SORT[sortKey] || SORT.renown;
    list.sort(function (x, y) {
      // With a place picked, closer ties (current → base → preferred) rise first.
      if (loc) {
        var rx = MATCH_RANK[x.match] != null ? MATCH_RANK[x.match] : 9;
        var ry = MATCH_RANK[y.match] != null ? MATCH_RANK[y.match] : 9;
        if (rx !== ry) return rx - ry;
      }
      return sortFn(x, y);
    });
    function cityKey(c) {
      var h = 0;
      for (var i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) | 0;
      return h;
    }
    function priceIn(a, city, state) {
      if (!a.sample && a.pricing) {
        // Empty city still applies default travel/stay when the artist charges separately.
        var rp = artistCityPrice(a.pricing, city || "");
        return { rate: rp.rate, travel: rp.travel, note: rp.travel ? "travel" : "base" };
      }
      if (!city || (city === a.city && state === a.state))
        return { rate: a.rate, travel: 0, note: "base" };
      var k = hsh(a.seed + cityKey(city)),
        rate = a.unit === "hour" ? Math.round((a.rate * (1 + (k % 3) * 0.1)) / 100) * 100 : a.rate;
      var v2 = currentOf(a);
      if (v2 && v2.city === city && (v2.state === state || !v2.state))
        return { rate: rate, travel: 0, note: "visiting" };
      return {
        rate: rate,
        travel: state === a.state ? 1500 + ((k >>> 3) % 6) * 500 : 6000 + ((k >>> 3) % 10) * 1000,
        note: "travel",
      };
    }
    var PERFORMS = {
      "Folk singers": "weddings, sangeets and festival nights",
      Musicians: "house concerts, weddings and café evenings",
      "Band baja": "baraats and wedding processions",
      DJs: "weddings, sangeets and private parties",
      Dancers: "sangeets, festivals and stage shows",
      Poets: "mehfils, literary evenings and private gatherings",
      Comedians: "corporate evenings and private parties",
      Magicians: "birthdays and family gatherings",
      "Special acts": "festivals, weddings and night events",
      Artists: "weddings and corporate events",
      Artisans: "workshops, festivals and corporate events",
      "Mehendi artists": "weddings, mehendi nights and festivals",
      Puppeteers: "birthdays, schools and festivals",
      Influencers: "launches, weddings and brand events",
      Models: "fashion shows, shoots and launches",
      Anchors: "weddings, corporate events and award nights",
      Caterers: "weddings, parties and corporate lunches",
      "Event planners": "weddings, birthdays and corporate events",
    };
    var CATSKILL = {
      "Folk singers": "Soulful Vocals",
      Musicians: "Acoustic Mastery",
      "Band baja": "Baraat Energy",
      DJs: "Seamless Mixing",
      Dancers: "Graceful Footwork",
      Poets: "Way with Words",
      Comedians: "Quick Wit",
      Magicians: "Sleight of Hand",
      "Special acts": "Showstopper",
      Artists: "Fast Live Sketch",
      Artisans: "Hands-on Teaching",
      "Mehendi artists": "Fine Detailing",
      Puppeteers: "Storytelling",
      Influencers: "Viral Reels",
      Models: "Ramp Presence",
      Anchors: "Bilingual Hosting",
      Caterers: "Hygienic Kitchen",
      "Event planners": "Flawless Planning",
    };
    var ROWTAGS = [
      "Maestro’s Choice",
      "Punctual",
      "True to Demo",
      "Soulful Mehfil",
      "Acoustic Mastery",
      "Commands the Room",
      "Courteous",
      "Crowd Favourite",
    ];
    function fmtH(h) {
      h = h % 24;
      var hh = Math.floor(h),
        mi = Math.round((h - hh) * 60),
        ap = hh >= 12 ? "PM" : "AM",
        h12 = hh % 12 || 12;
      return h12 + ":" + (mi < 10 ? "0" : "") + mi + " " + ap;
    }
    var INSTR = {
      ektara: "Ektara, Khartal & Sufi Kalaam",
      harmonium: "Harmonium, Dholak & Voice",
      mic: "Live Vocals with Folk Accompanists",
      sitar: "Strings with Tabla Accompaniment",
      tabla: "Tabla Solo & Accompaniment",
      flute: "Bansuri with Tanpura Drone",
      violin: "Violin with Live Backing",
      guitar: "Acoustic Guitar & Vocals",
      trumpet: "Brass, Dhol & Lamp-bearers",
      dhol: "Dhol & Tasha Ensemble",
      vinyl: "Own Sound & Light Setup",
      headphones: "Mixing Desk & Stage Lights",
      dancer: "Solo & Ensemble Choreography",
      ghungroo: "Classical Repertoire with Live Music",
      quill: "Verse Composed to Order",
      book: "Stories Told Live",
      mask: "Clean, Family-friendly Sets",
      speech: "Voices, Impressions & Crowd Work",
      cards: "Close-up Card & Coin Work",
      hat: "Grand Stage Illusions",
      wand: "Magic for Children",
      flame: "Fire & Light Performance",
      juggle: "Circus Skills & Stilts",
      brush: "Live Sketches for Guests",
      palette: "Painting on Site",
      pot: "Live Clay Workshop",
      needle: "Hands-on Craft Workshop",
      hand: "Bridal & Guest Designs",
      cone: "Arabic & Indo-Arabic Designs",
      puppet: "Kathputli Play with Live Music",
      phone: "Content Shot at Your Event",
      ring: "Reels, Stories & Vlogs",
      hanger: "Ramp & Catalogue",
      camera: "Shoots & Catalogue",
      vmic: "Hosting in Hindi & English",
      cloche: "Live Counters, Staff Included",
      handi: "Full Menu, Staff & Crockery",
      clipboard: "Planning, Décor & Vendors",
      marigold: "Décor, Rituals & Vendors",
    };
    var locUp = loc ? (loc.type === "state" ? loc.state : loc.city).toUpperCase() : "";
    function mt(a) {
      var m = matchOf(a);
      return m === "visiting"
        ? "VISITING " + locUp + (fd === 0 ? " TODAY" : " THAT DAY")
        : m === "base"
          ? "HOMETOWN · " + locUp
          : m === "pref"
            ? "PREFERRED CITY · " + locUp
            : "";
    }
    var visible = list.slice(0, s.limit).map(function (x) {
      return x.a;
    });
    var savedArtists = Object.keys(s.saved)
      .map(function (id) {
        return all.find(function (x) {
          return x.id === id;
        });
      })
      .filter(Boolean);
    var toPaint = visible.slice();
    savedArtists.forEach(function (a) {
      if (toPaint.indexOf(a) < 0) toPaint.push(a);
    });
    assignArtistPhotos(toPaint, self.artistPortraits);
    var rows = list.slice(0, s.limit).map(function (x) {
      var a = x.a,
        free = x.fs.length > 0,
        listWord = s.saved[a.id] || "";
      var vv = currentOf(a),
        mm = loc ? matchOf(a) : vv ? "current" : "base";
      var pc = loc && loc.type === "city" ? priceIn(a, loc.city, loc.state) : priceIn(a, null);
      var plc = (
        loc ? (loc.type === "state" ? loc.state : loc.city) : vv ? vv.city || a.city : a.city
      ).toUpperCase();
      var dw =
        fd === -1
          ? "ANY DAY"
          : fd === 0
            ? "TODAY"
            : fd === 1
              ? "TOMORROW"
              : "ON " + DOW[dates[fd].d] + " " + dates[fd].num;
      var stat =
        mm === "current" || mm === "visiting"
          ? "CURRENTLY IN " + plc + " " + dw
          : mm === "pref"
            ? "TRAVELS TO " + plc
            : vv && loc
              ? "BASED IN " + plc + " · NOW IN " + String(vv.city || vv.state || "").toUpperCase()
              : "IN " + plc + " " + dw;
      var th = hsh(a.seed + 41),
        tg = [ROWTAGS[th % 8], ROWTAGS[(th >>> 3) % 8], ROWTAGS[(th >>> 6) % 8]];
      if (tg[1] === tg[0]) tg[1] = ROWTAGS[((th % 8) + 3) % 8];
      if (tg[2] === tg[0] || tg[2] === tg[1]) tg[2] = ROWTAGS[((th % 8) + 5) % 8];
      var ci = CATS.indexOf(a.cat),
        vendorish = a.unit !== "hour";
      var desc =
        a.craft +
        " from " +
        a.city +
        ", " +
        a.state +
        ". " +
        (vendorish ? "Serves " : "Performs at ") +
        (PERFORMS[a.cat] || "weddings and private events") +
        ".";
      var skills = [CATSKILL[a.cat] || "Seasoned Performer", tg[0], tg[1], tg[2]];
      // Rolling next 7 days from today (same window as the availability date filter).
      var week = [];
      for (var wi = 0; wi < 7; wi++) {
        var day = dates[wi];
        var ok = freeOn(a, wi);
        var onDay = fd === wi;
        week.push({
          dow: wi === 0 ? "TODAY" : DOW[day.d],
          num: String(day.num),
          word: ok ? "OPEN" : "BOOKED",
          cls: "kweek-day " + (ok ? "kweek-open" : "kweek-full") + (onDay ? " kweek-on" : ""),
        });
      }
      return {
        // Small circle under the poster: live art photo when present.
        art: a.artPhoto || ART[ci] || ART[0],
        catVars: "--cat-h: " + ((ci * 47) % 360),
        desc: desc,
        skills: skills,
        week: week,
        starPct: starFillStyle(a.rating, !!a.reviews),
        starItems: starItems(a.rating, !!a.reviews),
        reviewsText: a.reviews + (a.reviews === 1 ? " review" : " reviews"),
        photo: artistPhoto(a),
        status: a.sample
          ? "SAMPLE PROFILE · NOT BOOKABLE"
          : "VERIFIED ARTIST",
        instr: a.sample ? INSTR[a.icon] || a.craft : a.craft || a.cat,
        bio: a.bio,
        // CURRENT from profile currentCity; BASE from base city — not the same field.
        curLoc: vv
          ? [vv.city, vv.state].filter(Boolean).join(", ")
          : [a.currentCity || a.city, a.currentState || a.state].filter(Boolean).join(", "),
        baseLoc: [a.city, a.state].filter(Boolean).join(", "),
        prefLoc: (a.travels && a.travels.length ? a.travels : [a.city]).join(", "),
        timeText: free
          ? x.fs[0] + " - " + fmtH(hourOf(x.fs[x.fs.length - 1]) + 3)
          : "Diary full " + dw.toLowerCase(),
        t1: tg[0],
        t2: tg[1],
        t3: tg[2],
        travelNote:
          pc.note === "travel" && loc
            ? "+ " +
              rupees(pc.travel) +
              " travel & stay to " +
              (loc.type === "city" ? loc.city : loc.state)
            : pc.note === "visiting" && loc
              ? "Already in " +
                (loc.type === "city" ? loc.city : loc.state) +
                " · no travel charge"
              : loc && loc.type === "city"
                ? "No travel charge in " + a.city
                : a.sample
                  ? "Travel & stay shown when you pick a city"
                  : a.travelSetting === "excluding"
                    ? "Travel from " +
                      rupees((a.pricing && a.pricing.travel_charge_inr) || 0) +
                      " · stay from " +
                      rupees((a.pricing && a.pricing.stay_charge_inr) || 0)
                    : a.travelSetting === "none"
                      ? "Does not travel"
                      : "Travel & stay included in rate",
        availWord: a.sample ? "SAMPLE ONLY" : "VERIFIED",
        availDot: free ? "color: #2F4A43; font-weight: 700" : "color: #8A7666",
        showVideoMode: !!(s.cardMedia && s.cardMedia[a.id] === "video" && (a.sample ? sampleReel.url : ((a.reelUrls && a.reelUrls[a.primaryReel]) || (a.reelUrls && a.reelUrls[0]) || a.faceVideoUrl || sampleReel.url || ""))),
        showPhotoMode: !(s.cardMedia && s.cardMedia[a.id] === "video" && (a.sample ? sampleReel.url : ((a.reelUrls && a.reelUrls[a.primaryReel]) || (a.reelUrls && a.reelUrls[0]) || a.faceVideoUrl || sampleReel.url || ""))),
        reelUrl: a.sample ? sampleReel.url : ((a.reelUrls && a.reelUrls[a.primaryReel]) || (a.reelUrls && a.reelUrls[0]) || a.faceVideoUrl || sampleReel.url || ""),
        isMuted: s.cardMuted ? s.cardMuted[a.id] !== false : true,
        isUnmuted: s.cardMuted ? s.cardMuted[a.id] === false : false,
        audioLabel: (s.cardMuted ? s.cardMuted[a.id] !== false : true) ? "Unmute video sound" : "Mute video sound",
        audioTitle: (s.cardMuted ? s.cardMuted[a.id] !== false : true) ? "Unmute" : "Mute",
        toggleMute: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          var currentMuted = s.cardMuted ? s.cardMuted[a.id] !== false : true;
          var targetMuted = !currentMuted;
          var cm = Object.assign({}, s.cardMuted || {});
          cm[a.id] = targetMuted;
          self.setState({ cardMuted: cm });
          if (ev && ev.currentTarget) {
            var card = ev.currentTarget.closest(".kartist-row");
            if (card) {
              var v = card.querySelector("video");
              if (v) v.muted = targetMuted;
            }
          }
        },
        showPhoto: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          var cm = Object.assign({}, s.cardMedia || {});
          cm[a.id] = "photo";
          self.setState({ cardMedia: cm });
        },
        showVideo: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          var cm = Object.assign({}, s.cardMedia || {});
          if (cm[a.id] === "video") {
            var currentMuted = s.cardMuted ? s.cardMuted[a.id] !== false : true;
            var targetMuted = !currentMuted;
            var mut = Object.assign({}, s.cardMuted || {});
            mut[a.id] = targetMuted;
            self.setState({ cardMuted: mut });
            if (ev && ev.currentTarget) {
              var card = ev.currentTarget.closest(".kartist-row");
              if (card) {
                var v = card.querySelector("video");
                if (v) v.muted = targetMuted;
              }
            }
            return;
          }
          cm[a.id] = "video";
          self.setState({ cardMedia: cm });
        },
        stopProp: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
        },
        watch: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          if (typeof window !== "undefined") {
            window.scrollTo(0, 0);
            try {
              var u = new URL(window.location.href);
              u.searchParams.set("artist", a.id);
              window.history.pushState({}, "", u.toString());
            } catch (e) {}
          }
          self.setState({
            screen: "profile",
            artistId: a.id,
            tab: "about",
            bDay: fd >= 0 ? fd : 0,
            slot: null,
            media: "video",
          });
        },
        book: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          if (typeof window !== "undefined") {
            window.scrollTo(0, 0);
          }
          self.setState({
            screen: "book",
            artistId: a.id,
            bDay: fd >= 0 ? fd : 0,
            slot: free ? x.fs[0] : null,
          });
        },
        match: mt(a),
        hasMatch: !!loc && !!mt(a),
        name: a.name,
        craft: a.cat || a.craft,
        place: a.city + ", " + a.state,
        icon: IC[a.icon],
        il: ILL[a.cat],
        netText: rupees(a.rate - serviceFee(a.rate)),
        payText: rupees(a.rate + serviceFee(a.rate)),
        ink: medInk(a.cat),
        med: medStyle(a.cat, 54),
        stars: starStr(a.rating),
        rating: a.reviews ? a.rating.toFixed(1) : "Not rated",
        reviews: a.reviews,
        rateText: rupees(pc.rate || a.rate),
        unit: unitWord(a),
        openLabel: "View " + a.name,
        avail: a.sample ? "SAMPLE · NOT BOOKABLE" : (free ? "OPEN" : "BOOKED"),
        availStyle:
          "font-family: DM Mono, monospace; font-size: 10px; letter-spacing: 0.1em; border-radius: 999px; padding: 3px 9px; white-space: nowrap; " +
          (free
            ? "background: #2F4A43; color: " + CREAM + ";"
            : "border: 1px solid rgba(42,29,24,.35); color: " + MUTE + ";"),
        heartFill: listWord ? RUST : "none",
        isFav: !!listWord,
        savedList: listWord,
        lookOn: listWord === "look",
        bookOn: listWord === "book",
        favLabel: listWord
          ? "Remove " + a.name + " from your list"
          : "Keep " + a.name + " to look later",
        bookSaveLabel:
          listWord === "book"
            ? "Take " + a.name + " off the to-book list"
            : "Line up " + a.name + " to book",
        fav: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          setSaved(a.id, "look");
        },
        saveToBook: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          setSaved(a.id, "book");
        },
        open: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          if (typeof window !== "undefined") {
            window.scrollTo(0, 0);
            try {
              var u = new URL(window.location.href);
              u.searchParams.set("artist", a.id);
              window.history.pushState({}, "", u.toString());
            } catch (e) {}
          }
          self.setState({
            screen: "profile",
            artistId: a.id,
            tab: "about",
            bDay: fd >= 0 ? fd : 0,
            slot: null,
            media: "photo",
          });
        },
      };
    });
    var where = loc ? (loc.type === "state" ? loc.state : loc.city) : "all of India";
    var dayWord =
      fd === -1
        ? "ANY DAY"
        : fd === 0
          ? "TONIGHT"
          : fd === 1
            ? "TOMORROW"
            : "ON " + DOW[dates[fd].d] + " " + dates[fd].num;
    var whatWord =
      arts.length === 1
        ? arts[0].toLowerCase()
        : arts.length > 1
          ? "artists (" + arts.length + " arts)"
          : "artists";
    if (list.length === 1)
      whatWord = arts.length === 1 ? arts[0].toLowerCase().replace(/s$/, "") : "artist";
    var resTitle = s.onlySaved
      ? "Your list · " + counts.look + " to look at, " + counts.book + " to book"
      : list.length +
        " " +
        whatWord +
        (s.onlyFree
          ? " available " +
            (fd === -1
              ? "any day"
              : fd === 0
                ? "tonight"
                : fd === 1
                  ? "tomorrow"
                  : "on " + DOWL[dates[fd].d] + " " + dates[fd].num)
          : "") +
        " in " +
        where;
    resTitle =
      list.length +
      (list.length === 1 ? " profile" : " profiles") +
      (realArtists.length
        ? " · verified artists"
        : " · real artists joining soon");
    var resSub =
      (s.tod !== "Any" ? s.tod.toUpperCase() + " · " : "") +
      "SORTED BY " +
      {
        renown: "RENOWN",
        rating: "RATING",
        priceLo: "FEE, LOW TO HIGH",
        priceHi: "FEE, HIGH TO LOW",
        soonest: "SOONEST SLOT",
      }[s.sort];

    var WALLC = [
        "#E3C9A6",
        "#9DB4CB",
        "#DCA092",
        "#F1EADB",
        "#C98A6A",
        "#CDB28A",
        "#B8C4AE",
        "#E6C2B0",
      ],
      ROOFC = [
        "#8E4A3E",
        "#3F5E7A",
        "#A0574A",
        "#B9A98E",
        "#7A3C30",
        "#6B5A3E",
        "#55624F",
        "#8A5040",
      ];
    // ---- vintage India map / city landmark ----
    var total = locList.length;
    var stars = indiaMap.lights;
    function L(d, f, w) {
      return { d: d, f: f, w: w || 1.2 };
    }
    var W1 = "#E3C9A6",
      W2 = "#F1EADB",
      R1 = "#C98A6A",
      R2 = "#A0574A",
      DK = "#5A4636";
    var LANDMARKS = {
      Udaipur: [
        L("M40 210 H260 V228 H40 Z", W1),
        L(
          "M60 210 V190 Q70 178 80 190 V210 Z M110 210 V190 Q120 178 130 190 V210 Z M170 210 V190 Q180 178 190 190 V210 Z M220 210 V190 Q230 178 240 190 V210 Z",
          W2,
        ),
        L("M90 190 H210 V168 H90 Z", W1),
        L("M130 168 Q150 128 170 168 Z", R1),
        L("M150 128 V114", "none"),
        L("M96 168 Q106 150 116 168 Z M184 168 Q194 150 204 168 Z", R1),
        L("M30 242 H270 M50 254 H250 M70 266 H230", "none", 1),
      ],
      Jaipur: [
        L("M70 244 H230 V212 H70 Z", "#DCA092"),
        L("M85 212 H215 V182 H85 Z", "#DCA092"),
        L("M100 182 H200 V152 H100 Z", "#DCA092"),
        L("M115 152 H185 V122 H115 Z", "#DCA092"),
        L("M130 122 H170 V96 H130 Z", "#DCA092"),
        L("M128 96 Q150 76 172 96 Z", R2),
        L(
          "M88 244 V228 Q94 220 100 228 V244 Z M140 244 V228 Q146 220 152 228 V244 Z M192 244 V228 Q198 220 204 228 V244 Z M108 212 V198 Q114 190 120 198 V212 Z M148 212 V198 Q154 190 160 198 V212 Z M188 212 V198 Q194 190 200 198 V212 Z M128 182 V168 Q134 160 140 168 V182 Z M164 182 V168 Q170 160 176 168 V182 Z M146 152 V138 Q152 130 158 138 V152 Z",
          DK,
          1,
        ),
      ],
      "New Delhi": [
        L("M75 250 H225 V262 H75 Z", W1),
        L("M90 250 V122 Q150 80 210 122 V250 H184 V140 Q150 110 116 140 V250 Z", "#CDB28A"),
        L("M100 122 H200 V104 H100 Z", W1),
        L("M136 104 H164 V92 H136 Z", R1),
      ],
      Mumbai: [
        L("M70 250 V150 H96 V250 Z M204 250 V150 H230 250 Z", W1),
        L("M66 150 Q83 132 100 150 Z M200 150 Q217 132 234 150 Z", R1),
        L("M96 250 V140 Q150 100 204 140 V250 H180 V158 Q150 132 120 158 V250 Z", "#CDB28A"),
        L("M104 140 H196 V124 H104 Z", W1),
      ],
      Agra: [
        L("M104 226 V166 Q150 96 196 166 V226 Z", W2),
        L("M150 96 V82", "none"),
        L("M66 226 V150 H84 V226 Z M216 226 V150 H234 V226 Z", W1),
        L("M62 150 Q75 136 88 150 Z M212 150 Q225 136 238 150 Z", R1),
        L("M96 226 H204 V240 H96 Z", W1),
        L("M136 226 V190 Q150 176 164 190 V226 Z", DK, 1),
      ],
      Kolkata: [
        L("M40 232 H260", "none", 2),
        L("M108 232 V120 H124 V232 Z M176 232 V120 H192 V232 Z", W1),
        L("M116 120 Q150 96 184 120", "none", 2),
        L("M116 132 H184 M116 152 H184 M116 172 H184 M116 192 H184 M116 212 H184", "none", 1),
        L("M48 232 L108 200 M48 210 L108 176 M252 232 L192 200 M252 210 L192 176", "none", 1),
      ],
      Chennai: [
        L("M96 252 H204 V222 H96 Z", W1),
        L("M108 222 H192 V192 H108 Z", W1),
        L("M120 192 H180 V162 H120 Z", W1),
        L("M132 162 H168 V132 H132 Z", W1),
        L("M128 132 Q150 116 172 132 Z", R1),
        L("M150 116 V104", "none"),
        L(
          "M138 252 V236 Q144 228 150 236 V252 Z M160 222 V208 Q166 200 172 208 V222 Z M128 222 V208 Q134 200 140 208 V222 Z",
          DK,
          1,
        ),
      ],
      Varanasi: [
        L("M128 236 V150 Q150 88 172 150 V236 Z", "#B9A98E"),
        L("M150 88 V74", "none"),
        L("M60 236 H240 V248 H60 Z", W1),
        L("M72 248 H228 V258 H72 Z", W1),
        L("M84 258 H216 V268 H84 Z", W1),
        L("M50 278 H250 M70 288 H230", "none", 1),
        L("M142 236 V206 Q150 196 158 206 V236 Z", DK, 1),
      ],
      Kochi: [
        L("M96 252 L140 118 M188 252 L140 118", "none", 2),
        L("M140 118 L210 96", "none", 2),
        L("M210 96 Q190 140 196 176 Q160 150 150 128", "none", 1),
        L("M206 100 L196 176 M198 104 L188 170 M190 110 L180 162", "none", 1),
        L("M60 262 H240 M80 274 H220", "none", 1),
      ],
      Hyderabad: [
        L("M112 244 V158 H188 V244 Z", W1),
        L("M136 244 V200 Q150 186 164 200 V244 Z", DK, 1),
        L(
          "M100 244 V130 H116 244 Z M184 244 V130 H200 V244 Z M112 158 V142 H124 V158 Z M176 158 V142 H188 V158 Z",
          W1,
        ),
        L(
          "M96 130 Q108 116 120 130 Z M180 130 Q192 116 204 130 Z M110 142 Q118 132 126 142 Z M174 142 Q182 132 190 142 Z",
          R1,
        ),
      ],
      Bengaluru: [
        L("M70 244 H230 V200 H70 Z", W1),
        L(
          "M84 244 V212 M104 244 V212 M124 244 V212 M144 244 V212 M164 244 V212 M184 244 V212 M204 244 V212",
          "none",
          1.6,
        ),
        L("M62 200 H238 V186 H62 Z", W1),
        L("M120 186 Q150 148 180 186 Z", R1),
        L("M150 148 V136", "none"),
      ],
      Shillong: [
        L("M20 244 Q80 158 142 222 Q202 148 282 232", "none", 2),
        L("M96 210 L112 176 L128 210 Z M104 190 L112 172 L120 190 Z", "#55624F"),
        L("M196 200 L212 166 L228 200 Z M204 180 L212 162 L220 180 Z", "#55624F"),
        L("M112 210 V220 M212 200 V210", "none", 1.6),
        L("M40 254 H260", "none", 1),
      ],
    };
    var GENERIC_LM = [
      L("M60 228 H240 V244 H60 Z", W1),
      L("M84 228 V188 H216 V228 Z", W1),
      L(
        "M100 228 V206 Q110 194 120 206 V228 Z M140 228 V206 Q150 194 160 206 V228 Z M180 228 V206 Q190 194 200 206 V228 Z",
        DK,
        1,
      ),
      L("M118 188 Q150 140 182 188 Z", R1),
      L("M150 140 V126", "none"),
      L("M88 188 Q98 170 108 188 Z M192 188 Q202 170 212 188 Z", R1),
    ];
    var METROS = [
      ["Mumbai", "Maharashtra"],
      ["New Delhi", "Delhi"],
      ["Bengaluru", "Karnataka"],
      ["Hyderabad", "Telangana"],
      ["Chennai", "Tamil Nadu"],
      ["Kolkata", "West Bengal"],
      ["Pune", "Maharashtra"],
      ["Ahmedabad", "Gujarat"],
      ["Gurugram", "Haryana"],
      ["Noida", "Uttar Pradesh"],
    ];
    var CAPS = {
      "Andhra Pradesh": "Visakhapatnam",
      "Arunachal Pradesh": "Itanagar",
      Assam: "Guwahati",
      Bihar: "Patna",
      Chhattisgarh: "Raipur",
      Goa: "Panaji",
      Gujarat: "Gandhinagar",
      Haryana: "Chandigarh",
      "Himachal Pradesh": "Shimla",
      Jharkhand: "Ranchi",
      Karnataka: "Bengaluru",
      Kerala: "Thiruvananthapuram",
      "Madhya Pradesh": "Bhopal",
      Maharashtra: "Mumbai",
      Manipur: "Imphal",
      Meghalaya: "Shillong",
      Mizoram: "Aizawl",
      Nagaland: "Kohima",
      Odisha: "Bhubaneswar",
      Punjab: "Chandigarh",
      Rajasthan: "Jaipur",
      Sikkim: "Gangtok",
      "Tamil Nadu": "Chennai",
      Telangana: "Hyderabad",
      Tripura: "Agartala",
      "Uttar Pradesh": "Lucknow",
      Uttarakhand: "Dehradun",
      "West Bengal": "Kolkata",
      Delhi: "New Delhi",
      Chandigarh: "Chandigarh",
      "Jammu and Kashmir": "Srinagar",
      Ladakh: "Leh",
      Puducherry: "Puducherry",
      "Andaman and Nicobar Islands": "Port Blair",
      Lakshadweep: "Kavaratti",
      "Dadra and Nagar Haveli and Daman and Diu": "Daman",
    };
    function capOf(st) {
      // Prefer known capitals; else first city from GET /locations row for that state.
      var fromCatalog =
        STATE_IDX[st] != null && STATES[STATE_IDX[st]] && STATES[STATE_IDX[st]].cities[0]
          ? STATES[STATE_IDX[st]].cities[0]
          : "";
      var city = CAPS[st] || fromCatalog || st || "";
      return [city, st === "Haryana" || st === "Punjab" ? "Chandigarh" : st];
    }
    var lmCity = loc ? (loc.type === "city" ? loc.city : capOf(loc.state)[0]) : null;
    var land = lmCity ? LANDMARKS[lmCity] || GENERIC_LM : null;
    var isMap = !land;
    var castle = {
      w: 300,
      h: isMap ? 320 : 300,
      vb: isMap ? indiaMap.viewBox : "0 0 300 300",
      isMap: isMap,
      isLand: !isMap,
      regions: indiaMap.regions,
      stars: stars,
      land: land || [],
      landCity: lmCity || "",
    };
    var locName = loc ? (loc.type === "state" ? loc.state : loc.city) : "All of India";
    var locSub = loc
      ? loc.type === "state"
        ? "every city and district in the state"
        : loc.state
      : STATES.length + " states & union territories";
    var castleCap = "INDIA’S LIVE ARTS · HOUSE OF ARTISTS";
    var isMetro = {},
      isCap = {};
    METROS.forEach(function (m) {
      isMetro[m[0] + "|" + m[1]] = 1;
    });
    STATES.forEach(function (st) {
      var c = capOf(st.name);
      isCap[c[0] + "|" + c[1]] = 1;
    });
    var cstat = {};
    all.forEach(function (x) {
      var k = x.city + "|" + x.state,
        c = cstat[k] || (cstat[k] = { total: 0, free: 0 });
      c.total++;
      if (freeOn(x, fd)) c.free++;
    });
    var seen = {},
      picks = [];
    function addC(c, st) {
      var k = c + "|" + st;
      if (!c || seen[k] || !cstat[k]) return;
      seen[k] = 1;
      picks.push([c, st]);
    }
    if (loc) {
      var ls = loc.state,
        inState = 0;
      if (loc.type === "city") addC(loc.city, ls);
      var capv = capOf(ls);
      addC(capv[0], capv[1]);
      METROS.forEach(function (m) {
        if (m[1] === ls) addC(m[0], m[1]);
      });
      if (STATE_IDX[ls] != null && STATES[STATE_IDX[ls]]) {
        STATES[STATE_IDX[ls]].cities.slice(0, 4).forEach(function (c) {
          addC(c, ls);
        });
      }
      METROS.forEach(function (m) {
        addC(m[0], m[1]);
      });
    } else {
      METROS.forEach(function (m) {
        addC(m[0], m[1]);
      });
      STATES.forEach(function (st) {
        var c = capOf(st.name);
        addC(c[0], c[1]);
      });
    }
    var selKey = loc && loc.type === "city" ? loc.city + "|" + loc.state : "";
    var houses = picks.map(function (p, hi) {
      var k = p[0] + "|" + p[1],
        h = cstat[k],
        kind = isMetro[k] ? "Metro" : isCap[k] ? "Capital" : "";
      var bodyH = 60 + Math.min(h.total, 30),
        bt = 150 - bodyH,
        nLit = h.total ? Math.min(6, Math.round((h.free / h.total) * 6)) : 0,
        dk = "",
        lt = "",
        cells = [];
      [20, 50, 80].forEach(function (x) {
        [bt + 12, bt + 34].forEach(function (y) {
          cells.push([x, y]);
        });
      });
      cells.forEach(function (c, ci) {
        var q = "M" + c[0] + " " + c[1] + "h16v18h-16z";
        if (ci < nLit) lt += q;
        else dk += q;
      });
      return {
        label: p[0].toUpperCase(),
        sub: (kind ? kind + " · " : "") + h.total + " artists",
        badge: h.free + " OPEN",
        body: "M10 " + bt + "H110V150H10Z",
        roof: "M8 " + bt + "Q60 " + (bt - 24) + " 112 " + bt + "Z",
        dark: dk,
        lit: lt,
        door: "M52 150V132Q60 124 68 132V150Z",
        wall: k === selKey ? "#E9C989" : WALLC[hi % 8],
        roofFill: ROOFC[hi % 8],
        aria: "Show artists in " + p[0] + (kind ? ", " + kind.toLowerCase() : ""),
        pick: function () {
          var patch = {
            loc: { type: "city", city: p[0], state: p[1] },
            locQ: p[0] + ", " + p[1],
            tier: "all",
            limit: 24,
          };
          self.setState(patch);
          self.refreshVerifiedFromApi(patch);
        },
      };
    });
    var litLine =
      "Showing " +
      locFreeTonight +
      " open artists " +
      (loc
        ? "in " +
          (loc.type === "state" ? loc.state : loc.city) +
          ". Nearby capitals and metros are lit below."
        : "across India, from the metros to every state capital.");
    var artChips = [{ c: "", label: "Everyone", icon: IC.all }]
      .concat(
        ART_TYPES.map(function (c) {
          var craft = CRAFTS[c];
          var iconKey = craft && craft[0] ? craft[0][1] : "mic";
          return { c: c, label: c, icon: IC[iconKey] || IC.mic || IC.all };
        }),
      )
      .map(function (x) {
        var on = x.c === "" ? arts.length === 0 : arts.indexOf(x.c) >= 0;
        return {
          label: x.label,
          icon: x.icon,
          on: on,
          style: pill(on),
          pick: function () {
            if (x.c === "") self.setState({ arts: [], limit: 24 });
            else
              self.setState({
                arts: on
                  ? arts.filter(function (z) {
                      return z !== x.c;
                    })
                  : arts.concat([x.c]),
                limit: 24,
              });
          },
        };
      });
    var fDates = [
      {
        dow: "ANY",
        num: "DAY",
        on: fd === -1,
        aria: "Any day — artists with at least one open weekday",
        pick: function () {
          var patch = { fDay: -1, limit: 24 };
          self.setState(patch);
          self.refreshVerifiedFromApi(patch);
        },
        style:
          "flex: none; width: 56px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0; border-radius: 28px 28px 4px 4px; border: 1px solid " +
          INK +
          "; background: " +
          (fd === -1 ? INK : "transparent") +
          "; color: " +
          (fd === -1 ? CREAM : INK),
      },
    ].concat(
      dates.map(function (d, i) {
        var on = fd === i;
        return {
          dow: i === 0 ? "TONIGHT" : i === 1 ? "TMRW" : DOW[d.d],
          num: d.num,
          on: on,
          aria: dayLong(i),
          pick: function () {
            var patch = { fDay: i, limit: 24 };
            self.setState(patch);
            self.refreshVerifiedFromApi(patch);
          },
          style:
            "flex: none; width: 56px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0; border-radius: 28px 28px 4px 4px; border: 1px solid " +
            INK +
            "; background: " +
            (on ? INK : "transparent") +
            "; color: " +
            (on ? CREAM : INK),
        };
      }),
    );
    var tods = ["Any", "Morning", "Afternoon", "Evening", "Night"].map(function (t) {
      var on = s.tod === t;
      return {
        label: t === "Any" ? "Any time" : t,
        on: on,
        style: pill(on),
        pick: function () {
          self.setState({ tod: t, limit: 24 });
        },
      };
    });
    var prices = [
      ["any", "Any"],
      ["lt2", "Under ₹2k"],
      ["m25", "₹2k–5k"],
      ["gt5", "Above ₹5k"],
    ].map(function (p) {
      var on = s.price === p[0];
      return {
        label: p[1],
        on: on,
        style: pill(on),
        pick: function () {
          self.setState({ price: p[0], limit: 24 });
        },
      };
    });
    // Ratings not wired yet — leave star chips empty / unused.
    var starFil = [];
    // var starFil = [
    //   [0, "Any"],
    //   [4, "★ 4+"],
    //   [4.5, "★ 4.5+"],
    //   [4.8, "★ 4.8+"],
    // ].map(function (p) {
    //   var on = s.minStar === p[0];
    //   return {
    //     label: p[1],
    //     on: on,
    //     style: pill(on),
    //     pick: function () {
    //       self.setState({ minStar: p[0], limit: 24 });
    //     },
    //   };
    // });
    var hrsFil = [
      [0, "Any"],
      [1, "1 HR"],
      [2, "2 HR"],
      [3, "3 HR"],
      [4, "4 HR"],
    ].map(function (p) {
      var on = s.hrs === p[0];
      return {
        label: p[1],
        on: on,
        style: pill(on),
        pick: function () {
          self.setState({ hrs: p[0], limit: 24 });
        },
      };
    });
    var placeN = loc ? (loc.type === "state" ? loc.state : loc.city) : "your city",
      dayTxt = fd === -1 ? "any open day" : fd === 0 ? "today" : "that day";
    function opts(arr) {
      return arr.map(function (p) {
        return { v: String(p[0]), label: p[1] };
      });
    }
    // City/district search + location tier (current / base / preferred) drive
    // GET /artists/verified via refreshVerifiedFromApi.
    var stateOpts = opts(
      [["", "All of India"]].concat(
        STATES.map(function (st) {
          return [st.name, st.name];
        }),
      ),
    );
    var tierOpts = opts([
      ["all", "All (current + base + preferred)"],
      ["current", "Currently in " + placeN + " today"],
      ["base", "Base hometown: " + placeN],
      ["pref", "Preferred city: " + placeN],
    ]);
    var artOpts = opts(
      [["", "All art forms"]].concat(
        ART_TYPES.map(function (c) {
          return [c, c];
        }),
      ),
    );
    var dayOpts = opts(
      [["-1", "Any day"]].concat(
        dates.map(function (d, i) {
          return [
            i,
            i === 0
              ? "Tonight"
              : i === 1
                ? "Tomorrow"
                : DOWL[d.d] + ", " + d.num + " " + (MON[i] || ""),
          ];
        }),
      ),
    );
    var todOpts = opts([
      ["Any", "Any time"],
      ["Morning", "Morning"],
      ["Afternoon", "Afternoon (12 to 4 PM)"],
      ["Evening", "Evening (4 to 8 PM)"],
      ["Night", "Night (8 PM onwards)"],
    ]);
    var sortOpts = opts([
      ["renown", "Name A–Z"],
      // ["rating", "Highest star rating"], // ratings not live yet
      ["priceLo", "Rate: low to high"],
      ["priceHi", "Rate: high to low"],
      ["soonest", "Soonest open"],
    ]);
    // Ratings not live yet — keep opts empty so the control can stay hidden.
    var starOpts = [];
    // var starOpts = opts([
    //   [0, "Any rating"],
    //   [4, "4★ and above"],
    //   [4.5, "4.5★ and above"],
    //   [4.8, "4.8★ and above"],
    // ]);
    var sorts = [
      ["renown", "Name"],
      // ["rating", "Rating"],
      ["priceLo", "Fee ↑"],
      ["priceHi", "Fee ↓"],
      ["soonest", "Soonest"],
    ].map(function (o) {
      var on = s.sort === o[0];
      return {
        label: o[1],
        on: on,
        style: txt(on),
        pick: function () {
          self.setState({ sort: o[0] });
        },
      };
    });

    // ---- selected artist ----
    var a =
      all.filter(function (x) {
        return x.id === s.artistId;
      })[0] || all[0];
    if (!a.photo) assignArtistPhotos([a], self.artistPortraits);
    var sp = a.name.lastIndexOf(" "),
      aFirst = sp < 0 ? a.name : a.name.slice(0, sp),
      aLast = sp < 0 ? "" : a.name.slice(sp + 1);
    var reviewTotal = Math.max(0, Number(a.reviews) || 0);
    var breakdown = a.ratingBreakdown || {};
    var sharesFromApi = [5, 4, 3, 2, 1].map(function (n) {
      var c = Number(breakdown[String(n)] || 0);
      return reviewTotal > 0 ? c / reviewTotal : 0;
    });
    var share5 =
      reviewTotal > 0
        ? sharesFromApi[0]
        : Math.min(0.95, Math.max(0.3, (a.rating - 4) * 0.95 + 0.05));
    var rest = 1 - share5;
    var shares =
      reviewTotal > 0
        ? sharesFromApi
        : [share5, rest * 0.7, rest * 0.2, rest * 0.07, rest * 0.03];
    var top3 = [];
    var PH = [
      "radial-gradient(ellipse at 50% 35%, #F6E9CC 0%, #DCC49A 58%, #B39168 100%)",
      "radial-gradient(ellipse at 50% 35%, #F8DCA8 0%, #E2A75A 60%, #B87634 100%)",
      "radial-gradient(ellipse at 50% 35%, #E6E8D3 0%, #ADB89B 58%, #7D8B6E 100%)",
      "radial-gradient(ellipse at 50% 35%, #F5DFD2 0%, #D2A48E 58%, #A0705B 100%)",
    ];
    var aIdx = all.indexOf(a);
    var bpc = loc && loc.type === "city" ? priceIn(a, loc.city, loc.state) : priceIn(a, null);
    var primaryReelUrl =
      (a.reelUrls && a.reelUrls[a.primaryReel]) || (a.reelUrls && a.reelUrls[0]) || "";
    var liveFaceVideoUrl = a.sample ? sampleReel.url : a.faceVideoUrl || primaryReelUrl || sampleReel.url || "";
    var primaryVideoUrl = a.sample ? sampleReel.url : primaryReelUrl || a.faceVideoUrl || sampleReel.url || "";
    var reelList = a.sample ? [sampleReel.url, sampleReel.url] : a.reelUrls || [];
    var showreelTime =
      (self.mediaDurations && liveFaceVideoUrl && self.mediaDurations[liveFaceVideoUrl]) ||
      (self.mediaDurations && primaryVideoUrl && self.mediaDurations[primaryVideoUrl]) ||
      "";
    var catIdx = CATS.indexOf(a.cat);
    var artImg =
      a.artPhoto ||
      (catIdx >= 0 && ART[catIdx]) ||
      ART[0] ||
      artistPhoto(a);
    var sel = {
      photo: artistPhoto(a),
      art: artImg,
      artPhoto: artImg,
      video: primaryVideoUrl,
      primaryReelVideo: primaryVideoUrl,
      liveVideo: liveFaceVideoUrl,
      videoPoster: "",
      showreelTime: showreelTime,
      showreelCaption:
        "SHOWREEL · " +
        (showreelTime || (a.sample ? "3:12" : "0:09")) +
        " · RECORDED BY " +
        aFirst.toUpperCase(),
      onLiveMeta: function (ev) {
        if (ev && ev.currentTarget && ev.currentTarget.duration) {
          var totalSecs = Math.floor(ev.currentTarget.duration);
          if (totalSecs > 0) {
            var m = Math.floor(totalSecs / 60);
            var s = totalSecs % 60;
            var formatted = m + ":" + (s < 10 ? "0" : "") + s;
            if (!self.mediaDurations) self.mediaDurations = {};
            if (self.mediaDurations[liveFaceVideoUrl] !== formatted) {
              self.mediaDurations[liveFaceVideoUrl] = formatted;
              self.setState({});
            }
          }
        }
      },
      name: a.name,
      first: aFirst,
      firstUp: aFirst.toUpperCase(),
      last: aLast,
      no: pad((aIdx % 999) + 1),
      catUp: a.cat.replace(/s$/, "").toUpperCase(),
      cityUp: a.city.toUpperCase(),
      craft: a.craft,
      craftLower: a.craft.charAt(0).toLowerCase() + a.craft.slice(1),
      bio: a.bio,
      il: ILL[a.cat],
      disc: discStyle(CATS.indexOf(a.cat), 300),
      rateText: rupees(bpc.rate),
      travelText: bpc.travel ? rupees(bpc.travel) : "NO CHARGE",
      unitShort: a.unit === "plate" ? "/PLATE" : a.unit === "event" ? "/EVENT" : "/HR",
      unitLong:
        a.unit === "plate" ? "per plate" : a.unit === "event" ? "per occasion, from" : "per hour",
      rating: a.reviews ? a.rating.toFixed(1) : "Not rated",
      reviews: a.reviews,
      starStr: starStr(a.rating),
      starPct: starFillStyle(a.rating, a.reviews),
      starItems: starItems(a.rating, a.reviews),
      facts: [
        { k: "DISCIPLINE", v: a.cat.replace(/s$/, "") + " — " + a.craft },
        { k: "BASED IN", v: a.city + ", " + a.state },
        { k: "TRAVELS TO", v: a.travels.length ? a.travels.join(", ") : "Anywhere in " + a.state },
        { k: "LANGUAGES", v: a.langs },
        {
          k: "RATING",
          v: a.reviews
            ? a.rating.toFixed(1) + " ★ from " + a.reviews + " patrons"
            : "Not rated yet",
        },
        {
          k: "IDENTITY",
          v: a.sample ? "Sample only · not identity verified" : "Identity verified",
        },
      ],
      topTags: top3.slice(0, 3).map(function (t) {
        return t.label;
      }),
      tagCounts: top3,
      dist: shares.map(function (p, i) {
        var star = 5 - i;
        var count =
          reviewTotal > 0
            ? Number(breakdown[String(star)] || 0)
            : Math.round(a.reviews * p);
        return {
          n: star,
          count: count,
          bar: "height: 100%; width: " + Math.round(p * 100) + "%; background: " + INK,
        };
      }),
      reviewList: (Array.isArray(a.reviewList) ? a.reviewList : []).map(function (r) {
        if (!r) return r;
        var stars = r.stars || "";
        var who = r.who || "PATRON";
        var when = r.when || "";
        var eventRaw = String(r.event || "").trim();
        var event =
          eventRaw && eventRaw.toUpperCase() !== "BOOKING" ? eventRaw.toUpperCase() : "";
        var tags = Array.isArray(r.tags)
          ? r.tags
              .map(function (t) {
                return String(t || "").trim();
              })
              .filter(Boolean)
          : [];
        var hasTags = !!r.hasTags || tags.length > 0;
        var tagItems =
          Array.isArray(r.tagItems) && r.tagItems.length
            ? r.tagItems
            : tags.map(function (label) {
                return { label: label };
              });
        var byline =
          r.byline || [who, event, when].filter(Boolean).join(" · ");
        var meta = r.meta || stars + " — " + byline;
        return Object.assign({}, r, {
          event: event,
          tags: tags,
          hasTags: hasTags,
          tagItems: tagItems,
          byline: byline,
          meta: meta,
        });
      }),
      demos: reelList.map(function (url, i) {
        return {
          video: url,
          // Never use the profile photo as a reel poster — let the video show its own frame.
          poster: "",
          n: ["I", "II", "III", "IV"][i],
          title: i === a.primaryReel ? "Primary reel" : "Reel " + (i + 1),
          len: "",
          thumb: "",
        };
      }),
      unusedDemos: (a.unit === "plate"
        ? ["The live counters", "A wedding spread", "In the kitchen", "Guests at table"]
        : a.unit === "event"
          ? ["A sangeet, decorated", "A birthday setup", "Behind the scenes", "Patrons recall"]
          : [
              "The featured performance",
              "At a house gathering",
              "Behind the scenes",
              "The audience responds",
            ]
      ).map(function (t, i) {
        return {
          video: sampleReel.url,
          poster: musicianPhoto,
          n: ["I", "II", "III", "IV"][i],
          title: t,
          len: "0:04",
          thumb:
            "position: relative; display: flex; align-items: center; justify-content: center; height: 150px; overflow: hidden; background: " +
            PH[i],
        };
      }),
    };
    var tabs = [
      ["about", "Reels"],
      ["avail", "The diary"],
      ["reviews", "Reviews"],
    ].map(function (t) {
      var on = s.tab === t[0];
      return {
        label: t[1],
        on: on,
        pick: function () {
          self.setState({ tab: t[0] });
        },
        style:
          "background: none; border: none; border-bottom: 2px solid " +
          (on ? INK : "transparent") +
          "; margin-bottom: -1px; padding: 8px 2px; min-height: 48px; font-family: Newsreader, serif; font-size: 30px; font-style: " +
          (on ? "italic" : "normal") +
          "; color: " +
          (on ? INK : MUTE),
      };
    });
    // Booking date picker keeps calendar dates (separate from the finder THIS WEEK strip).
    // Clamp: finder "Any day" uses fDay=-1; booking always needs a real calendar index.
    var bookDay = typeof s.bDay === "number" && s.bDay >= 0 ? s.bDay : 0;
    function dateList(dark) {
      return dates.map(function (d, i) {
        var on = bookDay === i,
          free = freeOn(a, i),
          fg = dark ? CREAM : INK,
          bgOn = dark ? CREAM : INK,
          fgOn = dark ? INK : CREAM;
        return {
          dow: i === 0 ? "TODAY" : DOW[d.d],
          num: d.num,
          on: on,
          aria: dayLong(i) + (free ? ", open hours" : ", diary full"),
          pick: function () {
            self.setState({ bDay: i, slot: null });
          },
          style:
            "flex: none; width: 64px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0 10px; border-radius: 32px 32px 4px 4px; border: 1px solid " +
            fg +
            "; background: " +
            (on ? bgOn : "transparent") +
            "; color: " +
            (on ? fgOn : fg) +
            ";" +
            (free || on ? "" : " opacity: .5;"),
          dotStyle:
            "width: 6px; height: 6px; border-radius: 999px; border: 1px solid " +
            (on ? fgOn : fg) +
            "; background: " +
            (free ? (on ? fgOn : fg) : "transparent"),
        };
      });
    }
    var bOff = dayOff(a, bookDay);
    function slotList(dark) {
      return bOff
        ? []
        : a.slots.map(function (t, si) {
            var free = slotFree(a, bookDay, si),
              on = s.slot === t,
              fg = dark ? CREAM : INK;
            return {
              label: t,
              on: on,
              status: free ? (on ? "CHOSEN" : "OPEN") : "ENGAGED",
              aria: t + (free ? " open" : " engaged"),
              pick: function () {
                if (free) self.setState({ slot: t });
              },
              style:
                "border-radius: 999px; border: 1px solid " +
                fg +
                "; padding: 10px 18px; min-height: 46px; font-family: Newsreader, serif; font-size: 22px; background: " +
                (on ? AMBER : "transparent") +
                "; color: " +
                (on ? INK : fg) +
                ";" +
                (on ? " border-color: " + AMBER + ";" : "") +
                (free ? "" : " opacity: .45; text-decoration: line-through; cursor: not-allowed;"),
            };
          });
    }
    var picked = dayShort(bookDay) + (s.slot ? ", " + s.slot : " · hour not chosen");
    var events = [
      "birthday",
      "wedding or sangeet",
      "house gathering",
      "anniversary",
      "office function",
      "café evening",
      "festival or puja",
    ].map(function (e) {
      var on = s.event === e;
      return {
        label: e,
        on: on,
        style: pillD(on),
        pick: function () {
          self.setState({ event: e });
        },
      };
    });
    var qty = a.unit === "plate" ? s.plates : a.unit === "event" ? 1 : s.hours;
    var qtyText =
      a.unit === "plate"
        ? s.plates + " plates"
        : a.unit === "event"
          ? "the occasion"
          : s.hours + (s.hours === 1 ? " hour" : " hours");
    var subtotal = bpc.rate * qty + bpc.travel,
      money = bookingMoney(subtotal, bpc.rate),
      fee = money.fee,
      totalAmt = money.patronPays,
      net = money.net,
      kalzoCut = money.kalzoKeeps,
      adv = money.advance;
    var ready = !bOff && s.address.trim().length > 0;
    var methods = ["UPI", "Card", "Net banking"].map(function (m) {
      var on = s.method === m;
      return {
        label: m,
        on: on,
        style: pill(on),
        pick: function () {
          self.setState({ method: m });
        },
      };
    });
    var stepIdx = s.screen === "book" ? 0 : s.screen === "pay" ? 1 : 2;
    var steps = ["I. INVITATION", "II. SAFE-KEEPING", "III. SEALED"].map(function (nm, i) {
      return {
        label: nm,
        sep: i < 2,
        style:
          "color: " +
          (i === stepIdx ? RUST : i < stepIdx ? INK : "#9A8676") +
          (i === stepIdx ? "; text-decoration: underline; text-underline-offset: 5px" : ""),
      };
    });
    var ICX = {
      lock: "M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3",
      check: "M5 12l4 4 10-10",
      video: "M3 7h12v10H3z M15 10l6-3v10l-6-3",
      key: "M15 7a4 4 0 1 0 .01 0 M12.2 11.8L4 20 M7 17l2 2",
      coins:
        "M12 4c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3z M5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7 M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5",
      hand: "M7 11V6a2 2 0 0 1 4 0v5 M11 10V4a2 2 0 0 1 4 0v7 M15 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a2 2 0 0 1 3.4-2L7 14",
    };
    var e = s.esc;
    var ES = [
      [
        "Paid 100% upfront · held by Kalzo",
        rupees(totalAmt) +
          " rests with Kalzo, not the artist. Refunded in full if " +
          aFirst +
          " declines.",
        ICX.lock,
        null,
        null,
      ],
      [
        aFirst + " accepts the request",
        "The artist gets your request and accepts it. If not, a reconfirmation goes out about 10 hours before the event — still no answer and your money comes straight back, with new artist suggestions.",
        ICX.hand,
        "SIMULATE: ARTIST ACCEPTS",
        function () {
          self.setState({ esc: 1 });
        },
      ],
      [
        "Artist arrives · you share the OTP",
        "When " + aFirst + " reaches your venue, share your arrival OTP 2390.",
        ICX.key,
        "ARTIST ARRIVED · SHARE OTP",
        function () {
          self.setState({ esc: 2 });
        },
      ],
      [
        "Live check-in video",
        "Before the show, " + aFirst + " records a short live video as proof of arrival.",
        ICX.video,
        "SIMULATE: CHECK-IN VIDEO",
        function () {
          self.setState({ esc: 3 });
        },
      ],
      [
        "The performance",
        "Enjoy the show.",
        ICX.check,
        "THE SHOW IS ON",
        function () {
          self.setState({ esc: 4 });
        },
      ],
      [
        "Show ends · you share the closing OTP",
        "When the performance is over, share your closing code; the artist enters it.",
        ICX.key,
        "THE SHOW IS DONE · REVEAL MY CODE",
        function () {
          self.setState({ esc: 5 });
        },
      ],
      [
        "Payment released in 48 hours",
        rupees(net) +
          " (after the " +
          rupees(fee) +
          " Kalzo fee) reaches the artist within 48 hours, or as fast as the bank allows.",
        ICX.coins,
        null,
        null,
      ],
    ];
    var DONE_TEXT = {
      1: aFirst + " accepted your request.",
      2: "Arrival OTP 2390 confirmed at 7:24 PM.",
      3: "20-second live check-in video saved as proof of arrival.",
      4: "Show in progress.",
      6: "Both sides confirmed. " + rupees(net) + " will reach " + aFirst + " within 48 hours.",
    };
    var escSteps = ES.map(function (x, i) {
      var done = i === 0 ? true : i >= 5 ? e >= 6 : i <= e,
        isOtp = i === 5 && e === 5,
        current = !done && i === e + 1;
      return {
        title: x[0],
        text: done && DONE_TEXT[i] ? DONE_TEXT[i] : x[1],
        icon: done ? ICX.check : x[2],
        hasAction: current && !!x[3] && !isOtp,
        actLabel: x[3] || "",
        act: x[4] || function () {},
        isOtp: isOtp,
        dot:
          "flex: none; width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; " +
          (done
            ? "background: #2F4A43; color: " + CREAM + ";"
            : current || isOtp
              ? "border: 1px solid " + RUST + "; color: " + RUST + ";"
              : "border: 1px solid #C2B29C; color: #A8957F;"),
        titleStyle:
          "font-family: Newsreader, serif; font-weight: 400; font-size: 26px; line-height: 1.1; color: " +
          (done || current || isOtp ? INK : "#A8957F"),
      };
    });
    var starBtns = [1, 2, 3, 4, 5].map(function (k) {
      var on = k <= s.stars;
      return {
        on: on,
        aria: k + " star" + (k > 1 ? "s" : ""),
        pick: function () {
          self.setState({ stars: k });
        },
        style:
          "width: 44px; height: 44px; border: none; background: none; font-size: 30px; line-height: 1; color: " +
          (on ? "#C27E1E" : "#C2B29C"),
      };
    });
    var TAGS = [
      "Professional",
      "Punctual",
      "A fine performance",
      "Commands the room",
      "Good value",
    ];
    var rateTags = TAGS.map(function (t) {
      var on = !!s.rTags[t];
      return {
        label: t,
        on: on,
        style: pill(on),
        pick: function () {
          var r = Object.assign({}, s.rTags);
          if (r[t]) delete r[t];
          else r[t] = true;
          self.setState({ rTags: r });
        },
      };
    });
    var canRate = s.stars > 0;
    var promise = [
      [
        "01",
        "Book & pay in full",
        "The whole fee goes into Kalzo’s safe-keeping, never straight to the artist.",
        ICX.lock,
      ],
      [
        "02",
        "The artist accepts",
        "Or your money returns to you in full, automatically.",
        ICX.hand,
      ],
      [
        "03",
        "Live check-in",
        "On arrival, the artist records a live video at your venue.",
        ICX.video,
      ],
      ["04", "Two-way OTP", "After the show you share your code; the artist enters it.", ICX.key],
      [
        "05",
        "Payment released",
        "The fee reaches the artist the moment both sides confirm.",
        ICX.coins,
      ],
    ].map(function (p) {
      return { n: p[0], title: p[1], text: p[2], icon: p[3] };
    });
    function setSaved(id, want) {
      var f = nextSaved(s.saved, id, want);
      persistSaved(f);
      self.setState({ saved: f });
    }
    var savedItems = savedArtists.map(function (a) {
      return {
        id: a.id,
        name: a.name,
        craft: a.craft,
        place: a.city + ", " + a.state,
        rateText: rupees(a.rate),
        unit: unitWord(a),
        photo: artistPhoto(a),
        rating: a.reviews ? a.rating.toFixed(1) : "Not rated",
        reviews: a.reviews,
        list: s.saved[a.id],
        book: function () {
          self.setState({ screen: "book", artistId: a.id, bDay: 0, slot: null, onlySaved: false });
        },
        look: function () {
          setSaved(a.id, "look");
        },
        toBook: function () {
          setSaved(a.id, "book");
        },
        remove: function () {
          setSaved(a.id, s.saved[a.id] || "look");
        },
      };
    });
    var setLocQ = function (ev) {
      var v = ev.target.value;
      if (v.trim()) {
        self.setState({ locQ: v });
        return;
      }
      self.setState({ locQ: "", loc: null, tier: "all" });
      self.refreshVerifiedFromApi({ loc: null, tier: "all" });
    };

    return {
      isHome: s.screen === "home",
      isProfile: s.screen === "profile",
      isBook: s.screen === "book",
      isPay: s.screen === "pay",
      isDone: s.screen === "done",
      isAuthGate: !!s.authPrompt,
      inFlow: s.screen === "book" || s.screen === "pay" || s.screen === "done",
      statesText: "DISCOVER LIVE ARTS ACROSS INDIA",
      houseTotal: all.length.toLocaleString("en-IN"),
      houseLine: realArtists.length
        ? realArtists.length + (realArtists.length === 1 ? " VERIFIED ARTIST" : " VERIFIED ARTISTS")
        : "LIVE ARTS DIRECTORY",
      carousel: carousel,
      trackStyle: trackStyle,
      ciNum: (ci < 9 ? "0" : "") + (ci + 1),
      prevArt: function () {
        self.setState({ ci: (ci + 17) % 18 });
      },
      nextArt: function () {
        self.setState({ ci: (ci + 1) % 18 });
      },
      tStart: function (ev) {
        self.tx = ev.touches && ev.touches[0] ? ev.touches[0].clientX : null;
      },
      tEnd: function (ev) {
        if (self.tx === null || !ev.changedTouches || !ev.changedTouches[0]) return;
        var dx = ev.changedTouches[0].clientX - self.tx;
        self.tx = null;
        if (Math.abs(dx) > 40)
          self.setState({ ci: dx < 0 ? Math.min(17, ci + 1) : Math.max(0, ci - 1) });
      },
      locQ: s.locQ,
      setLocQ: setLocQ,
      hasLoc: !!loc,
      clearLoc: function () {
        var patch = { loc: null, locQ: "", tier: "all", limit: 24 };
        self.setState(patch);
        self.refreshVerifiedFromApi(patch);
      },
      sugg: sugg,
      hasSugg: sugg.length > 0,
      castle: castle,
      locName: locName,
      locSub: locSub,
      castleCap: castleCap,
      dayWord: dayWord,
      artChips: artChips,
      fDates: fDates,
      tods: tods,
      prices: prices,
      starFil: starFil,
      hrsFil: hrsFil,
      sorts: sorts,
      onlyFree: s.onlyFree,
      freeLabel: s.onlyFree ? "✓ Only open artists" : "Show booked artists too",
      freeStyle: pill(s.onlyFree),
      toggleFree: function () {
        self.setState({ onlyFree: !s.onlyFree });
      },
      q: s.q,
      setQ: function (ev) {
        self.setState({ q: ev.target.value, limit: 24 });
      },
      rows: rows,
      noResults: rows.length === 0,
      resTitle: resTitle,
      resSub: resSub,
      hasMore: list.length > s.limit,
      moreLabel: "SHOW MORE · " + (list.length - s.limit) + " REMAINING",
      showMore: function () {
        self.setState({ limit: s.limit + 24 });
      },
      toggleFlow: function () {
        self.setState({ flowOpen: !s.flowOpen });
      },
      flowOpen: s.flowOpen,
      flowLabel: s.flowOpen ? "CLOSE THE MONEY PATH" : "TAP TO SEE HOW THE MONEY MOVES",
      toggleRoom: function () {
        self.setState({ roomOpen: !s.roomOpen });
      },
      roomOpen: s.roomOpen,
      roomLabel: s.roomOpen ? "CLOSE THE PRACTICE ROOM" : "TAP TO TRY A BOOKING, STEP BY STEP",
      togglePhoto: function () {
        self.setState({ media: "photo" });
      },
      toggleVideo: function () {
        self.setState({ media: "video" });
      },
      // Upper media frame stays on the profile portrait; PHOTO/VIDEO panels sit below.
      profilePhoto: s.media !== "video",
      profileVideo: s.media === "video",
      profileMuted: s.profileMuted !== undefined ? s.profileMuted : false,
      profileUnmuted: s.profileMuted !== undefined ? !s.profileMuted : true,
      profileAudioLabel: (s.profileMuted !== undefined ? s.profileMuted : false)
        ? "Unmute video sound"
        : "Mute video sound",
      profileAudioTitle: (s.profileMuted !== undefined ? s.profileMuted : false)
        ? "Unmute"
        : "Mute",
      toggleProfileMute: function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        var currentMuted = s.profileMuted !== undefined ? s.profileMuted : false;
        var nextMuted = !currentMuted;
        self.setState({ profileMuted: nextMuted });
        if (ev && ev.currentTarget) {
          var parent = ev.currentTarget.closest(".kartist-profile-media");
          if (parent) {
            var v = parent.querySelector("video");
            if (v) v.muted = nextMuted;
          }
        }
      },
      mediaControls: true,
      photoOn: s.media !== "video",
      videoOn: s.media === "video",
      photoTile: tileStyle(s.media !== "video"),
      videoTile: tileStyle(s.media === "video"),
      houses: houses,
      hasHouses: houses.length > 0,
      litLine: litLine,
      tierOpts: tierOpts,
      tier: s.tier,
      setTier: function (ev) {
        var patch = { tier: ev.target.value, limit: 24 };
        self.setState(patch);
        self.refreshVerifiedFromApi(patch);
      },
      // Seeded states from GET /locations (fallback: bundled India list).
      stateOpts: stateOpts,
      stateVal: loc ? loc.state || "" : "",
      setStateLoc: function (ev) {
        var v = String(ev.target.value || "").trim();
        if (!v) {
          var cleared = { loc: null, locQ: "", tier: "all", limit: 24 };
          self.setState(cleared);
          self.refreshVerifiedFromApi(cleared);
          return;
        }
        var patch = {
          loc: { type: "state", state: v },
          locQ: v,
          tier: "all",
          limit: 24,
        };
        self.setState(patch);
        self.refreshVerifiedFromApi(patch);
      },
      artOpts: artOpts,
      artVal: arts.length === 1 ? arts[0] : "",
      setArt: function (ev) {
        var v = ev.target.value;
        self.setState({ arts: v ? [v] : [], limit: 24 });
      },
      dayOpts: dayOpts,
      fDayV: String(fd),
      setDayF: function (ev) {
        var patch = { fDay: +ev.target.value, limit: 24 };
        self.setState(patch);
        self.refreshVerifiedFromApi(patch);
      },
      todOpts: todOpts,
      todV: s.tod,
      setTod: function (ev) {
        self.setState({ tod: ev.target.value, limit: 24 });
      },
      hrsLabel: s.hrs ? s.hrs + " HR" : "ANY",
      hrsOpts: [
        [0, "ANY"],
        [1, "1"],
        [2, "2"],
        [3, "3"],
        [4, "4"],
        [5, "5"],
        [6, "6"],
      ].map(function (p) {
        var on = s.hrs === p[0];
        return {
          v: p[0],
          label: p[1],
          on: on,
          style: hrsBtn(on),
          pick: function () {
            self.setState({ hrs: p[0], limit: 24 });
          },
        };
      }),
      maxRateV: s.maxRate,
      rateLabel: s.maxRate >= 20000 ? "ANY RATE" : "UP TO " + rupees(s.maxRate),
      setMaxRate: function (ev) {
        self.setState({ maxRate: +ev.target.value, limit: 24 });
      },
      sortOpts: sortOpts,
      sortV: s.sort,
      setSort: function (ev) {
        self.setState({ sort: ev.target.value });
      },
      starOpts: starOpts,
      // Hide minimum-rating filter until reviews are live.
      showRatingFilters: false,
      minStarV: String(s.minStar),
      setMinStar: function (ev) {
        self.setState({ minStar: parseFloat(ev.target.value) || 0, limit: 24 });
      },
      favCount: counts.total,
      hasFav: counts.total > 0,
      savedLabel: "Your list (" + counts.total + ")",
      lookCount: counts.look,
      bookCount: counts.book,
      isSavedView: s.onlySaved,
      savedItems: savedItems,
      promise: promise,
      sel: sel,
      tabs: tabs,
      tabAboutOn: s.tab === "about",
      tabAvailOn: s.tab === "avail",
      tabReviewsOn: s.tab === "reviews",
      dateL: dateList(false),
      dateD: dateList(false),
      slotL: slotList(false),
      slotD: slotList(false),
      bDayOff: bOff,
      bDayLong: dayLong(bookDay),
      pickedText: picked,
      selIsFav: !!s.saved[a.id],
      selFavLabel: s.saved[a.id] ? "♥ on your list" : "♡ keep to look later",
      events: events,
      event: s.event,
      address: s.address,
      area: s.area,
      landmark: s.landmark,
      guests: s.guests,
      note: s.note,
      hoursText: qtyText,
      showStepper: a.unit !== "event",
      perfLabel:
        a.unit === "event"
          ? "PERFORMANCE (FOR THE OCCASION)"
          : "PERFORMANCE (" + sel.rateText + " × " + qtyText + ")",
      perfText: rupees(bpc.rate * qty),
      subtotalText: rupees(subtotal),
      feeText: rupees(fee),
      totalText: rupees(totalAmt),
      netText: rupees(net),
      kalzoText: rupees(kalzoCut),
      addressShort:
        (s.address.trim() || "venue to be given") + (s.area.trim() ? ", " + s.area.trim() : ""),
      continueLabel: ready
        ? "SEAL THE INVITATION →"
        : bOff || !s.slot
          ? "CHOOSE AN HOUR FIRST"
          : "ADD THE ADDRESS",
      continueStyle:
        "border-radius: 999px; padding: 15px 26px; font-family: DM Mono, monospace; font-size: 13px; letter-spacing: 0.14em; min-height: 54px; border: 1px solid " +
        (ready ? AMBER : "rgba(42,29,24,.4)") +
        "; " +
        (ready
          ? "background: " + AMBER + "; color: " + INK + ";"
          : "background: transparent; color: rgba(42,29,24,.55); cursor: not-allowed;"),
      releaseRules: [
        { title: "The artist accepts", text: "or your money is returned in full.", icon: ICX.hand },
        {
          title: "A live check-in video",
          text: "is recorded at your venue on the day.",
          icon: ICX.video,
        },
        {
          title: "You share your OTP after the show",
          text: "the artist enters it, and the fee is released at once.",
          icon: ICX.key,
        },
      ],
      methods: methods,
      steps: steps,
      payLabel: a.sample
        ? "SAMPLE ONLY · BOOKING DISABLED"
        : s.payBusy
          ? "OPENING PAYMENT…"
          : "PAY " + rupees(totalAmt) + " · SEAL INVITATION",
      payErr: s.payErr,
      hasPayErr: !!s.payErr,
      flowBackLabel:
        s.screen === "book"
          ? "BACK TO " + a.name.toUpperCase()
          : s.screen === "pay"
            ? "BACK TO THE INVITATION"
            : "BACK TO THE SEARCH",
      bookingId: "Nº KZ-" + (48210 + qty * 13 + bookDay * 7),
      escSteps: escSteps,
      released: e >= 6,
      selectedArtistId: a.id,
      selectedIsSample: !!a.sample,
      notSample: !a.sample,
      flowInfo: {
        name: a.name,
        first: aFirst,
        city: a.city,
        unit: a.unit,
        rate: bpc.rate,
        travel: bpc.travel,
        subtotal: subtotal,
        qtyText: qtyText,
      },
      otpIn: s.otpIn,
      otpErr: s.otpErr,
      setOtp: function (ev) {
        self.setState({ otpIn: ev.target.value.replace(/\D/g, "").slice(0, 4), otpErr: false });
      },
      checkOtp: function () {
        if (s.otpIn === "4817") self.setState({ esc: 6, otpErr: false });
        else self.setState({ otpErr: true });
      },
      starBtns: starBtns,
      rateTags: rateTags,
      notRated: !s.rated,
      rated: s.rated,
      myStars: starStr(s.stars),
      myTags: (function () {
        var tags = Object.keys(s.rTags);
        var custom = String(s.customTag || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40);
        if (custom) {
          var key = custom.toLowerCase();
          var has = tags.some(function (t) {
            return t.toLowerCase() === key;
          });
          if (!has) tags.push(custom);
        }
        return tags.join(", ") || "no particular remarks";
      })(),
      customTag: s.customTag || "",
      setCustomTag: function (ev) {
        self.setState({ customTag: String(ev.target.value || "").slice(0, 40) });
      },
      rateBtnStyle:
        "align-self: flex-start; border-radius: 999px; padding: 10px 22px; font-family: DM Mono, monospace; font-size: 12px; letter-spacing: 0.14em; min-height: 44px; border: 1px solid " +
        INK +
        "; " +
        (canRate
          ? "background: " + INK + "; color: " + CREAM + ";"
          : "background: transparent; color: #A8957F; border-color: #C2B29C; cursor: not-allowed;"),
      clearFilters: function () {
        var patch = {
          loc: null,
          locQ: "",
          arts: [],
          fDay: 0,
          tod: "Any",
          price: "any",
          minStar: 0,
          hrs: 0,
          tier: "all",
          maxRate: 20000,
          sort: "renown",
          q: "",
          onlyFree: true,
          onlySaved: false,
          limit: 24,
        };
        self.setState(patch);
        self.refreshVerifiedFromApi(patch);
      },
      showSaved: function () {
        self.setState({ screen: "home", onlySaved: true });
      },
      selFav: function () {
        if (!self.isSigned) {
          self.setState({ authPrompt: true });
          return;
        }
        setSaved(a.id, "look");
      },
      goHome: function () {
        if (typeof window !== "undefined") {
          try {
            var u = new URL(window.location.href);
            u.searchParams.delete("artist");
            window.history.pushState({}, "", u.toString());
          } catch (e) {}
        }
        self.setState({ screen: "home", onlySaved: false });
      },
      tabAvail: function () {
        self.setState({ tab: "avail" });
      },
      goBook: function () {
        self.setState({ screen: "book" });
      },
      flowBack: function () {
        self.setState({
          screen: s.screen === "book" ? "profile" : s.screen === "pay" ? "book" : "home",
        });
      },
      // Invitation form → safe-keeping / pay screen.
      toPay: function () {
        if (!ready) return;
        if (a.sample) {
          self.setState({ payErr: "This is a sample profile and cannot be booked." });
          return;
        }
        self.setState({ screen: "pay", payErr: "" });
      },
      // Pay screen → create booking + Razorpay Checkout + verify.
      pay: function () {
        if (!ready || a.sample || s.payBusy) return;
        self.setState({ payBusy: true, payErr: "" });
        window.dispatchEvent(
          new CustomEvent("kalzo:book", {
            detail: {
              artist_id: a.id,
              artist_name: a.name,
              event_date: dates[bookDay].iso,
              slot: s.slot || "",
              quantity: qty,
              city: loc && loc.type === "city" ? loc.city : "",
              address: [s.address.trim(), s.area.trim(), s.landmark.trim()].filter(Boolean).join(", "),
              guests: String(s.guests || "").trim(),
              note: [s.event ? "Occasion: " + s.event : "", String(s.note || "").trim()]
                .filter(Boolean)
                .join(" · "),
              expected_total: totalAmt,
            },
          }),
        );
      },
      submitRating: function () {
        if (canRate) self.setState({ rated: true });
      },
      restart: function () {
        self.setState({
          screen: "home",
          slot: null,
          address: "",
          area: "",
          landmark: "",
          guests: "",
          note: "",
          esc: 0,
          otpIn: "",
          rated: false,
          stars: 0,
          rTags: {},
          customTag: "",
        });
      },
      lessHours: function () {
        if (a.unit === "plate") self.setState({ plates: Math.max(25, s.plates - 25) });
        else self.setState({ hours: Math.max(1, s.hours - 1) });
      },
      moreHours: function () {
        if (a.unit === "plate") self.setState({ plates: Math.min(1000, s.plates + 25) });
        else self.setState({ hours: Math.min(8, s.hours + 1) });
      },
      setAddress: function (ev) {
        self.setState({ address: ev.target.value });
      },
      setArea: function (ev) {
        self.setState({ area: ev.target.value });
      },
      setLandmark: function (ev) {
        self.setState({ landmark: ev.target.value });
      },
      setGuests: function (ev) {
        self.setState({ guests: ev.target.value });
      },
      setNote: function (ev) {
        self.setState({ note: ev.target.value });
      },
    };
  }
}

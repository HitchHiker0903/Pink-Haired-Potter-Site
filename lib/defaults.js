// Starting content for the site. These values are copied into the database the
// first time the site runs. After that, edit everything from the Admin page
// (Page Text and Shipping tabs) – changing this file will NOT overwrite edits.

export const DEFAULT_SHIPPING = {
  // Price by total PACKED weight of the order (pounds, including box + padding).
  tiers: [
    { upToLbs: 3, price: 12 },
    { upToLbs: 6, price: 18 },
    { upToLbs: 12, price: 26 },
    { upToLbs: 20, price: 36 },
  ],
  overMaxPerLb: 2, // for orders heavier than the last tier: added $ per extra pound
  farZipPrefixes: '0,1,9', // ZIPs starting with these digits get the surcharge below
  farSurcharge: 0, // $ added for far ZIPs (0 = off)
  freeShippingOver: 0, // free shipping when merchandise subtotal reaches this $ (0 = off)
  pickupEnabled: true,
  pickupCity: 'Olathe, KS',
};

export const DEFAULT_CONTENT = {
  business_name: 'The Pink Haired Potter',
  artist_name: 'Allison Almloff',
  contact_email: 'thepinkhairedpotter@gmail.com',
  instagram_url: '',
  facebook_url: '',
  announcement: '',

  hero_title: 'A little sparkle for every day',
  hero_text:
    'Functional ceramic dinnerware in bright, bold color – finished with glittery resin details made to bring people together and turn an ordinary day into a celebration.',

  home_about_teaser:
    'Inspired by Lisa Frank’s unapologetically colorful artwork and the bold fashion of the ’80s and ’90s, every piece is made to be used, shared, and celebrated. The glittery resin feet and handles work like jelly shoes for your mug – functional, but also a fabulous accessory.',

  about_text: `I create functional ceramic dinnerware with the goal of bringing people together and infusing a sense of celebration into everyday life. By observing my work, the viewer is immediately struck by the bright, bold color combinations and resin surface details. Drawing inspiration from my memories of Lisa Frank’s unapologetically colorful artwork as well as the bold fashion statements from the '80s and '90s, my work evokes a sense of fun and spontaneity. I take this approach in my own life and wardrobe and my pottery mirrors that same fearless embrace of color and joy. In addition to the bright glazes used, the glittery resin cast pieces demand a second look. Much like the jelly shoes of the ’90s these attached pieces are functional, but can also take on the appearance of an accessory to the body of each piece. The plastic quality of the resin also creates a sense of accessibility and fun that color alone could not achieve. This combination of materials leaves the viewer enticed and wondering what is ceramic and what is not.

When using my pieces in everyday settings they are able to serve as vessels that facilitate the creation of community. By sharing a cup of coffee, or having a meal with others, social barriers can be broken, bonds are strengthened and connections are made. The bright colors, glitter and gold create a sense of celebration with each encounter. Whether a table is set with my work, or a bowl is filled with fruit on the counter, my work invites you to look closer and be welcomed into the idea that a little sparkle and shine can bring celebration to an ordinary day.`,

  custom_intro: `Dreaming of a mug in your favorite colors, a matching set for your table, or a one-of-a-kind gift? Tell me what you have in mind and I’ll get back to you with ideas, a price, and a timeline.

Custom pieces are handmade from scratch, so please allow several weeks. Once we agree on the design and price, a deposit reserves your spot.`,

  care_text: `Every piece is handmade and made to be used and enjoyed.

Hand washing is recommended. Resin details, glitter, and gold accents are not microwave or dishwasher safe. Avoid sudden temperature changes (for example, pouring boiling water into a cold mug).`,

  policies_text: `Because each piece is one of a kind, all sales are final.

If your order arrives damaged, email me within 48 hours of delivery with photos of the piece and the packaging, and we’ll make it right.

Orders ship within 3–5 business days. You’ll receive a tracking number by email once your package is on its way.`,

  pickup_text:
    'Free local pickup in Olathe, KS. The pickup address is shown after checkout, and I’ll email you to schedule a time.',

  // Private: only shown on the order confirmation page for pickup orders.
  private_pickup_address: '508 N Hamilton Street, Olathe, KS 66061',
  private_pickup_instructions: 'I’ll email you within 1–2 days to schedule a pickup time.',

  shipping: JSON.stringify(DEFAULT_SHIPPING),
};

// Starter gallery (static files in /public/images/work). Delete or replace in Admin.
export const DEFAULT_GALLERY = [
  { url: '/images/work/yellow-pink-mug.jpg', caption: 'Yellow mug with pink glitter resin handle and feet', collection: 'Mugs' },
  { url: '/images/work/blue-orange-mug.jpg', caption: 'Turquoise mug with orange resin handle and feet', collection: 'Mugs' },
  { url: '/images/work/electric-blue-cup.jpg', caption: 'Electric blue and lime cup with glitter resin feet', collection: 'Cups' },
  { url: '/images/work/abstract-dinnerware-set.jpg', caption: 'Abstract color dinnerware set', collection: 'Dinnerware' },
];

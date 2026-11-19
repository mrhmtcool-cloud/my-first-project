/**
 * seed.js — Day-one demo data for a PAN-INDIA launch.
 * 16 icon-driven categories (bilingual) + 93 providers across 10 cities,
 * realistic Indian names/areas, reviews in Hindi + English.
 * Phone numbers are clearly-fake demo numbers (9xxxxxxx pattern).
 */

const CATEGORIES = [
  { id: 'electrician', name_en: 'Electrician', name_hi: 'इलेक्ट्रीशियन', icon: 'bolt', order: 1, active: true,
    subcategories: [
      { id: 'house-wiring', name_en: 'House Wiring', name_hi: 'घर की वायरिंग' },
      { id: 'fan-inverter', name_en: 'Fan / Inverter', name_hi: 'पंखा / इन्वर्टर' },
      { id: 'electrical-repair', name_en: 'Electrical Repair', name_hi: 'बिजली मरम्मत' } ] },
  { id: 'engineer', name_en: 'Engineer', name_hi: 'इंजीनियर', icon: 'helmet', order: 2, active: true,
    subcategories: [
      { id: 'civil', name_en: 'Civil Engineer', name_hi: 'सिविल इंजीनियर' },
      { id: 'site-supervisor', name_en: 'Site Supervisor', name_hi: 'साइट सुपरवाइजर' },
      { id: 'estimation', name_en: 'Estimation / Drawing', name_hi: 'एस्टीमेट / ड्राइंग' } ] },
  { id: 'tailor', name_en: 'Tailor', name_hi: 'दर्जी', icon: 'shirt', iconImage: '/icons/cat-tailor-white.png', order: 3, active: true,
    subcategories: [
      { id: 'blouse-suit', name_en: 'Blouse / Suit Stitching', name_hi: 'ब्लाउज / सूट सिलाई' },
      { id: 'alteration', name_en: 'Alteration', name_hi: 'अल्टरेशन' },
      { id: 'boutique', name_en: 'Boutique / Designer', name_hi: 'बुटीक / डिज़ाइनर' } ] },
  { id: 'dry-cleaner', name_en: 'Dry Cleaner', name_hi: 'ड्राई क्लीनर', icon: 'hanger', order: 4, active: true,
    subcategories: [
      { id: 'dry-clean', name_en: 'Dry Clean', name_hi: 'ड्राई क्लीन' },
      { id: 'laundry', name_en: 'Laundry', name_hi: 'लॉन्ड्री' },
      { id: 'steam-press', name_en: 'Steam Press', name_hi: 'स्टीम प्रेस' } ] },
  { id: 'raj-mistri', name_en: 'Raj Mistri (Mason)', name_hi: 'राज मिस्त्री', icon: 'brick', order: 5, active: true,
    subcategories: [
      { id: 'brickwork', name_en: 'Brick / Masonry', name_hi: 'ईंट / राज मिस्त्री काम' },
      { id: 'plaster', name_en: 'Plaster / POP', name_hi: 'प्लास्टर / पीओपी' },
      { id: 'tiles', name_en: 'Tiles / Flooring', name_hi: 'टाइल्स / फर्श' } ] },
  { id: 'bhandara-catering', name_en: 'Bhandara / Catering', name_hi: 'भंडारा / कैटरिंग', icon: 'pot', order: 6, active: true,
    subcategories: [
      { id: 'bhandara', name_en: 'Bhandara / Langar', name_hi: 'भंडारा / लंगर' },
      { id: 'catering', name_en: 'Party Catering', name_hi: 'पार्टी कैटरिंग' },
      { id: 'sweets', name_en: 'Sweets / Namkeen', name_hi: 'मिठाई / नमकीन' } ] },
  { id: 'plumber', name_en: 'Plumber', name_hi: 'प्लंबर', icon: 'wrench', order: 7, active: true,
    subcategories: [
      { id: 'tap-leak', name_en: 'Tap / Leak Repair', name_hi: 'नल / लीक मरम्मत' },
      { id: 'fitting', name_en: 'Bathroom Fitting', name_hi: 'बाथरूम फिटिंग' },
      { id: 'tank', name_en: 'Water Tank Work', name_hi: 'पानी टंकी काम' } ] },
  { id: 'carpenter', name_en: 'Carpenter', name_hi: 'बढ़ई', icon: 'hammer', order: 8, active: true,
    subcategories: [
      { id: 'furniture', name_en: 'Furniture', name_hi: 'फर्नीचर' },
      { id: 'door-window', name_en: 'Door / Window', name_hi: 'दरवाज़ा / खिड़की' },
      { id: 'repair', name_en: 'Repair Work', name_hi: 'मरम्मत काम' } ] },
  { id: 'painter', name_en: 'Painter', name_hi: 'पेंटर', icon: 'brush', order: 9, active: true,
    subcategories: [
      { id: 'interior', name_en: 'Interior Painting', name_hi: 'इंटीरियर पेंट' },
      { id: 'exterior', name_en: 'Exterior Painting', name_hi: 'एक्सटीरियर पेंट' },
      { id: 'polish', name_en: 'Polish / Duco', name_hi: 'पॉलिश / ड्यूको' } ] },
  { id: 'safai-karamchari', name_en: 'Safai Karamchari', name_hi: 'सफाई कर्मचारी', icon: 'broom', order: 10, active: true,
    subcategories: [
      { id: 'house-cleaning', name_en: 'House Cleaning', name_hi: 'घर की सफाई' },
      { id: 'office-cleaning', name_en: 'Office / Shop Cleaning', name_hi: 'ऑफिस / दुकान सफाई' },
      { id: 'deep-clean', name_en: 'Deep Cleaning', name_hi: 'डीप क्लीनिंग' } ] },
  { id: 'ac-fridge-repair', name_en: 'AC / Fridge Repair', name_hi: 'एसी / फ्रिज मरम्मत', icon: 'snow', order: 11, active: true,
    subcategories: [
      { id: 'ac-repair', name_en: 'AC Repair / Service', name_hi: 'एसी मरम्मत / सर्विस' },
      { id: 'fridge', name_en: 'Fridge Repair', name_hi: 'फ्रिज मरम्मत' },
      { id: 'washing-machine', name_en: 'Washing Machine', name_hi: 'वॉशिंग मशीन' } ] },
  { id: 'driver', name_en: 'Driver', name_hi: 'ड्राइवर', icon: 'wheel', order: 12, active: true,
    subcategories: [
      { id: 'personal-driver', name_en: 'Personal Driver', name_hi: 'पर्सनल ड्राइवर' },
      { id: 'taxi', name_en: 'Taxi / Cab', name_hi: 'टैक्सी / कैब' },
      { id: 'goods', name_en: 'Goods Vehicle', name_hi: 'माल गाड़ी' } ] },
  { id: 'mobile-repair', name_en: 'Mobile Repair', name_hi: 'मोबाइल मरम्मत', icon: 'mobile', order: 13, active: true,
    subcategories: [
      { id: 'screen-battery', name_en: 'Screen / Battery', name_hi: 'स्क्रीन / बैटरी' },
      { id: 'software', name_en: 'Software / Update', name_hi: 'सॉफ्टवेयर / अपडेट' },
      { id: 'accessories', name_en: 'Accessories / Charging', name_hi: 'एक्सेसरीज़ / चार्जिंग' } ] },
  { id: 'beautician', name_en: 'Beautician at Home', name_hi: 'ब्यूटीशियन (घर पर)', icon: 'scissors', iconImage: '/icons/cat-beautician-white.png', order: 14, active: true,
    subcategories: [
      { id: 'bridal', name_en: 'Bridal Makeup', name_hi: 'दुल्हन मेकअप' },
      { id: 'salon-home', name_en: 'Salon at Home', name_hi: 'घर पर सैलून' },
      { id: 'mehndi', name_en: 'Mehndi / Hair', name_hi: 'मेहंदी / हेयर' } ] },
  { id: 'cook', name_en: 'Cook / Rasoiya', name_hi: 'कुक / रसोइया', icon: 'chef', order: 15, active: true,
    subcategories: [
      { id: 'home-cook', name_en: 'Home Cook', name_hi: 'घर का खाना' },
      { id: 'party-cook', name_en: 'Party Cook', name_hi: 'पार्टी कुक' },
      { id: 'tiffin', name_en: 'Tiffin Service', name_hi: 'टिफिन सर्विस' } ] },
  { id: 'mali', name_en: 'Mali / Gardener', name_hi: 'माली / बागवान', icon: 'leaf', order: 16, active: true,
    subcategories: [
      { id: 'garden-care', name_en: 'Garden Care', name_hi: 'बगीचा देखभाल' },
      { id: 'plants', name_en: 'Indoor Plants', name_hi: 'इनडोर प्लांट' },
      { id: 'lawn', name_en: 'Lawn / Tree Trim', name_hi: 'लॉन / पेड़ कटाई' } ] },
  { id: 'medical', name_en: 'Medical Services', name_hi: 'मेडिकल सर्विसेज़', icon: 'medical', iconImage: '/icons/cat-medical-white.png', order: 17, active: true,
    subcategories: [
      { id: 'doctor', name_en: 'Doctor / Clinic', name_hi: 'डॉक्टर / क्लिनिक' },
      { id: 'nurse', name_en: 'Nurse / Attendant', name_hi: 'नर्स / अटेंडेंट' },
      { id: 'pharmacy', name_en: 'Medical Store / Pharmacy', name_hi: 'मेडिकल स्टोर / फार्मेसी' },
      { id: 'lab-test', name_en: 'Lab / X-Ray / Test', name_hi: 'लैब / एक्स-रे / टेस्ट' },
      { id: 'physio', name_en: 'Physiotherapy', name_hi: 'फिजियोथेरेपी' } ] },
  { id: 'others', name_en: 'Other Services', name_hi: 'अन्य सेवाएँ', icon: 'toolbox', order: 18, active: true,
    customAllowed: true, // ← provider apni service ka naam khud likh sakta hai (customService field)
    subcategories: [
      { id: 'custom', name_en: 'Custom Service (type your own)', name_hi: 'अपनी सेवा लिखें' } ] },
];

const CITIES = [
  { id: 'indore', name_en: 'Indore', name_hi: 'इंदौर', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { id: 'bhopal', name_en: 'Bhopal', name_hi: 'भोपाल', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { id: 'jaipur', name_en: 'Jaipur', name_hi: 'जयपुर', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { id: 'pune', name_en: 'Pune', name_hi: 'पुणे', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { id: 'lucknow', name_en: 'Lucknow', name_hi: 'लखनऊ', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { id: 'patna', name_en: 'Patna', name_hi: 'पटना', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { id: 'nagpur', name_en: 'Nagpur', name_hi: 'नागपुर', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { id: 'surat', name_en: 'Surat', name_hi: 'सूरत', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { id: 'ahmedabad', name_en: 'Ahmedabad', name_hi: 'अहमदाबाद', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { id: 'varanasi', name_en: 'Varanasi', name_hi: 'वाराणसी', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { id: 'raipur', name_en: 'Raipur', name_hi: 'रायपुर', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  { id: 'bhilai', name_en: 'Bhilai', name_hi: 'भिलाई', state: 'Chhattisgarh', lat: 21.1938, lng: 81.3509 },
  { id: 'bilaspur', name_en: 'Bilaspur', name_hi: 'बिलासपुर', state: 'Chhattisgarh', lat: 22.0797, lng: 82.1409 },
];

/** Compact provider tuple → full record.
 * [name, business, cat, sub, phone, cityId, area, pincode, dLat, dLng, about, skills, price, rating, count, source, verified] */
const P = (t) => {
  const [name, businessName, categoryId, subcategory, phone, cityId, area, pincode, dLat, dLng, about, skills, priceHint, ratingAvg, ratingCount, source, verified, userId] = t;
  const city = CITIES.find((c) => c.id === cityId);
  const hours = t[18] || { open: '09:00', close: '19:00', offDays: [0] };
  return {
    id: 'prv_' + businessName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) + '_' + cityId.slice(0, 3),
    userId: userId || null,
    name, businessName, categoryId, subcategory,
    customService: '',           // 'others' category me provider apni service ka naam likhta hai
    phone, whatsapp: phone,
    photo: null, // null → UI renders a low-bandwidth SVG monogram avatar
    gallery: [],                 // kaam ki photos (data-URL, max 6) — provider dashboard se upload
    videoLinks: [],              // YouTube links [{url, videoId}] — max 5
    about, skills,
    priceHint,
    address: { line1: area + ', ' + city.name_en, area, city: city.name_en, cityId, state: city.state, district: '', pincode },
    location: { lat: +(city.lat + dLat).toFixed(6), lng: +(city.lng + dLng).toFixed(6) },
    availability: { manualOpen: true, hours: { open: hours.open, close: hours.close }, offDays: hours.offDays },
    verified,
    source,
    kycStatus: source === 'self' ? 'submitted' : 'admin-added',
    ratingAvg, ratingCount,
    languages: ['hi', 'en'],
    createdAt: '2026-08-01T10:00:00.000Z',
  };
};

const PROVIDERS = P.toString; // (placeholder to keep linter quiet — real list below)

function buildProviders() {
  const list = [
    // ─── INDORE ────────────────────────────────────────────────────────────
    P(['Ramprasad Yadav', 'Shree Ram Raj Mistri Karyalaya', 'raj-mistri', 'brickwork', '9826011101', 'indore', 'Rajwada, Sarafa Bazaar', '452002', 0.004, -0.003, '20+ saal ka anubhav — makan, deewar, plaster aur tiles ka pura kaam. Mazdoor team ke saath.', ['Brickwork', 'Plaster', 'House construction'], '₹450/day per mazdoor', 4.8, 64, 'admin', 'verified']),
    P(['Sunita Verma', 'Verma Electricals', 'electrician', 'house-wiring', '9826011102', 'indore', 'Vijay Nagar', '452010', 0.021, 0.030, 'Ghar ki wiring, MCB, inverter fitting — ladies electrician team available.', ['House wiring', 'MCB', 'Inverter'], '₹250 visit', 4.6, 41, 'self', 'verified', 'u_sunita']),
    P(['Imran Qureshi', 'Qureshi Tailors & Boutique', 'tailor', 'blouse-suit', '9826011103', 'indore', 'Sarafa Road, Itwaria Bazaar', '452002', 0.002, 0.008, 'Blouse, suit, kurti silai — 24 ghante me delivery option. Bridal orders welcome.', ['Blouse stitching', 'Suit', 'Bridal'], '₹150 blouse onwards', 4.9, 88, 'admin', 'verified']),
    P(['Anil Kushwaha', 'Kushwaha Plumbing Works', 'plumber', 'tap-leak', '9826011104', 'indore', 'Sudama Nagar', '452009', -0.035, -0.028, 'Nal, leak, motor, bathroom fitting — emergency me 30 minute me. 24x7 emergency service.', ['Leak repair', 'Bathroom fitting', 'Motor'], '₹200 visit', 4.4, 33, 'self', 'verified', 'u_anil', { open: '00:00', close: '23:59', offDays: [] }]),
    P(['Dinesh Patidar', 'Patidar AC & Fridge Care', 'ac-fridge-repair', 'ac-repair', '9826011105', 'indore', 'Palasia', '452001', 0.010, 0.006, 'AC gas filling, service, fridge & washing machine repair. All brands.', ['AC service', 'Gas filling', 'Fridge'], '₹350 service', 4.5, 52, 'admin', 'verified'], ),
    P(['Rafiq Khan', 'Khan Dry Cleaners', 'dry-cleaner', 'dry-clean', '9826011106', 'indore', 'New Market, Bhawarkua', '452001', -0.006, -0.010, 'Dry clean, laundry, steam press — suiting, sherwani, saree specialist. Home pickup available.', ['Dry clean', 'Laundry', 'Sherwani'], '₹40/kg laundry', 4.3, 27, 'admin', 'verified']),
    P(['Bhagwan Das', 'Das Safai Sewa', 'safai-karamchari', 'deep-clean', '9826011107', 'indore', 'Mhow Naka', '452001', -0.018, 0.012, 'Ghar, office, tank ki safai. Deep cleaning team — festival season advance booking.', ['Deep cleaning', 'Water tank', 'Office cleaning'], '₹1200/day team', 4.2, 19, 'self', 'verified', 'u_bhagwan']),
    P(['Mahesh Chouhan', 'Chouhan Carpenter Works', 'carpenter', 'furniture', '9826011108', 'indore', 'Bicholi Mardana', '452016', 0.040, 0.015, 'Furniture, bed, almari, door-window — order se banaya jata hai.', ['Furniture', 'Modular kitchen', 'Doors'], 'Quote on visit', 4.7, 38, 'admin', 'verified'], ),
    P(['Ramesh Solanki', 'Solanki Paint House', 'painter', 'interior', '9826011109', 'indore', 'Nipania', '452016', 0.032, 0.041, 'Interior/exterior paint, putty, polish. Asian Paints dealer partner.', ['Interior paint', 'Putty', 'Polish'], '₹12/sqft onwards', 4.5, 45, 'admin', 'verified']),
    P(['Amit Tiwari', 'Tiwari Bhandara & Catering', 'bhandara-catering', 'bhandara', '9826011110', 'indore', 'Khajrana', '452016', 0.028, 0.038, 'Bhandara, langar, shadi, bhog — 50 se 5000 logon tak ka intezaam. Bartan aur sevak samet.', ['Bhandara', 'Wedding catering', 'Bhog'], '₹80/thali onwards', 4.8, 71, 'admin', 'verified']),
    P(['Sanjay Mehta', 'Mehta Electrical Engineer', 'engineer', 'estimation', '9826011111', 'indore', 'AB Road, Bhawarkua', '452001', -0.009, -0.015, 'BE Electrical — ghar/factory ka load calculation, estimation, drawing, supervision.', ['Load calculation', 'Estimation', 'Supervision'], '₹1500/visit consult', 4.6, 22, 'self', 'verified', 'u_sanjay']),
    P(['Golu Yadav', 'Golu Driver Seva', 'driver', 'personal-driver', '9826011112', 'indore', 'Snehlataganj', '452001', 0.005, -0.020, 'Personal driver, outstation, pickup-drop. 10 saal ka experience. Night drive ok.', ['Personal driver', 'Outstation', 'Airport drop'], '₹700/day', 4.4, 29, 'self', 'verified', 'u_golu', { open: '00:00', close: '23:59', offDays: [] }]),

    // ─── BHOPAL ────────────────────────────────────────────────────────────
    P(['Shakeel Ahmed', 'Ahmed Electric Works', 'electrician', 'fan-inverter', '9826021101', 'bhopal', 'Hamidia Road, Itkhedi', '462001', 0.008, -0.012, 'Pankha, cooler, inverter, ghar ki wiring. Same-day service.', ['Fan repair', 'Inverter', 'Wiring'], '₹200 visit', 4.5, 36, 'admin', 'verified']),
    P(['Kailash Vishwakarma', 'Vishwakarma Raj Mistri', 'raj-mistri', 'plaster', '9826021102', 'bhopal', 'Kolar Road', '462042', -0.022, 0.018, 'Plaster, deewar, makan ka pura kaam. 15 mazdooron ki team.', ['Plaster', 'Masonry', 'Flooring'], '₹500/day', 4.6, 44, 'admin', 'verified']),
    P(['Rekha Sahu', 'Sahu Boutique & Tailors', 'tailor', 'boutique', '9826021103', 'bhopal', 'MP Nagar Zone 2', '462011', 0.012, 0.004, 'Designer blouse, suit, lehenga. Ladies tailoring classes bhi.', ['Boutique', 'Lehenga', 'Classes'], '₹200 onwards', 4.8, 57, 'self', 'verified', 'u_rekha']),
    P(['Javed Iqbal', 'Iqbal Plumbers', 'plumber', 'fitting', '9826021104', 'bhopal', 'Arera Colony', '462016', 0.015, 0.010, 'Bathroom & kitchen fitting, CPVC, concealed leak detection.', ['CPVC', 'Fitting', 'Leak detection'], '₹250 visit', 4.3, 25, 'admin', 'verified']),
    P(['Ravi Malviya', 'Malviya Catering Services', 'bhandara-catering', 'catering', '9826021105', 'bhopal', 'Bairagarh', '462030', -0.030, -0.025, 'Shadi, mundan, bhandara — pura setup ke saath. Veg specialist.', ['Wedding', 'Bhandara', 'Full setup'], '₹150/plate', 4.7, 63, 'admin', 'verified']),
    P(['Suresh Prajapati', 'Prajapati Potteries & Pots', 'bhandara-catering', 'bhandara', '9826021106', 'bhopal', 'Idgah Hills', '462001', 0.006, 0.014, 'Bhandara ke liye bartan, handi, chulha kiraye par — safai samet.', ['Utensils on rent', 'Handi', 'Chulha'], '₹1500 setup', 4.1, 14, 'self', 'pending', 'u_suresh']),

    // ─── JAIPUR ────────────────────────────────────────────────────────────
    P(['Girdhari Lal Sharma', 'Sharma Mason Works', 'raj-mistri', 'tiles', '9826031101', 'jaipur', 'Bapu Bazaar', '302003', 0.005, -0.007, 'Tiles, flooring, marble — 25 saal ka tajurba. Hawa Mahal area me famous.', ['Tiles', 'Marble', 'Flooring'], '₹550/day', 4.7, 51, 'admin', 'verified']),
    P(['Mohammad Arif', 'Arif Tailor House', 'tailor', 'alteration', '9826031102', 'jaipur', 'Chandpole', '302001', 0.002, 0.003, 'Pant-shirt, salwar-suit alteration & stitching. 1 ghante me urgent alteration.', ['Alteration', 'Stitching', 'Urgent'], '₹30 alteration', 4.4, 73, 'admin', 'verified']),
    P(['Deepak Saini', 'Saini Electricals Jhotwara', 'electrician', 'electrical-repair', '9826031103', 'jaipur', 'Jhotwara', '302012', -0.018, -0.014, 'Factory & ghar electrical work, panel, motor winding.', ['Panel', 'Motor winding', 'Wiring'], '₹300 visit', 4.5, 30, 'self', 'verified', 'u_deepak']),
    P(['Lakhan Meena', 'Meena Paint & Polish', 'painter', 'exterior', '9826031104', 'jaipur', 'Mansarovar', '302020', -0.012, 0.020, 'Exterior paint jo Rajasthan ki garmi jhel le. Distemper, weather coat.', ['Exterior', 'Weather coat', 'Distemper'], '₹10/sqft', 4.2, 21, 'admin', 'verified']),
    P(['Bhanwar Singh', 'Singh Driver Service', 'driver', 'taxi', '9826031105', 'jaipur', 'Sindhi Camp', '302001', 0.001, 0.001, 'Jaipur darshan, outstation taxi — Innova, Dzire available. Hindi/English speaking.', ['Taxi', 'Jaipur tour', 'Outstation'], '₹1200/day', 4.6, 40, 'admin', 'verified']),

    // ─── PUNE ──────────────────────────────────────────────────────────────
    P(['Sachin Jadhav', 'Jadhav AC Care', 'ac-fridge-repair', 'ac-repair', '9826041101', 'pune', 'Kothrud', '411038', 0.006, -0.010, 'AC service ₹399, gas filling, installation. All brands. Waranty on work.', ['AC service', 'Installation', 'Gas filling'], '₹399 service', 4.7, 95, 'admin', 'verified']),
    P(['Farhan Shaikh', 'Shaikh Tailors Camp', 'tailor', 'blouse-suit', '9826041102', 'pune', 'Camp, MG Road', '411001', 0.003, 0.004, 'Pant-shirt, coat-suit, kurta. 30 saal purani dukaan.', ['Coat suit', 'Kurta', 'Shirts'], '₹250 shirt', 4.5, 60, 'admin', 'verified']),
    P(['Nitin Bhosale', 'Bhosale Plumbing Solutions', 'plumber', 'tank', '9826041103', 'pune', 'Hadapsar', '411028', -0.015, 0.022, 'Society tank cleaning, pipeline, motor — AMC available.', ['Tank cleaning', 'Pipeline', 'AMC'], '₹300 visit', 4.3, 26, 'self', 'verified', 'u_nitin']),
    P(['Anjali Pawar', 'Pawar Safe & Clean', 'safai-karamchari', 'office-cleaning', '9826041104', 'pune', 'Baner', '411045', 0.014, -0.018, 'Office & shop daily cleaning contracts. Verified staff, police verified.', ['Office cleaning', 'Contracts', 'Daily staff'], '₹8000/month', 4.6, 33, 'self', 'verified', 'u_anjali']),
    P(['Vikram Shinde', 'Shinde Furniture Works', 'carpenter', 'door-window', '9826041105', 'pune', 'Pimpri', '411017', 0.025, -0.005, 'Door, window, plywood work. Modular kitchen specialist.', ['Doors', 'Plywood', 'Modular kitchen'], 'Quote on visit', 4.8, 47, 'admin', 'verified']),

    // ─── LUCKNOW ───────────────────────────────────────────────────────────
    P(['Rajesh Kannaujia', 'Kannaujia Mistri Karyalaya', 'raj-mistri', 'brickwork', '9826051101', 'lucknow', 'Aliganj', '226024', 0.010, 0.008, 'Nakashi kaam, makan, deewar — Lucknow ke purane karigar.', ['Masonry', 'Nakashi', 'Construction'], '₹400/day', 4.6, 39, 'admin', 'verified']),
    P(['Zahid Ali', 'Ali Tailors Aminabad', 'tailor', 'blouse-suit', '9826051102', 'lucknow', 'Aminabad', '226018', 0.001, -0.002, 'Chikan work, salwar-kameez, sherwani. Lucknowi chikan specialist.', ['Chikan', 'Sherwani', 'Suits'], '₹300 onwards', 4.9, 82, 'admin', 'verified']),
    P(['Pooja Yadav', 'Yadav Electric Care', 'electrician', 'house-wiring', '9826051103', 'lucknow', 'Gomti Nagar', '226010', 0.016, 0.014, 'Ghar ki wiring aur repair — ladies electrician available on request.', ['Wiring', 'Repair', 'Doorbell/CCTV'], '₹220 visit', 4.5, 28, 'self', 'verified', 'u_pooja']),
    P(['Brijesh Tiwari', 'Tiwari Bhandara Seva', 'bhandara-catering', 'bhandara', '9826051104', 'lucknow', 'Chowk', '226003', -0.003, -0.006, 'Bhandara, bhog, langar — 25 saal se seva me. Puri-sabzi, khichdi prasad.', ['Bhandara', 'Bhog', 'Prasad'], '₹60/thali', 4.8, 90, 'admin', 'verified', null, { open: '04:00', close: '23:00', offDays: [] }]),
    P(['Arun Kumar', 'Kumar Dry Wash', 'dry-cleaner', 'laundry', '9826051105', 'lucknow', 'Indira Nagar', '226016', 0.012, 0.018, 'Laundry ₹35/kg, dry clean, iron. 24 ghante delivery.', ['Laundry', 'Ironing', 'Delivery'], '₹35/kg', 4.2, 18, 'self', 'pending', 'u_arun']),

    // ─── PATNA ─────────────────────────────────────────────────────────────
    P(['Sanjay Prasad', 'Prasad Mason & Construction', 'raj-mistri', 'plaster', '9826061101', 'patna', 'Kankarbagh', '800020', 0.008, -0.005, 'Makan, boundary, plaster — Bihar me kai project kiye hain.', ['Masonry', 'Boundary', 'Plaster'], '₹380/day', 4.4, 31, 'admin', 'verified']),
    P(['Md. Sarfaraz', 'Sarfaraz Tailoring Hub', 'tailor', 'boutique', '9826061102', 'patna', 'Gandhi Maidan', '800001', 0.002, 0.001, 'Bridal, designer suit, kurti. Patna ka bharosamand tailor.', ['Bridal', 'Designer', 'Kurti'], '₹350 onwards', 4.6, 44, 'admin', 'verified']),
    P(['Ravi Ranjan', 'Ranjan Electricals Danapur', 'electrician', 'fan-inverter', '9826061103', 'patna', 'Danapur', '801503', -0.020, -0.028, 'Inverter, battery, pankha, wiring — ghar par service.', ['Inverter', 'Battery', 'Wiring'], '₹180 visit', 4.3, 22, 'self', 'verified', 'u_raviranjan']),
    P(['Kiran Devi', 'Kiran Safai Kendra', 'safai-karamchari', 'house-cleaning', '9826061104', 'patna', 'Boring Road', '800001', 0.004, 0.008, 'Ghar ki safai, jhadu-pocha staff, mahilaon ki team. Rozana/naptana.', ['Home cleaning', 'Staff placement', 'Daily'], '₹5000/month staff', 4.5, 35, 'self', 'verified', 'u_kiran']),
    P(['Gopal Sharma', 'Sharma Repair Center', 'ac-fridge-repair', 'fridge', '9826061105', 'patna', 'Rajendra Nagar', '800016', -0.006, 0.012, 'Freeze, washing machine, RO — ghar par repair. 90 din warranty.', ['Fridge', 'Washing machine', 'RO'], '₹300 visit', 4.1, 16, 'admin', 'verified']),

    // ─── NAGPUR ────────────────────────────────────────────────────────────
    P(['Ashok Meshram', 'Meshram Electrical Works', 'electrician', 'electrical-repair', '9826071101', 'nagpur', 'Sitabuldi', '440012', 0.003, -0.004, 'Industrial & home electrical. LT/HT work licensed.', ['Industrial', 'LT/HT', 'Repair'], '₹350 visit', 4.6, 40, 'admin', 'verified']),
    P(['Santosh Thakre', 'Thakre Furniture Gharana', 'carpenter', 'furniture', '9826071102', 'nagpur', 'Dharampeth', '440010', 0.006, 0.007, 'Sofa, bed, mandir — teak & plywood dono me kaam.', ['Sofa', 'Beds', 'Mandir'], 'Quote on visit', 4.7, 37, 'admin', 'verified']),
    P(['Rehan Khan', 'Khan Dry Clean Dharampeth', 'dry-cleaner', 'dry-clean', '9826071103', 'nagpur', 'Dharampeth', '440010', 0.008, 0.005, 'Dry clean & laundry. Wedding season special rates.', ['Dry clean', 'Wedding wear', 'Laundry'], '₹45/kg', 4.4, 23, 'admin', 'verified']),
    P(['Devendra Wankhede', 'Wankhede Catering & Bhandara', 'bhandara-catering', 'catering', '9826071104', 'nagpur', 'Manish Nagar', '440037', -0.024, 0.016, 'Orange city ke bharosamand caterers. 100–3000 guests.', ['Catering', 'Bhandara', 'Events'], '₹130/plate', 4.5, 48, 'admin', 'verified']),

    // ─── SURAT ─────────────────────────────────────────────────────────────
    P(['Bhavesh Patel', 'Patel Plumbing & Bath', 'plumber', 'fitting', '9826081101', 'surat', 'Adajan', '395009', 0.010, -0.008, 'Bathroom fitting, concealed plumbing, leak — society AMC.', ['Bathroom', 'Concealed', 'AMC'], '₹250 visit', 4.6, 55, 'admin', 'verified']),
    P(['Mukesh Rathod', 'Rathod Raj Mistri', 'raj-mistri', 'tiles', '9826081102', 'surat', 'Katargam', '395004', -0.008, 0.010, 'Tiles, granite, marble flooring. Textile area me famous.', ['Tiles', 'Granite', 'Marble'], '₹500/day', 4.5, 42, 'admin', 'verified']),
    P(['Yusuf Pathan', 'Pathan Tailors Ring Road', 'tailor', 'alteration', '9826081103', 'surat', 'Ring Road', '395002', 0.004, 0.002, 'Pant-shirt, salwar, blouse. Bulk orders for shops accepted.', ['Bulk orders', 'Stitching', 'Alteration'], '₹120 onwards', 4.3, 34, 'self', 'verified', 'u_yusuf']),
    P(['Hetal Ben', 'Shree Ganesh Safai Seva', 'safai-karamchari', 'deep-clean', '9826081104', 'surat', 'Vesu', '395007', 0.018, -0.015, 'Home & office deep cleaning, sofa shampoo, tank cleaning.', ['Deep clean', 'Sofa shampoo', 'Tank'], '₹1500 onwards', 4.7, 39, 'self', 'verified', 'u_hetal']),

    // ─── AHMEDABAD ─────────────────────────────────────────────────────────
    P(['Jignesh Shah', 'Shah Electricals Maninagar', 'electrician', 'house-wiring', '9826091101', 'ahmedabad', 'Maninagar', '380008', 0.007, 0.012, 'Home automation, wiring, MCB. Smart switch installation.', ['Smart home', 'Wiring', 'MCB'], '₹300 visit', 4.8, 66, 'admin', 'verified']),
    P(['Prakash Bhai', 'Patel Mason Works', 'raj-mistri', 'brickwork', '9826091102', 'ahmedabad', 'Naroda', '382330', 0.022, 0.006, 'Makan, pol house renovation — experienced mason team.', ['Renovation', 'Masonry', 'Pol houses'], '₹450/day', 4.4, 29, 'admin', 'verified']),
    P(['Alpesh Chauhan', 'Chauhan Paint Studio', 'painter', 'polish', '9826091103', 'ahmedabad', 'Satellite', '380015', -0.006, -0.010, 'Texture paint, wood polish, duco. Designer finishes.', ['Texture', 'Polish', 'Duco'], '₹18/sqft', 4.6, 41, 'self', 'verified', 'u_alpesh']),
    P(['Rameshbhai Patel', 'Patel Dry Clean Navrangpura', 'dry-cleaner', 'dry-clean', '9826091104', 'ahmedabad', 'Navrangpura', '380006', 0.002, -0.003, 'Dry clean, curtain dry clean, carpet wash. Home pickup.', ['Curtains', 'Carpets', 'Pickup'], '₹50/kg', 4.5, 47, 'admin', 'verified']),

    // ─── VARANASI ──────────────────────────────────────────────────────────
    P(['Umesh Dubey', 'Dubey Purohit & Bhandara Seva', 'bhandara-catering', 'bhandara', '9826101101', 'varanasi', 'Godowlia', '221001', 0.002, -0.003, 'Bhandara, terahvin, shraddh bhoj — pura pandit aur bhoj intezaam.', ['Shraddh', 'Bhandara', 'Purohit'], '₹70/thali', 4.9, 102, 'admin', 'verified']),
    P(['Shiv Kumar Prajapati', 'Prajapati Potter Bhojeshpur', 'raj-mistri', 'brickwork', '9826101102', 'varanasi', 'Lahartara', '221002', -0.012, 0.014, 'Deewar, makan, matka bhatti — paramparik karigar.', ['Masonry', 'Bhatti', 'Walls'], '₹350/day', 4.3, 20, 'self', 'verified', 'u_shiv']),
    P(['Ajeet Yadav', 'Yadav Driver Sewa', 'driver', 'goods', '9826101103', 'varanasi', 'Cantonment', '221002', 0.008, 0.002, 'Tempo, goods shifting, passenger auto — ghats tak service.', ['Tempo', 'Shifting', 'Local'], '₹600/day', 4.2, 25, 'admin', 'verified']),
    // ─── EXPANDED COVERAGE — new categories + more cities (appended; keeps review indices stable) ──
    // Mobile Repair
    P(['Salman Qureshi', 'Mobile Care Indore', 'mobile-repair', 'screen-battery', '9826011201', 'indore', 'Sarafa, Itwaria', '452002', 0.003, 0.005, 'Screen, battery, charging jack — sabhi brand ki mobile repair. 30 minute me screen change.', ['Screen change', 'Battery', 'Charging'], '₹250 onwards', 4.6, 58, 'admin', 'verified']),
    P(['Deepak Vishwakarma', 'Vishwakarma Mobile Point', 'mobile-repair', 'software', '9826021201', 'bhopal', 'MP Nagar Zone 1', '462011', 0.010, 0.002, 'Software, hang, update, data recovery — Android & iPhone.', ['Software', 'Data recovery', 'Update'], '₹200 visit', 4.4, 41, 'self', 'verified', 'u_deepakm']),
    P(['Anil Saini', 'Saini Mobile Gharana', 'mobile-repair', 'accessories', '9826031201', 'jaipur', 'Bapu Bazaar', '302003', 0.004, -0.005, 'Cover, glass, charger, earphone — mobile accessories ki dukaan. Repair bhi.', ['Accessories', 'Glass', 'Charger'], '₹100 onwards', 4.3, 35, 'admin', 'verified']),
    P(['Prasad Jadhav', 'Jadhav Mobile Solutions', 'mobile-repair', 'screen-battery', '9826041201', 'pune', 'FC Road', '411004', 0.004, -0.006, 'iPhone & Android screen, battery original. 6 mahine warranty.', ['iPhone', 'Screen', 'Battery'], '₹400 onwards', 4.7, 73, 'admin', 'verified']),
    P(['Amit Gupta', 'Gupta Mobile Repair', 'mobile-repair', 'software', '9826051201', 'lucknow', 'Hazratganj', '226001', 0.002, 0.003, 'Mobile software, hang, update — genuine repair with bill.', ['Software', 'Repair', 'Update'], '₹250 visit', 4.2, 26, 'self', 'verified', 'u_amitg']),
    P(['Firoz Khan', 'Khan Mobile Care', 'mobile-repair', 'screen-battery', '9826071201', 'nagpur', 'Sitabuldi', '440012', 0.002, -0.003, 'All brand mobile repair — screen, battery, speaker, mic.', ['Screen', 'Speaker', 'Mic'], '₹200 onwards', 4.5, 44, 'admin', 'verified']),
    // Beautician at Home
    P(['Priya Sharma', 'Priya Beauty Parlour at Home', 'beautician', 'salon-home', '9826011202', 'indore', 'Vijay Nagar', '452010', 0.019, 0.028, 'Facial, waxing, threading, pedicure — ghar par service. Ladies only.', ['Facial', 'Waxing', 'Pedicure'], '₹500 onwards', 4.8, 67, 'self', 'verified', 'u_priyab']),
    P(['Sunita Rathore', 'Rathore Bridal Studio', 'beautician', 'bridal', '9826031202', 'jaipur', 'Vaishali Nagar', '302021', -0.010, 0.015, 'Bridal makeup, HD makeup, saree draping. Jaipur ki famous bridal artist.', ['Bridal', 'HD makeup', 'Saree draping'], '₹8000/bridal', 4.9, 84, 'admin', 'verified']),
    P(['Nazia Sheikh', 'Nazia Mehndi & Beauty', 'beautician', 'mehndi', '9826041202', 'pune', 'Kondhwa', '411048', -0.012, 0.010, 'Bridal mehndi, engagement, party makeup. Arabic & Rajasthani design.', ['Mehndi', 'Makeup', 'Arabic design'], '₹1500/hand', 4.7, 52, 'self', 'verified', 'u_nazia']),
    P(['Rekha Pandey', 'Pandey Beauty Point', 'beautician', 'salon-home', '9826051202', 'lucknow', 'Gomti Nagar', '226010', 0.014, 0.012, 'Ghar par parlour — facial, cleanup, hair spa. Budget friendly.', ['Facial', 'Hair spa', 'Cleanup'], '₹300 onwards', 4.4, 38, 'admin', 'verified']),
    P(['Hetal Patel', 'Hetal Makeover Studio', 'beautician', 'bridal', '9826081202', 'surat', 'Athwalines', '395007', 0.006, -0.006, 'Bridal & reception makeup, nail art. Surat brides ka bharosa.', ['Bridal', 'Nail art', 'Reception'], '₹6000/bridal', 4.8, 61, 'admin', 'verified']),
    // Cook / Rasoiya
    P(['Shyamlal Yadav', 'Yadav Rasoiya Seva', 'cook', 'home-cook', '9826011203', 'indore', 'Rajwada', '452002', 0.001, -0.002, 'Ghar ka swadisht khana — lunch/dinner cook. Shudh shakahari.', ['Home cook', 'Veg', 'Lunch/Dinner'], '₹8000/month', 4.7, 45, 'self', 'verified', 'u_shyamlal']),
    P(['Munni Devi', 'Munni Devi Tiffin Seva', 'cook', 'tiffin', '9826021203', 'bhopal', 'Kolar Road', '462042', -0.020, 0.016, 'Tiffin service — ghar jaisa khana. Roz 2 time tiffin, monthly plan.', ['Tiffin', 'Monthly', 'Home food'], '₹2200/month', 4.6, 58, 'admin', 'verified']),
    P(['Ramesh Kushwaha', 'Kushwaha Party Rasoi', 'cook', 'party-cook', '9826051203', 'lucknow', 'Chowk', '226003', -0.002, -0.004, 'Party, shaadi, pooja ke liye cook. 50 se 500 logon ka khana.', ['Party cook', 'Wedding', 'Pooja bhoj'], '₹150/plate', 4.5, 39, 'admin', 'verified']),
    P(['Sunita Kumari', 'Sunita Kitchen Seva', 'cook', 'home-cook', '9826061203', 'patna', 'Boring Road', '800001', 0.005, 0.007, 'Bihari & north Indian khana — ghar par cook. Non-veg bhi.', ['Home cook', 'Bihari', 'Non-veg'], '₹7000/month', 4.3, 24, 'self', 'pending', 'u_sunitak']),
    P(['Hasmukh Bhai', 'Patel Rasoi & Tiffin', 'cook', 'tiffin', '9826091203', 'ahmedabad', 'Navrangpura', '380006', 0.001, -0.002, 'Gujarati tiffin — rotli, dal-bhaat, shaak. Students & office ke liye.', ['Tiffin', 'Gujarati', 'Veg'], '₹1800/month', 4.6, 51, 'admin', 'verified']),
    // Mali / Gardener
    P(['Gopal Mali', 'Gopal Bagiya Sewa', 'mali', 'garden-care', '9826011204', 'indore', 'Palasia', '452001', 0.009, 0.004, 'Bagicha ki dekhbhal — paudhe, paani, khad. Monthly service available.', ['Garden care', 'Khad', 'Pruning'], '₹1500/month', 4.5, 31, 'self', 'verified', 'u_gopalm']),
    P(['Santosh Gawde', 'Gawde Nursery & Mali', 'mali', 'plants', '9826041204', 'pune', 'Baner', '411045', 0.012, -0.016, 'Indoor plants, pots, vertical garden. Plant supply + maintenance.', ['Indoor plants', 'Pots', 'Vertical garden'], '₹500 onwards', 4.7, 42, 'admin', 'verified']),
    P(['Raju Thakur', 'Thakur Lawn Care', 'mali', 'lawn', '9826071204', 'nagpur', 'Dharampeth', '440010', 0.007, 0.006, 'Lawn cutting, tree trimming, society garden contract.', ['Lawn', 'Tree trim', 'Society contract'], '₹2000/month', 4.4, 27, 'admin', 'verified']),
    P(['Shiv Bahadur', 'Shiv Vatika Sewa', 'mali', 'garden-care', '9826101204', 'varanasi', 'Lanka', '221005', -0.005, -0.008, 'Ghar ke bagiche ka pura kaam — paudhe, ghass, ped. Kashi me 20 saal.', ['Garden', 'Plants', 'Trees'], '₹1200/month', 4.3, 19, 'self', 'verified', 'u_shivb']),
    // More coverage — existing categories
    P(['Sanjay Dangi', 'Dangi Civil Engineers', 'engineer', 'civil', '9826011205', 'indore', 'Bhawarkua', '452001', -0.008, -0.012, 'Civil engineer — naksha, estimation, site supervision. 12 saal ka experience.', ['Civil', 'Naksha', 'Supervision'], '₹2000/consult', 4.6, 29, 'admin', 'verified']),
    P(['Ramesh Patel', 'Patel Safai Kendra', 'safai-karamchari', 'house-cleaning', '9826011206', 'indore', 'Sudama Nagar', '452009', -0.032, -0.025, 'Ghar ki safai, tanki safai, sofa cleaning. Mahilaon ki team available.', ['House cleaning', 'Tank', 'Sofa'], '₹1000/day', 4.4, 33, 'self', 'verified', 'u_rameshp']),
    P(['Iqbal Ahmed', 'Ahmed Paint Works', 'painter', 'interior', '9826021205', 'bhopal', 'Hamidia Road', '462001', 0.007, -0.010, 'Interior paint, putty, texture. Berger & Asian Paints approved.', ['Interior', 'Putty', 'Texture'], '₹11/sqft', 4.4, 28, 'admin', 'verified']),
    P(['Manoj Yadav', 'Yadav Driver Service', 'driver', 'personal-driver', '9826021206', 'bhopal', 'Arera Colony', '462016', 0.013, 0.008, 'Personal driver, office drop, outstation. Bhopal ka local expert.', ['Driver', 'Outstation', 'Office drop'], '₹650/day', 4.5, 31, 'self', 'verified', 'u_manojy']),
    P(['Sohan Lal', 'Lal Plumbing Works', 'plumber', 'tap-leak', '9826031205', 'jaipur', 'Malviya Nagar', '302017', -0.008, 0.012, 'Nal, leak, motor, overhead tank — 24x7 emergency service.', ['Leak', 'Motor', 'Tank'], '₹220 visit', 4.3, 27, 'admin', 'verified']),
    P(['Kailash Sharma', 'Sharma Bhandara Bhoj', 'bhandara-catering', 'bhandara', '9826031206', 'jaipur', 'Sanganer', '302029', -0.015, -0.010, 'Bhandara, terahvin, bhoj — pura intezaam bartan samet.', ['Bhandara', 'Bhoj', 'Teraahvin'], '₹65/thali', 4.6, 47, 'admin', 'verified']),
    P(['Ganesh Shinde', 'Shinde Electricals', 'electrician', 'electrical-repair', '9826041205', 'pune', 'Wakad', '411057', 0.015, -0.012, 'Ghar ki electrical repair, MCB, fan, inverter. Same day visit.', ['Repair', 'MCB', 'Inverter'], '₹250 visit', 4.5, 37, 'admin', 'verified']),
    P(['Sadanand More', 'More Raj Mistri Works', 'raj-mistri', 'plaster', '9826041206', 'pune', 'Hadapsar', '411028', -0.013, 0.020, 'Plaster, deewar, makan kaam — 20 mazdooron ki team.', ['Plaster', 'Masonry', 'Construction'], '₹480/day', 4.4, 30, 'self', 'verified', 'u_sadanand']),
    P(['Vinod Kumar', 'Kumar Paint House', 'painter', 'exterior', '9826051205', 'lucknow', 'Aliganj', '226024', 0.011, 0.007, 'Exterior & interior paint, distemper, weather coat. Lucknow me 15 saal.', ['Exterior', 'Distemper', 'Weather coat'], '₹9/sqft', 4.3, 25, 'admin', 'verified']),
    P(['Sarvesh Mishra', 'Mishra AC & Home Care', 'ac-fridge-repair', 'washing-machine', '9826051206', 'lucknow', 'Indira Nagar', '226016', 0.013, 0.017, 'AC, fridge, washing machine — sab kuch ek jagah. 90 din warranty.', ['AC', 'Fridge', 'Washing machine'], '₹350 service', 4.6, 44, 'admin', 'verified']),
    P(['Rajkishore Sinha', 'Sinha Plumbing & Sanitary', 'plumber', 'fitting', '9826061205', 'patna', 'Kankarbagh', '800020', 0.007, -0.004, 'Bathroom fitting, sanitary, concealed plumbing. New house special.', ['Fitting', 'Sanitary', 'Concealed'], '₹250 visit', 4.4, 28, 'admin', 'verified']),
    P(['Pappu Yadav', 'Yadav Furniture & Wood Work', 'carpenter', 'furniture', '9826061206', 'patna', 'Rajendra Nagar', '800016', -0.008, -0.010, 'Beds, almari, sofa, mandir — teak & plywood. Order par banaya jata hai.', ['Furniture', 'Beds', 'Sofa'], 'Quote on visit', 4.3, 22, 'self', 'verified', 'u_pappuy']),
    P(['Ashok Wankhede', 'Wankhede Plumbing Care', 'plumber', 'tap-leak', '9826071205', 'nagpur', 'Manish Nagar', '440037', -0.022, 0.014, 'Nal, leak, motor, bathroom fitting. Emergency service 24x7.', ['Leak', 'Motor', 'Fitting'], '₹200 visit', 4.4, 32, 'admin', 'verified']),
    P(['Jitendra Sonkar', 'Sonkar Paint & Polish', 'painter', 'polish', '9826071206', 'nagpur', 'Sadar', '440001', 0.004, -0.002, 'Wood polish, duco, texture paint. Furniture polish specialist.', ['Polish', 'Duco', 'Texture'], '₹15/sqft', 4.5, 26, 'self', 'verified', 'u_jitendra']),
    P(['Kishore Solanki', 'Solanki Electric Works', 'electrician', 'house-wiring', '9826081205', 'surat', 'Katargam', '395004', -0.007, 0.009, 'Ghar ki wiring, inverter, MCB. Society AMC available.', ['Wiring', 'Inverter', 'MCB'], '₹250 visit', 4.5, 36, 'admin', 'verified']),
    P(['Bharat Patel', 'Patel Bhandara & Catering', 'bhandara-catering', 'catering', '9826081206', 'surat', 'Adajan', '395009', 0.011, -0.009, 'Bhandara, party catering, sweets. Surat ka famous veg caterer.', ['Catering', 'Bhandara', 'Sweets'], '₹120/plate', 4.7, 54, 'admin', 'verified']),
    P(['Bhavesh Rathod', 'Rathod Tailor Studio', 'tailor', 'blouse-suit', '9826091205', 'ahmedabad', 'Maninagar', '380008', 0.006, 0.011, 'Blouse, suit, kurti, patola blouse. Ladies tailoring specialist.', ['Blouse', 'Suit', 'Kurti'], '₹180 onwards', 4.5, 38, 'admin', 'verified']),
    P(['Naresh Solanki', 'Solanki Driver Seva', 'driver', 'taxi', '9826091206', 'ahmedabad', 'Satellite', '380015', -0.005, -0.009, 'Ahmedabad local & outstation taxi. Airport drop ₹500.', ['Taxi', 'Airport', 'Outstation'], '₹700/day', 4.4, 33, 'self', 'verified', 'u_nareshs']),
    P(['Ravi Shankar', 'Shankar Tailor & Boutique', 'tailor', 'boutique', '9826101205', 'varanasi', 'Godowlia', '221001', 0.003, -0.002, 'Banarasi saree blouse, kurta, suit. Ghat area me 25 saal se.', ['Blouse', 'Kurta', 'Banarasi'], '₹200 onwards', 4.6, 41, 'admin', 'verified']),
    P(['Dinesh Prajapati', 'Prajapati Electricals Lanka', 'electrician', 'fan-inverter', '9826101206', 'varanasi', 'Lanka', '221005', -0.006, -0.007, 'Pankha, inverter, cooler, wiring — Lanka BHU area service.', ['Fan', 'Inverter', 'Wiring'], '₹180 visit', 4.3, 24, 'self', 'pending', 'u_dineshp']),

    // ─── CHHATTISGARH — Raipur / Bhilai / Bilaspur ──────────────────────────
    P(['Ramesh Sahu', 'Sahu Electricals Raipur', 'electrician', 'house-wiring', '9827410001', 'raipur', 'Pandri, Main Road', '492004', 0.006, -0.008, 'Ghar ki wiring, MCB, inverter, fan fitting — 15 saal ka anubhav. Pandri-Shankar Nagar area.', ['House wiring', 'MCB', 'Inverter'], '₹200 visit', 4.6, 52, 'admin', 'verified']),
    P(['Suresh Chandrakar', 'Chandrakar Raj Mistri Karyalaya', 'raj-mistri', 'brickwork', '9827410002', 'raipur', 'Tatibandh', '492099', -0.012, 0.010, 'Makan, deewar, plaster, tiles — mazdoor team ke saath. Loan construction bhi.', ['Brickwork', 'Plaster', 'Tiles'], '₹450/day per mazdoor', 4.7, 61, 'admin', 'verified']),
    P(['Anita Yadav', 'Yadav Beauty Parlour (Ghar Par)', 'beautician', 'salon-home', '9827410003', 'raipur', 'Devendra Nagar', '492001', 0.010, 0.005, 'Bridal makeup, facial, mehndi, haircut — ghar par service. Ladies only team.', ['Bridal', 'Facial', 'Mehndi'], '₹300 onwards', 4.8, 74, 'self', 'verified', 'u_anitay']),
    P(['Mohammad Irfan', 'Irfan AC & Fridge Care', 'ac-fridge-repair', 'ac-repair', '9827410004', 'raipur', 'Byron Bazar', '492001', 0.003, -0.004, 'AC gas filling, service, fridge, washing machine — all brands. Same-day service.', ['AC service', 'Gas filling', 'Fridge'], '₹350 service', 4.4, 39, 'admin', 'verified']),
    P(['Dr. Sushma Tiwari', 'Tiwari Home Clinic', 'medical', 'doctor', '9827410005', 'raipur', 'Shankar Nagar', '492007', 0.008, 0.012, 'MBBS, MD — general physician. Ghar par consultation, BP-sugar check, home visit available.', ['General physician', 'Home visit', 'BP/Sugar'], '₹400 consultation', 4.9, 88, 'admin', 'verified']),
    {...P(['Vikas Kosre', 'Kosre RO & Water Care', 'others', 'custom', '9827410006', 'raipur', 'Mowa', '492014', -0.009, -0.011, 'RO water purifier repair, service, AMC. Sabhi brands — Kent, Aquaguard, Pureit.', ['RO repair', 'RO service', 'AMC'], '₹250 visit', 4.5, 33, 'self', 'verified', 'u_vikask']), customService: 'RO Water Purifier Repair'},

    P(['Dilip Banjare', 'Banjare Plumbing Works', 'plumber', 'tap-leak', '9827420001', 'bhilai', 'Sector 6', '490006', 0.005, 0.007, 'Nal, leak, motor, bathroom fitting — Sector 1-12 area. Emergency 30 min me.', ['Leak repair', 'Bathroom fitting', 'Motor'], '₹200 visit', 4.5, 42, 'admin', 'verified']),
    P(['Kavita Sahu', 'Sahu Tiffin & Rasoi', 'cook', 'tiffin', '9827420002', 'bhilai', 'Sector 10', '490006', 0.002, -0.005, 'Ghar jaisa khana — tiffin service, party cooking. Monthly pack available.', ['Tiffin', 'Home food', 'Party cook'], '₹70/thali', 4.7, 58, 'self', 'verified', 'u_kavitas']),
    P(['Rajesh Verma', 'Verma Furniture House', 'carpenter', 'furniture', '9827420003', 'bhilai', 'Supela', '490023', -0.010, 0.004, 'Beds, almari, sofa, mandir, modular kitchen — teak & plywood. 10 saal warranty.', ['Furniture', 'Modular kitchen', 'Doors'], 'Quote on visit', 4.6, 47, 'admin', 'verified']),
    P(['Sunil Nishad', 'Nishad Driver Seva', 'driver', 'personal-driver', '9827420004', 'bhilai', 'Hudco', '490009', 0.008, -0.002, 'Personal driver, outstation Raipur-Bhilai-Nagpur. Night drive OK. 8 saal experience.', ['Personal driver', 'Outstation', 'Airport drop'], '₹600/day', 4.3, 27, 'self', 'verified', 'u_suniln', { open: '00:00', close: '23:59', offDays: [] }]),

    P(['Arun Tigga', 'Tigga Electric Works', 'electrician', 'electrical-repair', '9827430001', 'bilaspur', 'Sarkanda', '495004', 0.007, -0.006, 'Bijali repair, wiring, inverter, cooler — Sarkanda-Gandhi Chowk area. Fast service.', ['Repair', 'Wiring', 'Inverter'], '₹180 visit', 4.4, 31, 'admin', 'verified']),
    P(['Pradeep Rathi', 'Rathi Tailor & Collection', 'tailor', 'blouse-suit', '9827430002', 'bilaspur', 'Juna Bilaspur', '495001', -0.004, 0.003, 'Blouse, suit, kurti, punjabi coat — ladies & gents tailoring. 24 ghante delivery option.', ['Blouse', 'Suit', 'Coat'], '₹150 onwards', 4.5, 36, 'admin', 'verified']),
    P(['Ghanashyam Miri', 'Miri Safai Kendra', 'safai-karamchari', 'deep-clean', '9827430003', 'bilaspur', 'Vyapar Vihar', '495001', 0.004, 0.008, 'Ghar, office, tank, nali ki safai. Deep cleaning team — booking advance.', ['Deep cleaning', 'Water tank', 'Office'], '₹1200/day team', 4.2, 18, 'self', 'verified', 'u_ghanashyam']),
    {...P(['Shivkumar Baghel', 'Baghel Mobile & Electronics', 'mobile-repair', 'screen-battery', '9827430004', 'bilaspur', 'Torwa', '495001', -0.007, -0.009, 'Mobile screen, battery, software — sabhi brands. Accessories bhi available.', ['Screen', 'Battery', 'Software'], '₹300 onwards', 4.4, 29, 'admin', 'verified']), customService: '', gallery: [], videoLinks: []},
  ];
  // ensure stable ids even when business names collide across cities
  const seen = new Map();
  return list.map((p, i) => {
    if (seen.has(p.id)) p.id = p.id + '_' + i;
    seen.set(p.id, true);
    return p;
  });
}

const REVIEWS = [
  // [providerIndex (0-based into buildProviders()), userName, rating, text, daysAgo]
  [0, 'Sunita G.', 5, 'Deewar aur plaster ka kaam bahut badhiya. Time par aaye aur saaf kaam kiya.', 40],
  [0, 'Rakesh P.', 5, 'Best mason in Rajwada area. Rates bhi theek.', 25],
  [0, 'Anwar S.', 4, 'Kaam achha hai, thoda late aaye.', 10],
  [1, 'Meena J.', 5, 'Wiring clean ki, ab tak koi problem nahi.', 18],
  [1, 'Arun T.', 4, 'Inverter fitting theek-thaak.', 6],
  [2, 'Farida B.', 5, 'Blouse fitting perfect! 24 ghante me delivery mil gaya.', 33],
  [2, 'Neha K.', 5, 'Bridal blouse bahut sundar bana. Highly recommended.', 14],
  [3, 'Pankaj S.', 4, 'Leak theek kar diya jaldi. Price reasonable.', 12],
  [4, 'Sanjay M.', 5, 'AC gas filling ke baad ekdum chill. 90 din me dobara free service.', 22],
  [4, 'Ritu D.', 4, 'Fridge repair kiya, thoda mehnga laga par kaam achha.', 8],
  [6, 'Kamla B.', 4, 'Deep cleaning ki team ne ghar chamka diya.', 9],
  [9, 'Shyam L.', 5, 'Bhandara me 800 logon ka khana — sab set. Sevak bhi mile.', 30],
  [9, 'Dinesh A.', 5, 'Shadi me catering kiya, khana lazeez tha.', 12],
  [12, 'Anil V.', 5, 'Cooler/inverter dono theek. Same day service.', 15],
  [14, 'Kavita R.', 5, 'Designer blouse banwaya, bahut pasand aaya.', 20],
  [13, 'Imran H.', 4, 'Plaster ka kaam majboot hai.', 11],
  [29, 'Pooja N.', 5, 'Chikan suit perfect stitching. Aminabad ka best.', 26],
  [23, 'Vikas G.', 5, 'AC service ₹399 me ekdum clean. Punctual team.', 17],
  [27, 'Sushil K.', 4, 'Furniture ka kaam badhiya, halka mehnga.', 7],
  [36, 'Amit A.', 5, 'Boring Road wali safai team — mahilaon ki team, bharosamand.', 13],
  [46, 'Nishant P.', 5, 'Smart switch installation perfect. Gujarat ke best!', 19],
  [50, 'Ganesh R.', 5, 'Terahvin bhoj ka pura intezaam. Bahut dhanyavad.', 28],
  [50, 'Sarita S.', 5, 'Pandit ji ke saath bhoj bhi — ek hi jagah sab.', 15],
  [51, 'Ramesh D.', 4, 'Paramparik karigar, kaam bharosamand.', 5],
  [53, 'Vikas R.', 5, 'Mobile ka screen 30 minute me change. Rate bhi theek.', 9],
  [56, 'Sneha P.', 5, 'iPhone battery original lagi, 6 mahine warranty mila.', 12],
  [59, 'Aarti S.', 5, 'Ghar par facial karwaya — parlour jaisa result. Very polite.', 7],
  [60, 'Deepa M.', 5, 'Bridal makeup perfect! Photos me ekdum glowing.', 21],
  [61, 'Farah N.', 4, 'Mehndi design bahut sundar. Thoda late aayi.', 6],
  [64, 'Sushma G.', 5, 'Roz ka khana ghar jaisa — pure shakahari, saaf-suthra.', 15],
  [65, 'Ankit J.', 4, 'Tiffin time par milta hai. Dal-roti achhi.', 8],
  [69, 'Meera T.', 5, 'Bagiche ke paudhe ab khil rahe hain. Monthly service le li.', 11],
  [70, 'Rohit K.', 5, 'Indoor plants ke liye best — office me lagwaye, sab tareef karte hain.', 14],
  [73, 'Pankaj D.', 5, 'Naksha aur estimation dono perfect. Ghar ka kaam smooth chala.', 18],
  [79, 'Nilesh B.', 4, 'Wiring ka kaam jaldi kiya. Rate reasonable.', 5],
  [82, 'Shruti L.', 5, 'Washing machine aur AC dono theek kiye. Ek hi visit me!', 10],
  [87, 'Dhaval P.', 5, 'Society ka pura wiring kaam — licensed electrician.', 16],
  [88, 'Kiran B.', 5, 'Bhandara me 300 log — khana lazeez, safai bhi.', 13],
  [91, 'Anupama S.', 5, 'Banarasi blouse ka fitting ekdum perfect.', 4],
];

function buildSeed() {
  const providers = buildProviders();
  // 🪪 Demo: kuch providers Aadhaar-verified (trust badge demo ke liye)
  ['painter', 'medical', 'beautician', 'tailor'].forEach((catId) => {
    const p = providers.find((x) => x.categoryId === catId);
    if (p) {
      p.aadhaarVerified = true;
      p.aadhaar = { masked: 'XXXX XXXX 0124', status: 'verified', verifiedAt: '2026-09-20T10:00:00.000Z' };
    }
  });
  const users = [
    { id: 'u_admin', phone: '9000000001', name: 'Platform Admin', role: 'admin', cityId: 'indore', createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'u_demo', phone: '9000000002', name: 'Amit Sharma', role: 'user', cityId: 'indore', createdAt: '2026-08-10T09:00:00.000Z' },
  ];
  // one user record per linked provider account
  providers.filter((p) => p.userId).forEach((p) => {
    if (!users.find((u) => u.id === p.userId)) {
      users.push({ id: p.userId, phone: p.phone, name: p.name, role: 'provider', cityId: p.address.cityId, createdAt: '2026-08-05T09:00:00.000Z' });
    }
  });

  const reviews = REVIEWS.map((r, i) => ({
    id: 'rev_' + (i + 1),
    providerId: (providers[r[0]] || providers[0]).id,
    userId: 'u_demo',
    userName: r[1],
    rating: r[2],
    text: r[3],
    createdAt: new Date(Date.now() - r[4] * 86400000).toISOString(),
  }));

  return {
    users,
    sessions: [],
    otps: [],
    categories: CATEGORIES,
    cities: CITIES,
    providers,
    reviews,
    favorites: [{ userId: 'u_demo', providerId: providers[0].id, createdAt: new Date().toISOString() }],
    leads: [],
    reports: [],
    searches: [
      { id: 'srch_1', q: 'electrician near me', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 3600e3).toISOString() },
      { id: 'srch_2', q: 'raj mistri', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 7200e3).toISOString() },
      { id: 'srch_3', q: 'tailor', cityId: 'pune', userId: null, createdAt: new Date(Date.now() - 86400e3).toISOString() },
      { id: 'srch_4', q: 'bhandara', cityId: 'lucknow', userId: null, createdAt: new Date(Date.now() - 90000e3).toISOString() },
      { id: 'srch_5', q: 'dry cleaner', cityId: 'jaipur', userId: null, createdAt: new Date(Date.now() - 92000e3).toISOString() },
      { id: 'srch_6', q: 'mobile repair', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 3600e3 * 3).toISOString() },
      { id: 'srch_7', q: 'beautician', cityId: 'jaipur', userId: null, createdAt: new Date(Date.now() - 3600e3 * 5).toISOString() },
      { id: 'srch_8', q: 'cook tiffin', cityId: 'lucknow', userId: null, createdAt: new Date(Date.now() - 3600e3 * 7).toISOString() },
    ],
    meta: { seededAt: new Date().toISOString(), version: 2 },
  };
}

module.exports = { buildSeed };

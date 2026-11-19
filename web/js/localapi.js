/**
 * localapi.js — OFFLINE ENGINE for the single-file app (LaborsNearMe.html).
 * Mirrors the Express backend 1:1 (routes/auth.js, user.js, admin.js, public.js)
 * but runs entirely in the browser: data lives in localStorage (seeded from
 * window.LNM_SEED). API.req() is replaced, so the whole SPA works unchanged —
 * search, filters, OTP login, favourites, reviews, registration, admin panel.
 */
(function () {
  'use strict';

  /* ───────────────────────── DB (localStorage-backed) ───────────────────── */
  const DB_KEY = 'lnm_db';
  let db = null;

  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { db = null; }
    if (!db || !db.providers || !db.categories) {
      db = JSON.parse(JSON.stringify(window.LNM_SEED)); // fresh copy of seed
      save();
    }
    return db;
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* quota — memory only */ }
  }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ───────────────────────── geo.js (copied) ────────────────────────────── */
  function haversineMetres(lat1, lon1, lat2, lon2) {
    const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function formatDistance(metres) {
    if (metres == null) return '';
    return metres < 1000 ? Math.round(metres / 10) * 10 + ' m'
      : (metres / 1000).toFixed(metres < 10000 ? 1 : 0) + ' km';
  }
  function relevanceScore(p, distance, radius) {
    const prox = 1 - Math.min(distance / (radius || 25000), 1);
    const rating = (p.ratingAvg || 0) / 5;
    const trust = Math.min(Math.log10(1 + (p.ratingCount || 0)) / 3, 1);
    let complete = 0;
    if (p.about) complete += 0.25;
    if (p.photo) complete += 0.25;
    if (p.skills && p.skills.length) complete += 0.25;
    if (p.priceHint) complete += 0.125;
    if (p.subcategory) complete += 0.125;
    const claimed = p.source === 'self' ? 0.05 : 0;
    return 0.45 * prox + 0.30 * rating + 0.15 * trust + 0.10 * complete + claimed;
  }
  function isOpenNow(avail) {
    if (!avail) return true;
    if (avail.manualOpen === false) return false;
    const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
    const day = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    if (Array.isArray(avail.offDays) && avail.offDays.includes(day)) return false;
    const h = avail.hours || { open: '08:00', close: '20:00' };
    const toM = (t) => { const [hh, mm] = String(t || '0:0').split(':').map(Number); return hh * 60 + (mm || 0); };
    return mins >= toM(h.open) && mins <= toM(h.close);
  }

  /* ───────────────────────── auth helpers (copied) ──────────────────────── */
  const phoneOk = (p) => /^[6-9]\d{9}$/.test(String(p || ''));
  function publicUser(u) {
    return {
      id: u.id, phone: u.phone, name: u.name, role: u.role, cityId: u.cityId,
      state: u.state || '', district: u.district || '',
      bio: u.bio || '', about: u.about || '', address: u.address || '',
      photo: u.photo || null, googleEmail: u.googleEmail || '', status: u.status || 'active',
      providerId: u.providerId || null,
    };
  }
  function authByToken(token) {
    const d = load();
    const s = token && d.sessions.find((x) => x.token === token);
    return s ? d.users.find((u) => u.id === s.userId) || null : null;
  }
  function issueToken(userId) {
    const d = load();
    const token = uid('tok') + Math.random().toString(36).slice(2, 10);
    d.sessions.push({ token, userId, createdAt: new Date().toISOString() });
    return token;
  }

  /* ───────────────────────── publicProvider (copied) ────────────────────── */
  function publicProvider(p) {
    const d = load();
    const cat = d.categories.find((c) => c.id === p.categoryId) || {};
    const sub = (cat.subcategories || []).find((s) => s.id === p.subcategory) || {};
    return {
      id: p.id, name: p.name, businessName: p.businessName,
      categoryId: p.categoryId,
      categoryNameEn: cat.name_en || '', categoryNameHi: cat.name_hi || '',
      subcategory: p.subcategory,
      subcategoryNameEn: sub.name_en || '', subcategoryNameHi: sub.name_hi || '',
      categoryIcon: cat.icon || 'wrench',
      categoryIconImage: cat.iconImage || '',
      phone: p.phone, whatsapp: p.whatsapp, photo: p.photo,
      customService: p.customService || '', gallery: p.gallery || [], videoLinks: p.videoLinks || [],
      about: p.about, skills: p.skills, priceHint: p.priceHint,
      address: p.address, location: p.location,
      availability: p.availability, isOpenNow: isOpenNow(p.availability),
      verified: p.verified, status: p.status || 'active', ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      languages: p.languages,
    };
  }

  const LNM_STATES = [{"state":"Andhra Pradesh","districts":["Alluri Sitharama Raju","Anakapalli","Ananthapuramu","Annamayya","Bapatla","Chittoor","Dr. B.R. Ambedkar Konaseema","East Godavari","Eluru","Guntur","Kakinada","Krishna","Kurnool","Nandyal","NTR","Palnadu","Parvathipuram Manyam","Prakasam","Sri Potti Sriramulu Nellore","Sri Sathya Sai","Srikakulam","Tirupati","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"]},{"state":"Arunachal Pradesh","districts":["Anjaw","Changlang","Dibang Valley","East Kameng","East Siang","Kamle","Kra Daadi","Kurung Kumey","Lepa Rada","Lohit","Longding","Lower Dibang Valley","Lower Siang","Lower Subansiri","Namsai","Pakke Kessang","Papum Pare","Shi Yomi","Siang","Tawang","Tirap","Upper Siang","Upper Subansiri","West Kameng","West Siang"]},{"state":"Assam","districts":["Bajali","Baksa","Barpeta","Biswanath","Bongaigaon","Cachar","Charaideo","Chirang","Darrang","Dhemaji","Dhubri","Dibrugarh","Dima Hasao","Goalpara","Golaghat","Hailakandi","Hojai","Jorhat","Kamrup","Kamrup Metropolitan","Karbi Anglong","Karimganj","Kokrajhar","Lakhimpur","Majuli","Morigaon","Nagaon","Nalbari","Sivasagar","Sonitpur","South Salmara-Mankachar","Tinsukia","Udalguri","West Karbi Anglong"]},{"state":"Bihar","districts":["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Pashchim Champaran","Patna","Purbi Champaran","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali"]},{"state":"Chhattisgarh","districts":["Balod","Baloda Bazar","Balrampur-Ramanujganj","Bastar","Bemetara","Bijapur","Bilaspur","Dantewada","Dhamtari","Durg","Gariaband","Gaurela-Pendra-Marwahi","Janjgir-Champa","Jashpur","Kabirdham","Kanker","Khairagarh-Chhuikhadan-Gandai","Kondagaon","Korba","Koriya","Mahasamund","Manendragarh-Chirmiri-Bharatpur","Mohla-Manpur-Ambagarh Chowki","Mungeli","Narayanpur","Raigarh","Raipur","Rajnandgaon","Sarangarh-Bilaigarh","Sukma","Surajpur","Surguja"]},{"state":"Goa","districts":["North Goa","South Goa"]},{"state":"Gujarat","districts":["Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar","Botad","Chhota Udepur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana","Morbi","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot","Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad"]},{"state":"Haryana","districts":["Ambala","Bhiwani","Charkhi Dadri","Faridabad","Fatehabad","Gurugram","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Nuh","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"]},{"state":"Himachal Pradesh","districts":["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul and Spiti","Mandi","Shimla","Sirmaur","Solan","Una"]},{"state":"Jharkhand","districts":["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Jamtara","Khunti","Koderma","Latehar","Lohardaga","Pakur","Palamu","Ramgarh","Ranchi","Sahibganj","Seraikela-Kharsawan","Simdega","West Singhbhum"]},{"state":"Karnataka","districts":["Bagalkote","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar","Chamarajanagar","Chikkaballapura","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayanagara","Vijayapura","Yadgir"]},{"state":"Kerala","districts":["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"]},{"state":"Madhya Pradesh","districts":["Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul","Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas","Dhar","Dindori","Guna","Gwalior","Harda","Indore","Jabalpur","Jhabua","Katni","Khandwa","Khargone","Maheshwar","Maihar","Mandla","Mandsaur","Morena","Nagda","Narmadapuram","Narsinghpur","Neemuch","Pandhurna","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli","Tikamgarh","Ujjain","Umaria","Vidisha"]},{"state":"Maharashtra","districts":["Ahmednagar","Akola","Amravati","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"]},{"state":"Manipur","districts":["Bishnupur","Chandel","Churachandpur","Imphal East","Imphal West","Jiribam","Kakching","Kamjong","Kangpokpi","Noney","Pherzawl","Senapati","Tamenglong","Tengnoupal","Thoubal","Ukhrul"]},{"state":"Meghalaya","districts":["East Garo Hills","East Jaintia Hills","East Khasi Hills","North Garo Hills","Ri-Bhoi","South Garo Hills","South West Garo Hills","South West Khasi Hills","West Garo Hills","West Jaintia Hills","West Khasi Hills"]},{"state":"Mizoram","districts":["Aizawl","Champhai","Hnahthial","Khawzawl","Kolasib","Lawngtlai","Lunglei","Mamit","Saiha","Saitual","Serchhip"]},{"state":"Nagaland","districts":["Chümoukedima","Dimapur","Kiphire","Kohima","Longleng","Mokokchung","Mon","Niuland","Noklak","Peren","Phek","Shamator","Tseminyü","Tuensang","Wokha","Zunheboto"]},{"state":"Odisha","districts":["Angul","Balangir","Baleshwar","Bargarh","Bhadrak","Boudh","Cuttack","Deogarh","Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi","Kandhamal","Kendrapara","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nayagarh","Nuapada","Puri","Rayagada","Sambalpur","Sonepur","Sundargarh"]},{"state":"Punjab","districts":["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Malerkotla","Mansa","Moga","Muktsar","Pathankot","Patiala","Rupnagar","S.A.S. Nagar","Sangrur","Shaheed Bhagat Singh Nagar","Tarn Taran"]},{"state":"Rajasthan","districts":["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"]},{"state":"Sikkim","districts":["Gangtok","Gyalshing","Mangan","Namchi","Pakyong","Soreng"]},{"state":"Tamil Nadu","districts":["Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kancheepuram","Karur","Krishnagiri","Madurai","Mayiladuthurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupattur","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"]},{"state":"Telangana","districts":["Adilabad","Bhadradri Kothagudem","Hanumakonda","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Komaram Bheem Asifabad","Mahabubabad","Mahabubnagar","Mancherial","Medak","Medchal–Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Rangareddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal","Yadadri Bhuvanagiri"]},{"state":"Tripura","districts":["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"]},{"state":"Uttar Pradesh","districts":["Agra","Aligarh","Ambedkar Nagar","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddh Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Raebareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shravasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"]},{"state":"Uttarakhand","districts":["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"]},{"state":"West Bengal","districts":["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"]},{"state":"Andaman and Nicobar Islands (UT)","districts":["Nicobar","North and Middle Andaman","South Andaman"]},{"state":"Chandigarh (UT)","districts":["Chandigarh"]},{"state":"Dadra and Nagar Haveli and Daman and Diu (UT)","districts":["Dadra and Nagar Haveli","Daman","Diu"]},{"state":"Delhi (NCT)","districts":["Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"]},{"state":"Jammu and Kashmir (UT)","districts":["Anantnag","Bandipora","Baramulla","Budgam","Doda","Ganderbal","Jammu","Kathua","Kishtwar","Kulgam","Kupwara","Poonch","Pulwama","Rajouri","Ramban","Reasi","Samba","Shopian","Srinagar","Udhampur"]},{"state":"Ladakh (UT)","districts":["Kargil","Leh"]},{"state":"Lakshadweep (UT)","districts":["Lakshadweep"]},{"state":"Puducherry (UT)","districts":["Karaikal","Mahe","Puducherry","Yanam"]}];

  /* ═══════════════════════ ROUTER ═══════════════════════ */
  function route(method, path, body, token) {
    const [p, qs] = path.split('?');
    const q = new URLSearchParams(qs || '');
    const seg = p.replace(/^\/+|\/+$/g, '').split('/'); // e.g. ['providers','nearby']
    const user = authByToken(token);
    const needUser = () => { if (!user) throw err(401, 'unauthorized'); if (user.status && user.status !== 'active') throw err(403, 'account_' + user.status); return user; };
    const needAdmin = () => { const u = needUser(); if (u.role !== 'admin') throw err(403, 'admin_only'); return u; };

    // ---- auth ----
    if (p === '/auth/request-otp' && method === 'POST') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      if (!phoneOk(phone)) throw err(400, 'invalid_phone', 'Enter valid 10-digit Indian mobile number');
      const d = load();
      const code = '123456'; // demo mode (production: MSG91)
      d.otps = d.otps.filter((o) => o.phone !== phone);
      d.otps.push({ phone, code, expiresAt: Date.now() + 5 * 60 * 1000 });
      save();
      return ok({ ok: true, phone, devOtp: code, devNotice: 'MVP demo: use OTP 123456 (no real SMS is sent)' });
    }
    if (p === '/auth/verify-otp' && method === 'POST') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      const code = String(body.code || '');
      const d = load();
      const rec = d.otps.find((o) => o.phone === phone);
      if (!rec || rec.expiresAt < Date.now() || (code !== rec.code && code !== '123456')) throw err(400, 'invalid_otp');
      d.otps = d.otps.filter((o) => o.phone !== phone);
      let user = d.users.find((u) => u.phone === phone);
      if (!user) {
        user = {
          id: uid('u'), phone,
          name: String(body.name || '').slice(0, 60) || 'User ' + phone.slice(-4),
          role: 'user', cityId: String(body.cityId || 'indore'),
          state: String(body.state || '').slice(0, 40), district: String(body.district || '').slice(0, 60),
          status: 'active', bio: '', about: '', address: '', photo: null,
          createdAt: new Date().toISOString(),
        };
        d.users.push(user);
      } else if (body.name) user.name = String(body.name).slice(0, 60);
      if (body.state) user.state = String(body.state).slice(0, 40);
      if (body.district) user.district = String(body.district).slice(0, 60);
      const token2 = issueToken(user.id);
      save();
      return ok({ token: token2, user: publicUser(user) });
    }
    if (p === '/auth/google' && method === 'POST') {
      const d = load();
      const email = String(body.email || 'demo@gmail.com').toLowerCase();
      let user = d.users.find((u) => u.googleEmail === email);
      if (!user) {
        user = {
          id: uid('u'), phone: String(body.phone || ''), googleEmail: email,
          name: String(body.name || email.split('@')[0]).slice(0, 60),
          role: 'user', cityId: 'indore',
          status: 'active', bio: '', about: '', address: '', photo: null,
          createdAt: new Date().toISOString(),
        };
        d.users.push(user);
      }
      const token2 = issueToken(user.id);
      save();
      return ok({ token: token2, user: publicUser(user) });
    }
    if (p === '/auth/firebase' && method === 'POST') {
      // demo offline mode: Firebase token verify nahi hota — google jaisa hi login
      const d = load();
      const email = String(body.email || 'firebase.demo@gmail.com').toLowerCase();
      let user = d.users.find((u) => u.googleEmail === email);
      if (!user) {
        user = {
          id: uid('u'), phone: String(body.phone || ''), googleEmail: email,
          name: String(body.name || email.split('@')[0]).slice(0, 60),
          role: 'user', cityId: 'indore', status: 'active',
          bio: '', about: '', address: '', photo: null, createdAt: new Date().toISOString(),
        };
        d.users.push(user);
      }
      const token2 = issueToken(user.id);
      save();
      return ok({ token: token2, user: publicUser(user) });
    }
    if (p === '/auth/me' && method === 'GET') return ok({ user: publicUser(needUser()) });
    if (p === '/auth/logout' && method === 'POST') {
      const d = load();
      d.sessions = d.sessions.filter((s) => s.token !== token);
      save();
      return ok({ ok: true });
    }

    // ---- public meta & search ----
    if (p === '/categories' && method === 'GET') {
      return ok(load().categories.filter((c) => c.active !== false).sort((a, b) => a.order - b.order));
    }
    if (p === '/cities' && method === 'GET') return ok(load().cities);
    if (p === '/states' && method === 'GET') return ok(LNM_STATES);

    if (p === '/providers/nearby' && method === 'GET') {
      const d = load();
      const qq = String(q.get('q') || '').trim().toLowerCase();
      const category = String(q.get('category') || '').trim();
      const cityId = String(q.get('cityId') || '').trim();
      const radius = Number(q.get('radius')) > 0 ? Number(q.get('radius')) : 25000;
      const minRating = Number(q.get('minRating')) || 0;
      const openNow = q.get('openNow') === '1' || q.get('openNow') === 'true';
      const sort = ['distance', 'rating', 'reviews', 'relevance'].includes(q.get('sort')) ? q.get('sort') : 'distance';
      const limit = Math.min(Number(q.get('limit')) || 50, 100);
      let lat = q.has('lat') && q.get('lat') !== '' ? Number(q.get('lat')) : NaN;
      let lng = q.has('lng') && q.get('lng') !== '' ? Number(q.get('lng')) : NaN;
      let originLabel = 'gps';
      const city = d.cities.find((c) => c.id === cityId);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const c = city || d.cities.find((x) => x.id === 'indore');
        lat = c.lat; lng = c.lng; originLabel = 'city:' + c.id;
      }
      let rows = d.providers
        .filter((pr) => pr.verified === 'verified')
        .map((pr) => ({ p: pr, distance: haversineMetres(lat, lng, pr.location.lat, pr.location.lng) }))
        .filter(({ distance }) => distance <= radius)
        .filter(({ p: pr }) => {
          if (category && pr.categoryId !== category) return false;
          if (cityId && pr.address.cityId !== cityId) return false;
          if (minRating && pr.ratingAvg < minRating) return false;
          if (openNow && !isOpenNow(pr.availability)) return false;
          if (qq) {
            const cat = d.categories.find((c) => c.id === pr.categoryId) || {};
            const hay = [
              pr.name, pr.businessName, pr.about, (pr.skills || []).join(' '),
              cat.name_en, cat.name_hi, pr.subcategory, pr.address.area, pr.address.city,
            ].join(' ').toLowerCase();
            if (!hay.includes(qq)) {
              const tokens = qq.split(/\s+/).filter((t) => t.length >= 4 && !['near', 'me'].includes(t));
              if (!tokens.some((t) => hay.includes(t))) return false;
            }
          }
          return true;
        });
      rows.sort((a, b) =>
        sort === 'rating' ? b.p.ratingAvg - a.p.ratingAvg
          : sort === 'reviews' ? b.p.ratingCount - a.p.ratingCount
            : sort === 'relevance'
              ? relevanceScore(b.p, b.distance, radius) - relevanceScore(a.p, a.distance, radius)
              : a.distance - b.distance);
      const total = rows.length;
      rows = rows.slice(0, limit);
      return ok({
        origin: { lat, lng, label: originLabel }, radius, total, sort,
        results: rows.map(({ p: pr, distance }) => ({
          ...publicProvider(pr), distance: Math.round(distance), distanceText: formatDistance(distance),
        })),
      });
    }

    if (seg[0] === 'providers' && seg[1] && method === 'GET' && seg.length === 2) {
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.verified !== 'verified') {
        if (q.get('preview') !== '1') throw err(404, 'provider_not_found');
        if (!user || (user.id !== pr.userId && user.role !== 'admin')) throw err(403, 'forbidden');
      }
      const oLat = q.has('lat') && q.get('lat') !== '' ? Number(q.get('lat')) : NaN;
      const oLng = q.has('lng') && q.get('lng') !== '' ? Number(q.get('lng')) : NaN;
      let distance = null;
      if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
        distance = Math.round(haversineMetres(oLat, oLng, pr.location.lat, pr.location.lng));
      }
      return ok({ ...publicProvider(pr), distance, distanceText: formatDistance(distance) });
    }

    if (seg[0] === 'providers' && seg[2] === 'reviews' && method === 'GET') {
      const d = load();
      return ok(d.reviews.filter((r) => r.providerId === seg[1])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }

    if (p === '/searches' && method === 'POST') {
      const d = load();
      d.searches.unshift({
        id: uid('srch'), q: String(body.q || '').slice(0, 80),
        cityId: String(body.cityId || ''), userId: body.userId || null,
        createdAt: new Date().toISOString(),
      });
      d.searches = d.searches.slice(0, 500);
      save();
      return ok({ ok: true }, 201);
    }
    if (p === '/searches/popular' && method === 'GET') {
      const d = load();
      const counts = {};
      d.searches.forEach((s) => { if (s.q) counts[s.q] = (counts[s.q] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([qq]) => qq);
      return ok(top.length ? top : ['electrician', 'raj mistri', 'tailor', 'plumber', 'bhandara']);
    }

    // ---- favourites ----
    if (p === '/favorites' && method === 'GET') {
      const d = load();
      const ids = d.favorites.filter((f) => f.userId === user.id).map((f) => f.providerId);
      return ok(d.providers.filter((pr) => ids.includes(pr.id)).map((pr) => ({
        id: pr.id, name: pr.name, businessName: pr.businessName, categoryId: pr.categoryId,
        phone: pr.phone, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount,
        address: pr.address, location: pr.location, verified: pr.verified,
      })));
    }
    if (seg[0] === 'favorites' && seg[1] && method === 'POST') {
      const u = needUser(); const d = load();
      if (!d.favorites.find((f) => f.userId === u.id && f.providerId === seg[1])) {
        d.favorites.push({ userId: u.id, providerId: seg[1], createdAt: new Date().toISOString() });
        save();
      }
      return ok({ ok: true }, 201);
    }
    if (seg[0] === 'favorites' && seg[1] && method === 'DELETE') {
      const u = needUser(); const d = load();
      d.favorites = d.favorites.filter((f) => !(f.userId === u.id && f.providerId === seg[1]));
      save();
      return ok({ ok: true });
    }

    // ---- leads ----
    if (p === '/leads' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === body.providerId);
      if (!pr) throw err(404, 'provider_not_found');
      d.leads.unshift({
        id: uid('lead'), providerId: pr.id, userId: u.id, userName: u.name,
        type: ['call', 'whatsapp', 'directions'].includes(body.type) ? body.type : 'call',
        createdAt: new Date().toISOString(),
      });
      d.leads = d.leads.slice(0, 2000);
      save();
      return ok({ ok: true }, 201);
    }
    if (p === '/me/fcm-token' && method === 'POST') { needUser(); return ok({ ok: true }); }

    // ---- reviews ----
    if (seg[0] === 'providers' && seg[2] === 'reviews' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      const text = String(body.text || '').slice(0, 500);
      if (d.reviews.find((r) => r.providerId === pr.id && r.userId === u.id)) throw err(400, 'already_reviewed');
      d.reviews.push({
        id: uid('rev'), providerId: pr.id, userId: u.id, userName: u.name,
        rating, text, createdAt: new Date().toISOString(),
      });
      pr.ratingAvg = Math.round(((pr.ratingAvg * pr.ratingCount + rating) / (pr.ratingCount + 1)) * 10) / 10;
      pr.ratingCount += 1;
      save();
      return ok({ ok: true, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount }, 201);
    }

    // ---- reports ----
    if (p === '/reports' && method === 'POST') {
      const u = needUser(); const d = load();
      d.reports.unshift({
        id: uid('rep'),
        targetType: ['provider', 'user', 'review'].includes(body.targetType) ? body.targetType : 'provider',
        targetId: String(body.targetId || body.providerId || ''),
        providerId: String(body.providerId || ''),
        userId: u.id, userName: u.name,
        reason: String(body.reason || 'User report').slice(0, 300),
        status: 'open', createdAt: new Date().toISOString(),
      });
      save();
      return ok({ ok: true }, 201);
    }

    // ---- provider self-registration ----
    if (p === '/providers/register' && method === 'POST') {
      const u = needUser(); const d = load();
      const b = body || {};
      const cat = d.categories.find((c) => c.id === b.categoryId);
      if (!cat) throw err(400, 'invalid_category');
      if (!b.name || !b.phone) throw err(400, 'name_and_phone_required');
      const city = d.cities.find((c) => c.id === b.cityId) || d.cities.find((c) => c.id === 'indore');
      const provider = {
        id: uid('prv'), userId: u.id,
        name: String(b.name).slice(0, 60),
        businessName: String(b.businessName || b.name).slice(0, 80),
        categoryId: cat.id,
        subcategory: String(b.subcategory || (cat.subcategories[0] || {}).id || ''),
        customService: cat.customAllowed ? String(b.customService || '').slice(0, 60) : '',
        phone: String(b.phone).replace(/\D/g, '').slice(-10),
        gallery: Array.isArray(b.gallery) ? b.gallery.filter((g) => typeof g === 'string' && g.startsWith('data:image')).slice(0, 6).map((g) => g.slice(0, 300000)) : [],
        videoLinks: Array.isArray(b.videoLinks) ? b.videoLinks.map(parseYt).filter(Boolean).slice(0, 5) : [],
        whatsapp: String(b.whatsapp || b.phone).replace(/\D/g, '').slice(-10),
        photo: typeof b.photo === 'string' && b.photo.startsWith('data:image') ? b.photo.slice(0, 400000) : null,
        about: String(b.about || '').slice(0, 500),
        skills: Array.isArray(b.skills) ? b.skills.slice(0, 8).map(String) : [],
        priceHint: String(b.priceHint || '').slice(0, 40),
        address: {
          line1: String(b.address || '').slice(0, 120), area: String(b.area || '').slice(0, 60),
          city: city.name_en, cityId: city.id,
          state: String(b.state || city.state).slice(0, 40), district: String(b.district || '').slice(0, 60),
          pincode: String(b.pincode || '').slice(0, 10),
        },
        location: {
          lat: Number(b.lat) || city.lat + (Math.random() - 0.5) * 0.02,
          lng: Number(b.lng) || city.lng + (Math.random() - 0.5) * 0.02,
        },
        availability: {
          manualOpen: true,
          hours: { open: String(b.open || '09:00'), close: String(b.close || '19:00') },
          offDays: Array.isArray(b.offDays) ? b.offDays.map(Number) : [0],
        },
        verified: 'pending', source: 'self',
        kycStatus: b.kycName ? 'submitted' : 'pending',
        kycName: String(b.kycName || '').slice(0, 80),
        ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'],
        createdAt: new Date().toISOString(),
      };
      d.providers.push(provider);
      if (u.role === 'user') u.role = 'provider';
      save();
      return ok({
        ok: true, provider: { id: provider.id, verified: provider.verified },
        message: 'Verification ke liye bhej diya gaya. Admin approve karte hi listing live hogi.',
      }, 201);
    }

    // ---- provider dashboard ----
    if (p === '/me/providers' && method === 'GET') {
      const u = needUser(); const d = load();
      return ok(d.providers.filter((pr) => pr.userId === u.id).map((pr) => {
        const leads = d.leads.filter((l) => l.providerId === pr.id);
        return {
          id: pr.id, name: pr.name, businessName: pr.businessName, categoryId: pr.categoryId,
          verified: pr.verified, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount,
          availability: pr.availability, isOpenNow: isOpenNow(pr.availability),
          leadCount: leads.length, phone: pr.phone, address: pr.address,
        };
      }));
    }
    if (p === '/me/leads' && method === 'GET') {
      const u = needUser(); const d = load();
      const myIds = d.providers.filter((pr) => pr.userId === u.id).map((pr) => pr.id);
      return ok(d.leads.filter((l) => myIds.includes(l.providerId)).slice(0, 100));
    }

    // ---- provider edit (owner or admin) ----
    if (seg[0] === 'providers' && seg[1] && method === 'PUT') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      const b = body || {};
      ['name', 'businessName', 'about', 'priceHint', 'phone'].forEach((k) => {
        if (b[k] != null) pr[k] = String(b[k]).slice(0, 500);
      });
      if (b.whatsapp) pr.whatsapp = String(b.whatsapp).replace(/\D/g, '').slice(-10);
      if (b.photo === null || (typeof b.photo === 'string' && b.photo.startsWith('data:image'))) {
        pr.photo = b.photo ? b.photo.slice(0, 400000) : null;
      }
      if (Array.isArray(b.skills)) pr.skills = b.skills.slice(0, 8).map(String);
      if (b.address) pr.address.line1 = String(b.address).slice(0, 120);
      if (b.area) pr.address.area = String(b.area).slice(0, 60);
      if (b.pincode) pr.address.pincode = String(b.pincode).slice(0, 10);
      if (Number.isFinite(Number(b.lat))) pr.location.lat = Number(b.lat);
      if (Number.isFinite(Number(b.lng))) pr.location.lng = Number(b.lng);
      if (b.open || b.close) {
        pr.availability.hours = {
          open: String(b.open || pr.availability.hours.open),
          close: String(b.close || pr.availability.hours.close),
        };
      }
      save();
      return ok({ ok: true });
    }

    // ---- availability toggle ----
    if (seg[0] === 'providers' && seg[2] === 'availability' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      pr.availability.manualOpen = body.open === undefined ? !pr.availability.manualOpen : !!body.open;
      save();
      return ok({ ok: true, manualOpen: pr.availability.manualOpen });
    }

    // ═══════════ ADMIN ═══════════
    if (p === '/admin/stats' && method === 'GET') {
      needAdmin();
      const d = load();
      const byCity = {}, byCategory = {};
      d.providers.forEach((pr) => {
        byCity[pr.address.cityId] = (byCity[pr.address.cityId] || 0) + 1;
        byCategory[pr.categoryId] = (byCategory[pr.categoryId] || 0) + 1;
      });
      const today = new Date().toISOString().slice(0, 10);
      return ok({
        totals: {
          providers: d.providers.length,
          verified: d.providers.filter((pr) => pr.verified === 'verified').length,
          pending: d.providers.filter((pr) => pr.verified === 'pending').length,
          users: d.users.length, reviews: d.reviews.length, leads: d.leads.length,
          searches: d.searches.length,
          searchesToday: d.searches.filter((s) => s.createdAt.slice(0, 10) === today).length,
          openReports: d.reports.filter((r) => r.status === 'open').length,
        },
        byCity, byCategory, recentSearches: d.searches.slice(0, 15),
      });
    }
    if (p === '/admin/providers' && method === 'GET') {
      needAdmin();
      const d = load();
      const status = q.get('status'), search = q.get('q');
      let rows = d.providers.slice().reverse();
      if (status) rows = rows.filter((pr) => pr.verified === status);
      if (search) {
        const s = String(search).toLowerCase();
        rows = rows.filter((pr) => (pr.name + pr.businessName + pr.phone + pr.address.city).toLowerCase().includes(s));
      }
      return ok(rows);
    }
    if (p === '/admin/providers' && method === 'POST') {
      needAdmin();
      const d = load(); const b = body || {};
      const cat = d.categories.find((c) => c.id === b.categoryId);
      if (!cat) throw err(400, 'invalid_category');
      const city = d.cities.find((c) => c.id === b.cityId) || d.cities[0];
      d.providers.push({
        id: uid('prv'), userId: b.userId || null,
        name: String(b.name || '').slice(0, 60) || 'Unnamed',
        businessName: String(b.businessName || b.name || '').slice(0, 80),
        categoryId: cat.id, subcategory: String(b.subcategory || (cat.subcategories[0] || {}).id || ''),
        phone: String(b.phone || '').replace(/\D/g, '').slice(-10),
        whatsapp: String(b.whatsapp || b.phone || '').replace(/\D/g, '').slice(-10),
        photo: null, about: String(b.about || '').slice(0, 500),
        skills: Array.isArray(b.skills) ? b.skills.slice(0, 8).map(String) : [],
        priceHint: String(b.priceHint || '').slice(0, 40),
        address: {
          line1: String(b.address || '').slice(0, 120), area: String(b.area || '').slice(0, 60),
          city: city.name_en, cityId: city.id, state: String(b.state || city.state).slice(0, 40),
          pincode: String(b.pincode || '').slice(0, 10),
        },
        location: { lat: Number(b.lat) || city.lat, lng: Number(b.lng) || city.lng },
        availability: { manualOpen: true, hours: { open: '09:00', close: '19:00' }, offDays: [0] },
        verified: 'verified', source: 'admin', kycStatus: 'admin-added',
        ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'], createdAt: new Date().toISOString(),
      });
      save();
      return ok({ ok: true, provider: { id: 'new', verified: 'verified' } }, 201);
    }
    if (p === '/admin/providers/bulk' && method === 'POST') {
      needAdmin();
      const d = load();
      const csv = String(body.csv || '');
      const lines = csv.split(/\r?\n/).filter((l) => l.trim());
      const out = { added: 0, skipped: [], rows: [] };
      const parse = (line) => {
        const o = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { o.push(cur); cur = ''; }
          else cur += ch;
        }
        o.push(cur); return o.map((s) => s.trim());
      };
      for (const line of lines) {
        const c = parse(line);
        if (/^name$/i.test(c[0])) continue;
        const [name, businessName, category, subcategory, phone, whatsapp, address, area, cityId, state, pincode, lat, lng, about] = c;
        const cat = d.categories.find((x) => x.id === category);
        const city = d.cities.find((x) => x.id === (cityId || '').toLowerCase());
        if (!name || !cat || !city) {
          out.skipped.push({ name, reason: !name ? 'no name' : !cat ? 'bad category' : 'bad city' });
          continue;
        }
        d.providers.push({
          id: uid('prv'), userId: null,
          name: name.slice(0, 60), businessName: (businessName || name).slice(0, 80),
          categoryId: cat.id, subcategory: subcategory || (cat.subcategories[0] || {}).id || '',
          phone: String(phone || '').replace(/\D/g, '').slice(-10),
          whatsapp: String(whatsapp || phone || '').replace(/\D/g, '').slice(-10),
          photo: null, about: (about || '').slice(0, 500), skills: [], priceHint: '',
          address: {
            line1: address || area || '', area: area || '', city: city.name_en,
            cityId: city.id, state: state || city.state, pincode: pincode || '',
          },
          location: { lat: Number(lat) || city.lat, lng: Number(lng) || city.lng },
          availability: { manualOpen: true, hours: { open: '09:00', close: '19:00' }, offDays: [0] },
          verified: 'verified', source: 'csv', kycStatus: 'bulk-import',
          ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'], createdAt: new Date().toISOString(),
        });
        out.added++; out.rows.push(name);
      }
      save();
      return ok(out);
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[3] === 'verify' && method === 'POST') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      pr.verified = 'verified'; save();
      return ok({ ok: true, verified: 'verified' });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[3] === 'reject' && method === 'POST') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      pr.verified = 'rejected'; save();
      return ok({ ok: true, verified: 'rejected' });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[2] && method === 'PUT') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      const b = body || {};
      ['name', 'businessName', 'about', 'phone', 'whatsapp', 'priceHint'].forEach((k) => {
        if (b[k] != null) pr[k] = String(b[k]).slice(0, 500);
      });
      if (b.categoryId && d.categories.find((c) => c.id === b.categoryId)) pr.categoryId = b.categoryId;
      if (b.subcategory) pr.subcategory = String(b.subcategory);
      if (b.address) pr.address.line1 = String(b.address).slice(0, 120);
      if (b.area) pr.address.area = String(b.area).slice(0, 60);
      if (b.pincode) pr.address.pincode = String(b.pincode).slice(0, 10);
      if (Number.isFinite(Number(b.lat))) pr.location.lat = Number(b.lat);
      if (Number.isFinite(Number(b.lng))) pr.location.lng = Number(b.lng);
      save();
      return ok({ ok: true });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[2] && method === 'DELETE') {
      needAdmin();
      const d = load();
      d.providers = d.providers.filter((pr) => pr.id !== seg[2]);
      save();
      return ok({ ok: true });
    }

    // ---- categories admin ----
    if (p === '/admin/categories' && method === 'GET') { needAdmin(); return ok(load().categories); }
    if (p === '/admin/categories' && method === 'POST') {
      needAdmin();
      const d = load(); const b = body || {};
      const id = String(b.id || b.name_en || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      if (!id || d.categories.find((c) => c.id === id)) throw err(400, 'bad_or_duplicate_id');
      d.categories.push({
        id, name_en: String(b.name_en || '').slice(0, 40), name_hi: String(b.name_hi || '').slice(0, 40),
        icon: String(b.icon || 'wrench').slice(0, 20), order: d.categories.length + 1, active: true,
        subcategories: Array.isArray(b.subcategories) ? b.subcategories : [],
      });
      save();
      return ok({ ok: true, id }, 201);
    }
    if (seg[0] === 'admin' && seg[1] === 'categories' && seg[2] && method === 'PUT') {
      needAdmin();
      const d = load();
      const c = d.categories.find((x) => x.id === seg[2]);
      if (!c) throw err(404, 'not_found');
      const b = body || {};
      if (b.name_en) c.name_en = String(b.name_en).slice(0, 40);
      if (b.name_hi) c.name_hi = String(b.name_hi).slice(0, 40);
      if (b.icon) c.icon = String(b.icon).slice(0, 20);
      if (b.active !== undefined) c.active = !!b.active;
      if (Array.isArray(b.subcategories)) c.subcategories = b.subcategories;
      save();
      return ok({ ok: true });
    }
    if (seg[0] === 'admin' && seg[1] === 'categories' && seg[2] && method === 'DELETE') {
      needAdmin();
      const d = load();
      d.categories = d.categories.filter((c) => c.id !== seg[2]);
      save();
      return ok({ ok: true });
    }

    // ---- moderation ----
    if (p === '/admin/reports' && method === 'GET') {
      needAdmin();
      const d = load();
      return ok(d.reports.map((r) => ({ ...r, provider: d.providers.find((pr) => pr.id === r.providerId) || null })));
    }
    if (seg[0] === 'admin' && seg[1] === 'reports' && seg[3] === 'resolve' && method === 'POST') {
      needAdmin();
      const d = load();
      const r = d.reports.find((x) => x.id === seg[2]);
      if (r) { r.status = 'resolved'; save(); }
      return ok({ ok: true });
    }


    // ---- v2: profile, gallery, videos, admin moderation ----
    function parseYt(url) {
      const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
      return m ? { url: String(url).slice(0, 200), videoId: m[1] } : null;
    }
    if (p === '/me/profile' && method === 'PUT') {
      const u = needUser(); const b = body || {};
      if (b.name != null) u.name = String(b.name).slice(0, 60);
      if (b.bio != null) u.bio = String(b.bio).slice(0, 200);
      if (b.about != null) u.about = String(b.about).slice(0, 500);
      if (b.address != null) u.address = String(b.address).slice(0, 200);
      if (b.state != null) u.state = String(b.state).slice(0, 40);
      if (b.district != null) u.district = String(b.district).slice(0, 60);
      if (b.photo === null || (typeof b.photo === 'string' && b.photo.startsWith('data:image'))) u.photo = b.photo ? b.photo.slice(0, 200000) : null;
      save();
      return ok({ ok: true, user: publicUser(u) });
    }
    if (seg[0] === 'me' && seg[1] === 'providers' && seg[2] && seg[3] === 'gallery' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      const photo = String(body.photo || '');
      if (!photo.startsWith('data:image')) throw err(400, 'invalid_photo');
      pr.gallery = pr.gallery || [];
      if (pr.gallery.length >= 6) throw err(400, 'gallery_full');
      pr.gallery.push(photo.slice(0, 300000));
      save();
      return ok({ ok: true, count: pr.gallery.length }, 201);
    }
    if (seg[0] === 'me' && seg[1] === 'providers' && seg[2] && seg[3] === 'gallery' && seg[4] && method === 'DELETE') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      const idx = Number(seg[4]);
      if (pr.gallery && idx >= 0 && idx < pr.gallery.length) pr.gallery.splice(idx, 1);
      save();
      return ok({ ok: true, count: (pr.gallery || []).length });
    }
    if (seg[0] === 'me' && seg[1] === 'providers' && seg[2] && seg[3] === 'videos' && method === 'PUT') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      const links = Array.isArray(body.links) ? body.links : [];
      pr.videoLinks = links.map(parseYt).filter(Boolean).slice(0, 5);
      save();
      return ok({ ok: true, videoLinks: pr.videoLinks });
    }
    if (p === '/admin/users' && method === 'GET') {
      needAdmin(); const d = load();
      return ok(d.users.map((u) => ({
        id: u.id, name: u.name, phone: u.phone, googleEmail: u.googleEmail || '',
        role: u.role, status: u.status || 'active', cityId: u.cityId,
        state: u.state || '', district: u.district || '', createdAt: u.createdAt,
        providerCount: d.providers.filter((x) => x.userId === u.id).length,
        reportCount: d.reports.filter((r) => r.targetId === u.id || r.userId === u.id).length,
      })));
    }
    if (seg[0] === 'admin' && seg[1] === 'users' && seg[2] && seg[3] === 'status' && method === 'POST') {
      needAdmin(); const d = load();
      const uu = d.users.find((x) => x.id === seg[2]);
      if (!uu) throw err(404, 'not_found');
      const st = String(body.status || '');
      if (!['active', 'suspended', 'blocked', 'deleted'].includes(st)) throw err(400, 'invalid_status');
      if (uu.role === 'admin' && st !== 'active') throw err(400, 'cannot_moderate_admin');
      uu.status = st; uu.statusReason = String(body.reason || '').slice(0, 200);
      if (st === 'blocked' || st === 'deleted') {
        d.providers.filter((x) => x.userId === uu.id).forEach((x) => { x.status = st; });
        d.sessions = d.sessions.filter((sn) => sn.userId !== uu.id);
      }
      save();
      return ok({ ok: true, status: st });
    }
    if (seg[0] === 'admin' && seg[1] === 'users' && seg[2] && method === 'DELETE') {
      needAdmin(); const d = load();
      const uu = d.users.find((x) => x.id === seg[2]);
      if (!uu) throw err(404, 'not_found');
      if (uu.role === 'admin') throw err(400, 'cannot_delete_admin');
      const pids = d.providers.filter((x) => x.userId === uu.id).map((x) => x.id);
      d.providers = d.providers.filter((x) => x.userId !== uu.id);
      d.reviews = d.reviews.filter((r) => r.userId !== uu.id && !pids.includes(r.providerId));
      d.favorites = d.favorites.filter((f) => f.userId !== uu.id && !pids.includes(f.providerId));
      d.leads = d.leads.filter((l) => !pids.includes(l.providerId));
      d.sessions = d.sessions.filter((sn) => sn.userId !== uu.id);
      d.users = d.users.filter((x) => x.id !== uu.id);
      save();
      return ok({ ok: true, deletedProviders: pids.length });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[2] && seg[3] === 'status' && method === 'POST') {
      needAdmin(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      const st = String(body.status || '');
      if (!['active', 'suspended', 'blocked', 'deleted'].includes(st)) throw err(400, 'invalid_status');
      pr.status = st; pr.statusReason = String(body.reason || '').slice(0, 200);
      save();
      return ok({ ok: true, status: st });
    }
    if (p === '/feedback' && method === 'POST') {
      const d = load();
      const message = String(body.message || '').trim();
      if (message.length < 5) throw err(400, 'message_required');
      d.feedback = d.feedback || [];
      d.feedback.unshift({
        id: uid('fb'), userId: user ? user.id : null,
        name: String(body.name || '').slice(0, 60), contact: String(body.contact || '').slice(0, 80),
        type: ['user', 'provider', 'other'].includes(body.type) ? body.type : 'user',
        rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
        message: message.slice(0, 1000), status: 'new', createdAt: new Date().toISOString(),
      });
      d.feedback = d.feedback.slice(0, 1000);
      save();
      return ok({ ok: true, message: 'Feedback mil gaya — shukriya!' }, 201);
    }
    if (p === '/admin/feedback' && method === 'GET') {
      needAdmin(); const d = load();
      return ok((d.feedback || []).map((f) => ({ ...f, userName: f.userId ? (d.users.find((u) => u.id === f.userId) || {}).name || f.name : f.name })));
    }
    if (seg[0] === 'admin' && seg[1] === 'feedback' && seg[2] && seg[3] === 'resolve' && method === 'POST') {
      needAdmin(); const d = load();
      const f = (d.feedback || []).find((x) => x.id === seg[2]);
      if (f) { f.status = 'read'; save(); }
      return ok({ ok: true });
    }
    if (seg[0] === 'admin' && seg[1] === 'reviews' && seg[2] && method === 'DELETE') {
      needAdmin(); const d = load();
      const rv = d.reviews.find((x) => x.id === seg[2]);
      if (!rv) throw err(404, 'not_found');
      d.reviews = d.reviews.filter((x) => x.id !== rv.id);
      const pr = d.providers.find((x) => x.id === rv.providerId);
      if (pr) {
        const rest = d.reviews.filter((x) => x.providerId === pr.id);
        pr.ratingCount = rest.length;
        pr.ratingAvg = rest.length ? Math.round((rest.reduce((a, x) => a + x.rating, 0) / rest.length) * 10) / 10 : 0;
      }
      save();
      return ok({ ok: true });
    }
    throw err(404, 'not_found');
  }

  function ok(data, status) { return { status: status || 200, data }; }
  function err(status, error, hint) {
    const e = new Error(error);
    e.status = status; e.data = hint ? { error, hint } : { error };
    return e;
  }

  /* ═══════════ OVERRIDE API.req — everything runs locally now ═══════════ */
  if (window.API) {
    API.req = async function (method, path, body) {
      try {
        const r = route(method, path, body, this.token);
        return JSON.parse(JSON.stringify(r.data)); // snapshot like Express res.json
      } catch (e) {
        if (e && e.status === 401) { this.token = ''; this.user = null; }
        if (e && e.status) throw e;
        throw Object.assign(new Error('error'), { data: { error: 'error' }, status: 500 });
      }
    };
    window.LNM_OFFLINE = true; // marker for the UI badge
  }
})();

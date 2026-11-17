/**
 * i18n.js — Bilingual UI dictionary (English + हिंदी).
 * Every user-facing string in the app comes from here. t(key) falls back to English.
 */
const I18N = {
  en: {
    // nav & shell
    nav_home: 'Home', nav_search: 'Search', nav_fav: 'Saved', nav_account: 'Account',
    tagline: 'Find trusted workers near you',
    search_ph: 'Try "electrician near me"…', popular: 'Popular searches', recent: 'Recent searches',
    clear: 'Clear', categories: 'All categories', top_rated: 'Top rated near you', see_all: 'See all',
    change: 'Change', use_gps: 'Use my GPS location', share_app: 'Share this app', install_app: 'Install App',
    // common actions
    call: 'Call', whatsapp: 'WhatsApp', directions: 'Directions', share: 'Share', save: 'Save', saved: 'Saved',
    open_now: 'Open now', closed_now: 'Closed', verified: 'Verified', reviews: 'reviews', review: 'Review',
    about: 'About', skills: 'Services', price_hint: 'Charges', address_l: 'Address', hours: 'Working hours',
    distance: 'away', loading: 'Loading…', retry: 'Try again', offline_banner: 'You are offline — showing saved data',
    login: 'Login', logout: 'Logout', phone: 'Mobile number', name_l: 'Your name', city: 'City',
    select_city: 'Select your city', my_location: 'My current location', error_gen: 'Something went wrong',
    write_review: 'Write a review', report: 'Report this listing', report_sent: 'Report sent. Thank you.',
    submit: 'Submit', next: 'Next', back: 'Back', edit: 'Edit', delete: 'Delete', done: 'Done',
    // search
    results_for: 'Results', sort_by: 'Sort', s_dist: 'Nearest', s_best: 'Best match', s_rating: 'Top rated', s_reviews: 'Most reviewed',
    filters: 'Filters', f_open: 'Open now', f_rating: '4★ & above', no_results: 'No providers found here yet',
    no_results_hint: 'Widen the radius, change city, or invite workers to join — this app grows with its community.',
    map_view: 'Map', list_view: 'List', results_count: 'workers found',
    // auth
    login_title: 'Login / Sign up', login_sub: 'One OTP — no password to remember',
    phone_ph: '10-digit mobile number', name_ph: 'Name (optional)', otp_ph: 'Enter OTP',
    otp_sent: 'OTP sent (demo: 123456)', verify: 'Verify & Login', google_login: 'Continue with Google (demo)',
    demo_note: 'Demo mode: no real SMS is sent. Use OTP 123456.',
    // provider registration
    reg_title: 'List your services — FREE', reg_sub: 'Get customers from your area. Takes 3 minutes.',
    step: 'Step', r1_t: 'Your details', r2_t: 'Address & location', r3_t: 'Photos & ID proof',
    business_name: 'Business / shop name (optional)', category: 'Service category', subcategory: 'Specialisation',
    whatsapp_l: 'WhatsApp number', address_l2: 'Shop / work address', area: 'Area / locality', pincode: 'PIN code',
    pick_map: 'Pin location on map', use_my_loc: 'Use my GPS', photo_l: 'Profile / shop photo',
    photo_hint: 'A clear photo builds trust (optional)', about_ph: 'Tell customers about your work and experience…',
    skills_ph: 'Services you offer (comma separated)', price_ph: 'e.g. ₹250 visit charge',
    kyc_name: 'Name on ID proof (Aadhaar/Voter ID)', kyc_hint: 'ID card photo is verified by admin — your number is shown to customers, ID is not.',
    open_time: 'Opens at', close_time: 'Closes at', submit_reg: 'Submit for verification',
    reg_success: 'Application submitted! ✅', reg_success_hint: 'Admin verification usually takes 24–48 hours. You will get a push/SMS when your listing goes live.',
    go_dash: 'Go to my dashboard',
    // provider dashboard
    dash_title: 'My dashboard', status: 'Listing status', pending_msg: 'Waiting for admin verification',
    verified_msg: 'Your listing is LIVE in search results', rejected_msg: 'Rejected — please edit and resubmit',
    toggle_open: 'I am OPEN for work now', toggle_closed: 'I am CLOSED right now',
    leads_title: 'Customer contacts (leads)', no_leads: 'No leads yet — share your listing to get calls!',
    lead_call: 'Phone call', lead_wa: 'WhatsApp', lead_dir: 'Asked directions', edit_profile: 'Edit profile',
    // admin
    admin_title: 'Admin panel', a_overview: 'Overview', a_providers: 'Providers', a_categories: 'Categories', a_reports: 'Reports',
    st_providers: 'Total providers', st_pending: 'Pending approval', st_users: 'Users', st_searches: 'Searches',
    st_leads: 'Leads', st_reviews: 'Reviews', st_today: 'searches today', by_city: 'Providers by city', by_cat: 'By category',
    add_provider: '+ Add provider (manual)', bulk_csv: 'Bulk upload CSV', bulk_hint: 'CSV columns: name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about',
    approve: 'Approve', reject: 'Reject', p_pending: 'Pending', p_verified: 'Verified', p_rejected: 'Rejected', p_all: 'All',
    search_prov: 'Search name/phone/city…', name_en: 'Name (English)', name_hi: 'Name (Hindi)', icon_l: 'Icon',
    add_cat: '+ Add category', active_l: 'Active', resolve: 'Mark resolved', no_reports: 'No open reports',
    recent_searches_admin: 'Recent searches', manual_added: 'Manual add — instantly live', confirm_del: 'Delete this listing?',
    // account
    fav_empty: 'No saved providers yet', fav_empty_hint: 'Tap the heart on any provider to save them here.',
    become_provider: 'Are you a worker? List your services', provider_dash: 'Provider dashboard', admin_panel: 'Admin panel',
    login_first: 'Login first', my_account: 'My account',
    // rating
    rate_prompt: 'How was the service?', your_review: 'Your experience (Hindi/English)…', thanks_review: 'Review submitted — shukriya!',
    save_changes: 'Save changes', saved_ok: 'Saved ✓', remove_photo: 'Remove photo', edit_title: 'Edit my listing',
    dl_template: 'Download CSV template', export_csv: 'Export CSV',
    rate_after_lead: 'You contacted recently — how was it? Share your experience ⭐',
  },
  hi: {
    nav_home: 'होम', nav_search: 'खोजें', nav_fav: 'सेव', nav_account: 'खाता',
    tagline: 'अपने पास के भरोसेमंद कामगार खोजें',
    search_ph: '"पास में इलेक्ट्रीशियन" खोजें…', popular: 'लोकप्रिय खोज', recent: 'हाल की खोज',
    clear: 'हटाएं', categories: 'सभी श्रेणियाँ', top_rated: 'आपके पास टॉप रेटेड', see_all: 'सभी देखें',
    change: 'बदलें', use_gps: 'मेरी लोकेशन उपयोग करें', share_app: 'ऐप शेयर करें', install_app: 'ऐप इंस्टॉल करें',
    call: 'कॉल', whatsapp: 'व्हाट्सएप', directions: 'रास्ता', share: 'शेयर', save: 'सेव', saved: 'सेव किया',
    open_now: 'अभी खुला', closed_now: 'अभी बंद', verified: 'सत्यापित', reviews: 'समीक्षाएं', review: 'समीक्षा',
    about: 'परिचय', skills: 'सेवाएं', price_hint: 'शुल्क', address_l: 'पता', hours: 'काम के समय',
    distance: 'दूर', loading: 'लोड हो रहा है…', retry: 'फिर कोशिश करें', offline_banner: 'आप ऑफलाइन हैं — पुराना डेटा दिख रहा है',
    login: 'लॉगिन', logout: 'लॉगआउट', phone: 'मोबाइल नंबर', name_l: 'आपका नाम', city: 'शहर',
    select_city: 'अपना शहर चुनें', my_location: 'मेरी वर्तमान लोकेशन', error_gen: 'कुछ गड़बड़ हुई',
    write_review: 'समीक्षा लिखें', report: 'इस लिस्टिंग की रिपोर्ट करें', report_sent: 'रिपोर्ट भेज दी गई। धन्यवाद।',
    submit: 'जमा करें', next: 'आगे', back: 'पीछे', edit: 'बदलें', delete: 'हटाएं', done: 'हो गया',
    results_for: 'नतीजे', sort_by: 'क्रम', s_dist: 'सबसे पास', s_best: 'सर्वोत्तम', s_rating: 'टॉप रेटेड', s_reviews: 'ज्यादा समीक्षा',
    filters: 'फिल्टर', f_open: 'अभी खुला', f_rating: '4★ और ऊपर', no_results: 'यहाँ अभी कोई कामगार नहीं मिला',
    no_results_hint: 'दायरा बढ़ाएं, शहर बदलें, या कामगारों को जुड़ने के लिए कहें — यह ऐप समुदाय के साथ बढ़ता है।',
    map_view: 'नक्शा', list_view: 'सूची', results_count: 'कामगार मिले',
    login_title: 'लॉगिन / साइन अप', login_sub: 'सिर्फ OTP — पासवर्ड याद रखने की जरूरत नहीं',
    phone_ph: '10 अंकों का मोबाइल नंबर', name_ph: 'नाम (वैकल्पिक)', otp_ph: 'OTP डालें',
    otp_sent: 'OTP भेजा (डेमो: 123456)', verify: 'जाँचें और लॉगिन करें', google_login: 'Google से जारी रखें (डेमो)',
    demo_note: 'डेमो मोड: असली SMS नहीं जाता। OTP 123456 उपयोग करें।',
    reg_title: 'अपनी सेवा लिस्ट करें — मुफ्त', reg_sub: 'अपने इलाके से ग्राहक पाएं। सिर्फ 3 मिनट।',
    step: 'चरण', r1_t: 'आपकी जानकारी', r2_t: 'पता और लोकेशन', r3_t: 'फोटो और ID प्रमाण',
    business_name: 'दुकान / व्यवसाय का नाम (वैकल्पिक)', category: 'सेवा श्रेणी', subcategory: 'विशेषज्ञता',
    whatsapp_l: 'व्हाट्सएप नंबर', address_l2: 'दुकान / काम का पता', area: 'इलाका / मोहल्ला', pincode: 'पिन कोड',
    pick_map: 'नक्शे पर जगह चुनें', use_my_loc: 'GPS उपयोग करें', photo_l: 'प्रोफाइल / दुकान की फोटो',
    photo_hint: 'साफ फोटो से भरोसा बढ़ता है (वैकल्पिक)', about_ph: 'अपने काम और अनुभव के बारे में बताएं…',
    skills_ph: 'आपकी सेवाएं (कॉमा से अलग करें)', price_ph: 'जैसे ₹250 विजिट शुल्क',
    kyc_name: 'ID प्रमाण पर नाम (आधार/वोटर ID)', kyc_hint: 'ID कार्ड एडमिन जाँचता है — ग्राहकों को आपका नंबर दिखता है, ID नहीं।',
    open_time: 'खुलने का समय', close_time: 'बंद होने का समय', submit_reg: 'सत्यापन के लिए भेजें',
    reg_success: 'आवेदन जमा हो गया! ✅', reg_success_hint: 'एडमिन सत्यापन में आमतौर पर 24–48 घंटे लगते हैं। लिस्टिंग लाइव होते ही आपको सूचना मिलेगी।',
    go_dash: 'मेरा डैशबोर्ड',
    dash_title: 'मेरा डैशबोर्ड', status: 'लिस्टिंग स्थिति', pending_msg: 'एडमिन सत्यापन की प्रतीक्षा है',
    verified_msg: 'आपकी लिस्टिंग खोज में LIVE है', rejected_msg: 'अस्वीकृत — बदलकर फिर भेजें',
    toggle_open: 'मैं अभी काम के लिए खुला हूँ', toggle_closed: 'मैं अभी बंद हूँ',
    leads_title: 'ग्राहक संपर्क (लीड्स)', no_leads: 'अभी कोई लीड नहीं — लिस्टिंग शेयर करें!',
    lead_call: 'फोन कॉल', lead_wa: 'व्हाट्सएप', lead_dir: 'रास्ता पूछा', edit_profile: 'प्रोफाइल बदलें',
    admin_title: 'एडमिन पैनल', a_overview: 'सारांश', a_providers: 'कामगार', a_categories: 'श्रेणियां', a_reports: 'रिपोर्ट',
    st_providers: 'कुल कामगार', st_pending: 'स्वीकृति बाकी', st_users: 'उपयोगकर्ता', st_searches: 'खोज',
    st_leads: 'लीड्स', st_reviews: 'समीक्षाएं', st_today: 'आज की खोज', by_city: 'शहर के अनुसार', by_cat: 'श्रेणी के अनुसार',
    add_provider: '+ कामगार जोड़ें (मैनुअल)', bulk_csv: 'बल्क CSV अपलोड', bulk_hint: 'CSV कॉलम: name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about',
    approve: 'स्वीकार', reject: 'अस्वीकार', p_pending: 'बाकी', p_verified: 'सत्यापित', p_rejected: 'अस्वीकृत', p_all: 'सभी',
    search_prov: 'नाम/नंबर/शहर खोजें…', name_en: 'नाम (अंग्रेज़ी)', name_hi: 'नाम (हिंदी)', icon_l: 'आइकन',
    add_cat: '+ श्रेणी जोड़ें', active_l: 'सक्रिय', resolve: 'हल किया', no_reports: 'कोई खुली रिपोर्ट नहीं',
    recent_searches_admin: 'हाल की खोज', manual_added: 'मैनुअल — तुरंत लाइव', confirm_del: 'यह लिस्टिंग हटाएं?',
    fav_empty: 'अभी कोई सेव किया कामगार नहीं', fav_empty_hint: 'किसी भी कामगार पर ❤️ दबाकर यहाँ सेव करें।',
    become_provider: 'क्या आप कामगार हैं? अपनी सेवा लिस्ट करें', provider_dash: 'कामगार डैशबोर्ड', admin_panel: 'एडमिन पैनल',
    login_first: 'पहले लॉगिन करें', my_account: 'मेरा खाता',
    rate_prompt: 'सेवा कैसी रही?', your_review: 'आपका अनुभव (हिंदी/अंग्रेज़ी)…', thanks_review: 'समीक्षा जमा हुई — शुक्रिया!',
    save_changes: 'बदलाव सेव करें', saved_ok: 'सेव हो गया ✓', remove_photo: 'फोटो हटाएं', edit_title: 'मेरी लिस्टिंग बदलें',
    dl_template: 'CSV टेम्पलेट डाउनलोड', export_csv: 'CSV एक्सपोर्ट',
    rate_after_lead: 'आपने हाल में संपर्क किया — कैसा रहा? अनुभव साझा करें ⭐',
  },
};

let LANG = localStorage.getItem('lnm_lang') || 'en';

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

function setLang(l) {
  LANG = l;
  localStorage.setItem('lnm_lang', l);
  document.documentElement.lang = l === 'hi' ? 'hi-IN' : 'en-IN';
}

/** Localised label from a {name_en, name_hi} style object or two fields. */
function locName(en, hi) {
  return LANG === 'hi' && hi ? hi : en;
}

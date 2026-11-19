// models.dart — JSON models matching the REST API shapes (backend/src/routes/*).
class CategoryModel {
  CategoryModel(this.id, this.nameEn, this.nameHi, this.icon, this.iconImage,
      this.customAllowed, this.subcategories);
  final String id, nameEn, nameHi, icon, iconImage;
  final bool customAllowed;
  final List<Subcategory> subcategories;

  factory CategoryModel.fromJson(Map<String, dynamic> j) => CategoryModel(
        j['id'] ?? '',
        j['name_en'] ?? '',
        j['name_hi'] ?? '',
        j['icon'] ?? 'wrench',
        j['iconImage'] ?? '',
        j['customAllowed'] ?? false,
        ((j['subcategories'] ?? []) as List)
            .map((s) => Subcategory(s['id'] ?? '', s['name_en'] ?? '', s['name_hi'] ?? ''))
            .toList(),
      );
}

class Subcategory {
  Subcategory(this.id, this.nameEn, this.nameHi);
  final String id, nameEn, nameHi;
}

class CityModel {
  CityModel(this.id, this.nameEn, this.nameHi, this.state, this.lat, this.lng);
  final String id, nameEn, nameHi, state;
  final double lat, lng;

  factory CityModel.fromJson(Map<String, dynamic> j) => CityModel(
        j['id'] ?? '', j['name_en'] ?? '', j['name_hi'] ?? '', j['state'] ?? '',
        (j['lat'] ?? 0).toDouble(), (j['lng'] ?? 0).toDouble(),
      );
}

class ProviderModel {
  ProviderModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        name = j['name'] ?? '',
        businessName = j['businessName'] ?? '',
        categoryId = j['categoryId'] ?? '',
        categoryNameEn = j['categoryNameEn'] ?? '',
        categoryNameHi = j['categoryNameHi'] ?? '',
        categoryIcon = j['categoryIcon'] ?? 'wrench',
        categoryIconImage = j['categoryIconImage'] ?? '',
        customService = j['customService'] ?? '',
        phone = j['phone'] ?? '',
        whatsapp = j['whatsapp'] ?? j['phone'] ?? '',
        photo = j['photo'],
        about = j['about'] ?? '',
        skills = List<String>.from(j['skills'] ?? []),
        gallery = List<String>.from(j['gallery'] ?? []),
        videoLinks = ((j['videoLinks'] ?? []) as List)
            .map((v) => v is Map ? (v['url'] ?? '').toString() : v.toString())
            .toList(),
        priceHint = j['priceHint'] ?? '',
        addressLine = (j['address'] ?? {})['line1'] ?? '',
        area = (j['address'] ?? {})['area'] ?? '',
        cityId = (j['address'] ?? {})['cityId'] ?? '',
        stateName = (j['address'] ?? {})['state'] ?? '',
        districtName = (j['address'] ?? {})['district'] ?? '',
        lat = ((j['location'] ?? {})['lat'] ?? 0).toDouble(),
        lng = ((j['location'] ?? {})['lng'] ?? 0).toDouble(),
        isOpenNow = j['isOpenNow'] ?? true,
        verified = j['verified'] ?? '',
        ratingAvg = (j['ratingAvg'] ?? 0).toDouble(),
        ratingCount = j['ratingCount'] ?? 0,
        distance = j['distance'],
        distanceText = j['distanceText'] ?? '';

  final String id, name, businessName, categoryId, categoryNameEn, categoryNameHi, categoryIcon;
  final String categoryIconImage, customService;
  final String phone, whatsapp, about, priceHint, addressLine, area, cityId, stateName, districtName;
  final String? photo;
  final List<String> skills, gallery, videoLinks;
  final double lat, lng, ratingAvg;
  final bool isOpenNow;
  final String verified;
  final int ratingCount;
  final dynamic distance;
  final String distanceText;
}

class ReviewModel {
  ReviewModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        userName = j['userName'] ?? '',
        rating = (j['rating'] ?? 0).toDouble(),
        text = j['text'] ?? '',
        createdAt = j['createdAt'] ?? '';
  final String id, userName, text, createdAt;
  final double rating;
}

class LeadModel {
  LeadModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        userName = j['userName'] ?? '',
        type = j['type'] ?? 'call',
        createdAt = j['createdAt'] ?? '';
  final String id, userName, type, createdAt;
}

class MyListing {
  MyListing.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        name = j['name'] ?? '',
        businessName = j['businessName'] ?? '',
        categoryId = j['categoryId'] ?? '',
        verified = j['verified'] ?? '',
        ratingAvg = (j['ratingAvg'] ?? 0).toDouble(),
        ratingCount = j['ratingCount'] ?? 0,
        manualOpen = (j['availability'] ?? {})['manualOpen'] ?? true,
        leadCount = j['leadCount'] ?? 0,
        phone = j['phone'] ?? '';
  final String id, name, businessName, categoryId, verified, phone;
  final double ratingAvg;
  final int ratingCount, leadCount;
  bool manualOpen; // mutable — availability toggle updates it in-place
}

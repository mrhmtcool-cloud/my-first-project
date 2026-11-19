// widgets.dart — shared UI helpers (avatar, stars, badges, category icons/colours).
import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/i18n.dart';

const Map<String, Color> kCatColors = {
  'electrician': Color(0xFFF59E0B),
  'engineer': Color(0xFF0EA5E9),
  'tailor': Color(0xFFEC4899),
  'dry-cleaner': Color(0xFF8B5CF6),
  'raj-mistri': Color(0xFFB45309),
  'bhandara-catering': Color(0xFFDC2626),
  'plumber': Color(0xFF2563EB),
  'carpenter': Color(0xFF92400E),
  'painter': Color(0xFF7C3AED),
  'safai-karamchari': Color(0xFF059669),
  'ac-fridge-repair': Color(0xFF0891B2),
  'driver': Color(0xFF4F46E5),
  'mobile-repair': Color(0xFFE11D48),
  'beautician': Color(0xFFDB2777),
  'cook': Color(0xFFEA580C),
  'mali': Color(0xFF16A34A),
  'medical': Color(0xFFDC2626),
  'others': Color(0xFF64748B),
};

IconData catIcon(String icon) {
  switch (icon) {
    case 'bolt': return Icons.bolt;
    case 'helmet': return Icons.engineering;
    case 'scissors': return Icons.content_cut;
    case 'hanger': return Icons.dry_cleaning;
    case 'brick': return Icons.view_module;
    case 'pot': return Icons.soup_kitchen;
    case 'wrench': return Icons.build;
    case 'hammer': return Icons.construction;
    case 'brush': return Icons.format_paint;
    case 'broom': return Icons.cleaning_services;
    case 'snow': return Icons.ac_unit;
    case 'wheel': return Icons.directions_car;
    case 'mobile': return Icons.phone_android;
    case 'comb': return Icons.brush;
    case 'chef': return Icons.restaurant;
    case 'leaf': return Icons.park;
    case 'medical': return Icons.medical_services;
    case 'shirt': return Icons.checkroom;
    case 'toolbox': return Icons.handyman;
    default: return Icons.handyman;
  }
}

Color catColor(String categoryId) => kCatColors[categoryId] ?? const Color(0xFFF59E0B);

/// User-uploaded category icon images (white artwork — web/icons se copy kiye).
/// Web jaisa dikhe: colored rounded square + white icon.
const Map<String, String> kCatImages = {
  'tailor': 'assets/icons/cat-tailor-white.png',
  'beautician': 'assets/icons/cat-beautician-white.png',
  'medical': 'assets/icons/cat-medical-white.png',
};

Widget catIconWidget(String categoryId, String icon, {double size = 28, Color? color}) {
  final asset = kCatImages[categoryId];
  if (asset != null) {
    return Image.asset(asset, width: size, height: size, fit: BoxFit.contain);
  }
  return Icon(catIcon(icon), color: color ?? catColor(categoryId), size: size);
}

/// data:image/...;base64,... → MemoryImage; http(s) → NetworkImage; else null.
ImageProvider? dataUrlImage(String? s) {
  if (s == null || s.isEmpty) return null;
  if (s.startsWith('data:image')) {
    try {
      return MemoryImage(base64Decode(s.split(',').last));
    } catch (_) {
      return null;
    }
  }
  return NetworkImage(s);
}

/// Low-bandwidth monogram avatar (no image download) — same as web.
Widget monogramAvatar(String name, String categoryId, {String? photo, double size = 56}) {
  final img = dataUrlImage(photo);
  if (img != null) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image(image: img, width: size, height: size, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => monogramAvatar(name, categoryId, size: size)),
    );
  }
  final color = catColor(categoryId);
  final initials = name.trim().isEmpty
      ? '?'
      : name.trim().split(RegExp(r'\s+')).map((w) => w[0]).take(2).join().toUpperCase();
  return Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color.withOpacity(0.16),
      borderRadius: BorderRadius.circular(12),
    ),
    alignment: Alignment.center,
    child: Text(initials,
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: size * 0.34)),
  );
}

Widget starsRow(double avg, int count, {double fontSize = 12}) {
  final full = avg.round();
  return Row(mainAxisSize: MainAxisSize.min, children: [
    Text(List.filled(full.clamp(0, 5), '★').join() + List.filled((5 - full).clamp(0, 5), '☆').join(),
        style: TextStyle(color: const Color(0xFFB45309), fontSize: fontSize + 1)),
    const SizedBox(width: 4),
    Text('${avg.toStringAsFixed(1)}', style: TextStyle(fontWeight: FontWeight.w700, fontSize: fontSize)),
    Text('  ($count ${t('reviews')})',
        style: TextStyle(color: const Color(0xFFA8A29E), fontSize: fontSize - 1)),
  ]);
}

Widget statusBadge(String verified) {
  if (verified == 'verified') {
    return _badge(t('verified'), const Color(0xFFFEF3C7), const Color(0xFFB45309));
  }
  if (verified == 'pending') {
    return _badge(t('pending'), const Color(0xFFFEE2E2), const Color(0xFFDC2626));
  }
  return _badge(t('rejected'), const Color(0xFFE7E5E4), const Color(0xFF57534E));
}

Widget openBadge(bool isOpen) => isOpen
    ? _badge(t('open'), const Color(0xFFD1FAE5), const Color(0xFF059669))
    : _badge(t('closed'), const Color(0xFFE7E5E4), const Color(0xFF57534E));

Widget _badge(String text, Color bg, Color fg) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700)),
    );

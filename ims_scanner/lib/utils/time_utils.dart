import 'package:flutter/material.dart';

/// Convert UTC DateTime to East Africa Time (EAT, UTC+3)
DateTime toEAT(DateTime utcTime) => utcTime.add(const Duration(hours: 3));

/// Format EAT time as HH:MM
String formatEATTime(DateTime utcTime) {
  final eat = toEAT(utcTime);
  return '${eat.hour.toString().padLeft(2, '0')}:${eat.minute.toString().padLeft(2, '0')}';
}

/// Format EAT date as DD/MM/YYYY
String formatEATDate(DateTime utcTime) {
  final eat = toEAT(utcTime);
  return '${eat.day}/${eat.month}/${eat.year}';
}
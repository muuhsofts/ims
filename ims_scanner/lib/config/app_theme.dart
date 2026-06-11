import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color dark = Color(0xFF002B49);
  static const Color primaryColor = Color(0xFF006B5E);      // Teal
  static const Color secondaryColor = Color(0xFFF5A623);    // Gold
  static const Color accentColor = Color(0xFF00A896);
  static const Color light = Color(0xFFFFFFFF);
  static const Color sea = Color(0xFF004472);
  static const Color sky = Color(0xFFE9EBEF);
  static const Color wave = Color(0xFFD1E7F6);
  static const Color rain = Color(0xFFCCDDE9);
  static const Color middle = Color(0xFFD7DFE6);
  static const Color black = Color(0xFF13191D);
  static const Color salat = Color(0xFF21AE8C);

  // Additional colors
  static const Color errorColor = Colors.red;
  static const Color successColor = salat;
  static const Color warningColor = secondaryColor; // Gold as warning

  // Border color constant (for const Divider)
  static const Color borderLightColor = Color(0xFFE2E8F0);

  // Background and text colors
  static Color get backgroundColor => light;
  static Color get surfaceColor => light;
  static Color get surfaceWhite => light;          // added
  static Color get textColor => black;
  static Color get greyText => Colors.grey.shade600;
  static Color get borderLight => Colors.grey.shade300; // non‑constant, for dynamic use
  static Color get darkText => black;
  static Color get backgroundLight => light;

  // Text styles
  static TextStyle get bodyText => GoogleFonts.poppins(
    fontSize: 14,
    color: greyText,
  );
  static TextStyle get headline2 => GoogleFonts.poppins(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: darkText,
  );
  static TextStyle get buttonText => GoogleFonts.poppins( // added
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: light,
  );

  static BoxDecoration cardDecoration({double radius = 16}) {
    return BoxDecoration(
      color: light,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderLight, width: 1),
      boxShadow: [
        BoxShadow(
          color: Colors.grey.withOpacity(0.08),
          spreadRadius: 1,
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  static InputDecoration inputDecoration({
    String? label,
    IconData? prefixIcon,
    Widget? suffixIcon,
    String? hint,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: primaryColor) : null,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: light,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: sea, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: GoogleFonts.poppins(color: Colors.grey.shade600, fontSize: 14),
    );
  }

  static ThemeData lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: primaryColor,
    scaffoldBackgroundColor: backgroundColor,
    colorScheme: const ColorScheme.light(
      primary: sea,
      secondary: salat,
      error: Colors.red,
      surface: light,
    ),
    textTheme: GoogleFonts.poppinsTextTheme().copyWith(
      bodyLarge: GoogleFonts.poppins(color: textColor),
      bodyMedium: GoogleFonts.poppins(color: textColor),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: backgroundColor,
      foregroundColor: black,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.poppins(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: black,
      ),
      iconTheme: const IconThemeData(color: black),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: light,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: sea, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: GoogleFonts.poppins(color: Colors.grey.shade600, fontSize: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: sea,
        foregroundColor: light,
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: sea,
        side: const BorderSide(color: sea),
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    cardTheme: const CardThemeData(  // fixed: CardThemeData not CardTheme
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      color: light,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: sea,
      unselectedItemColor: Colors.grey,
      backgroundColor: light,
      elevation: 8,
    ),
  );
}
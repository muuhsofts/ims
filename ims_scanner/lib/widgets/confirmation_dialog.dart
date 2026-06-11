import 'package:flutter/material.dart';
import '../config/app_theme.dart';

Future<bool?> showConfirmationDialog(
    BuildContext context, {
      required String title,
      required String message,
      String confirmText = 'Confirm',
      String cancelText = 'Cancel',
    }) {
  return showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text(cancelText),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, true),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
          child: Text(confirmText),
        ),
      ],
    ),
  );
}
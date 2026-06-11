import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/app_routes.dart';
import '../../providers/product_provider.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _isProcessing = false;
  final TextEditingController _imeiController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Auto‑start the scanner as soon as the screen is loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scannerController.start();
    });
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _imeiController.dispose();
    super.dispose();
  }

  Future<void> _handleScan(String code) async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);
    final product = await context.read<ProductProvider>().scanImei(code);
    setState(() => _isProcessing = false);
    if (product != null && mounted) {
      Navigator.pushNamed(context, AppRoutes.productDetail, arguments: product);
    } else if (mounted) {
      _showNotFoundDialog(code);
    }
  }

  void _showNotFoundDialog(String code) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Product Not Found'),
        content: Text('No product with IMEI: $code'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, AppRoutes.createProduct, arguments: {'imei': code});
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
            child: const Text('Add New'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('Scan IMEI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.pause),
            onPressed: () => _scannerController.stop(),
          ),
          IconButton(
            icon: const Icon(Icons.play_arrow),
            onPressed: () => _scannerController.start(),
          ),
        ],
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.darkText,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: AppTheme.primaryColor.withOpacity(0.05),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: AppTheme.primaryColor),
                const SizedBox(width: 12),
                Expanded(child: Text('Scan IMEI barcode on product', style: AppTheme.bodyText)),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: (capture) {
                    final barcode = capture.barcodes.first;
                    if (barcode.rawValue != null && !_isProcessing) {
                      _handleScan(barcode.rawValue!);
                    }
                  },
                ),
                if (_isProcessing)
                  Container(color: Colors.black.withOpacity(0.5), child: const Center(child: CircularProgressIndicator())),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: () {
                _imeiController.clear();
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Enter IMEI'),
                    content: TextField(
                      controller: _imeiController,
                      decoration: AppTheme.inputDecoration(hint: 'IMEI number'),
                      autofocus: true,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                      ElevatedButton(
                        onPressed: () {
                          final imei = _imeiController.text.trim();
                          Navigator.pop(ctx);
                          if (imei.isNotEmpty) _handleScan(imei);
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                        child: const Text('Search'),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.keyboard),
              label: const Text('Enter IMEI Manually'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: AppTheme.primaryColor),
                foregroundColor: AppTheme.primaryColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
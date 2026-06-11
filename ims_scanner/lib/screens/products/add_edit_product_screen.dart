import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../models/product_model.dart';
import '../../providers/product_provider.dart';
import '../../providers/product_category_provider.dart';
import '../../widgets/loading_overlay.dart';

class AddEditProductScreen extends StatefulWidget {
  final Product? product;
  final String? preScannedImei;

  const AddEditProductScreen({super.key, this.product, this.preScannedImei});

  @override
  State<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends State<AddEditProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _manualImeiController = TextEditingController();
  List<String> _imeiList = [];
  bool _isLoading = false;
  bool _isScanning = false;
  File? _imageFile;

  String? _selectedCategoryId;
  String? _selectedSku;
  double _buyingPrice = 0;
  double _sellingPrice = 0;
  String _status = 'active';

  final MobileScannerController _scannerController = MobileScannerController();

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _selectedCategoryId = widget.product!.categoryId;
      _selectedSku = widget.product!.sku;
      _imeiList = [widget.product!.imei ?? ''];
      _buyingPrice = widget.product!.buyingPrice;
      _sellingPrice = widget.product!.sellingPrice;
      _status = widget.product!.status;
    } else if (widget.preScannedImei != null) {
      _imeiList = [widget.preScannedImei!];
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductCategoryProvider>().loadDropdownCategories();
    });
  }

  @override
  void dispose() {
    _manualImeiController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) setState(() => _imageFile = File(picked.path));
  }

  void _addManualImei() {
    final imei = _manualImeiController.text.trim();
    if (imei.isEmpty) return;
    if (_imeiList.contains(imei)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('IMEI already added')));
      return;
    }
    setState(() {
      _imeiList.add(imei);
      _manualImeiController.clear();
    });
  }

  void _removeImei(int index) => setState(() => _imeiList.removeAt(index));
  void _clearAllImeis() => setState(() => _imeiList.clear());

  Future<void> _startScanner() async {
    setState(() => _isScanning = true);
    try {
      await _scannerController.start();
    } catch (e) {
      setState(() => _isScanning = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera error or permission denied')));
    }
  }

  void _stopScanner() {
    _scannerController.stop();
    setState(() => _isScanning = false);
  }

  void _onScanComplete(BarcodeCapture capture) {
    final barcode = capture.barcodes.first;
    if (barcode.rawValue != null) {
      final imei = barcode.rawValue!;
      if (!_imeiList.contains(imei)) {
        setState(() => _imeiList.add(imei));
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Added: $imei')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('IMEI already in list')));
      }
      _stopScanner();
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a category')));
      return;
    }
    if (_selectedSku == null || _selectedSku!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select an SKU')));
      return;
    }
    if (_imeiList.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least one IMEI')));
      return;
    }
    if (_buyingPrice <= 0 || _sellingPrice <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Prices must be > 0')));
      return;
    }

    setState(() => _isLoading = true);
    final provider = context.read<ProductProvider>();

    bool success;
    if (widget.product != null) {
      final formData = ProductFormData(
        categoryId: _selectedCategoryId!,
        imei: _imeiList.isNotEmpty ? _imeiList[0] : null,
        sku: _selectedSku,
        color: null,
        buyingPrice: _buyingPrice,
        sellingPrice: _sellingPrice,
        status: _status,
        stockStatus: widget.product!.stockStatus,
      );
      success = await provider.updateProduct(widget.product!.productId, formData, imageFile: _imageFile);
    } else {
      success = await provider.createBulkProduct(
        categoryId: _selectedCategoryId!,
        sku: _selectedSku!,
        imeis: _imeiList,
        buyingPrice: _buyingPrice,
        sellingPrice: _sellingPrice,
        status: _status,
        imageFile: _imageFile,
      );
    }

    setState(() => _isLoading = false);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(widget.product != null ? 'Product updated' : '${_imeiList.length} product(s) created'),
        backgroundColor: AppTheme.successColor,
      ));
      Navigator.pop(context, true);
    } else if (mounted && provider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(provider.errorMessage!),
        backgroundColor: AppTheme.errorColor,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoryProvider = context.watch<ProductCategoryProvider>();
    final categories = categoryProvider.dropdownCategories;
    final selectedCategory = categories.firstWhere(
          (c) => c['value'] == _selectedCategoryId,
      orElse: () => {},
    );
    // Use the 'skus' array from the API
    final skusRaw = selectedCategory['skus'];
    final List<String> skuList = (skusRaw is List)
        ? skusRaw.map((e) => e.toString()).toList()
        : [];

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text(widget.product != null ? 'Edit Product' : 'Add Products'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.darkText,
      ),
      body: LoadingOverlay(
        isLoading: _isLoading || categoryProvider.isLoading,
        child: _isScanning
            ? _buildScannerOverlay()
            : SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                _buildCategoryDropdown(categories),
                const SizedBox(height: 16),
                if (skuList.isNotEmpty) _buildSkuSelector(skuList),
                const SizedBox(height: 16),
                _buildPricesRow(),
                const SizedBox(height: 16),
                _buildImeiSection(),
                const SizedBox(height: 16),
                _buildStatusDropdown(),
                const SizedBox(height: 16),
                _buildImagePicker(),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    widget.product != null ? 'Update Product' : 'Create ${_imeiList.length} Product(s)',
                    style: AppTheme.buttonText,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Category dropdown using the API's pre‑formatted 'label'
  Widget _buildCategoryDropdown(List<Map<String, dynamic>> categories) {
    return DropdownButtonFormField<String>(
      value: _selectedCategoryId,
      decoration: AppTheme.inputDecoration(label: 'Category *'),
      isExpanded: true,
      items: categories.map((cat) {
        final categoryId = cat['value'].toString();
        final displayLabel = cat['label'] ?? cat['name'] ?? '';
        return DropdownMenuItem<String>(
          value: categoryId,
          child: Text(displayLabel),
        );
      }).toList(),
      onChanged: (val) {
        setState(() {
          _selectedCategoryId = val;
          _selectedSku = null;
        });
      },
      validator: (v) => v == null ? 'Select category' : null,
    );
  }

  // SKU selector – chips act like checkboxes (single selection)
  Widget _buildSkuSelector(List<String> skuList) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: skuList.map((sku) {
        final isSelected = _selectedSku == sku;
        return FilterChip(
          label: Text(sku),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              _selectedSku = selected ? sku : null;
            });
          },
          backgroundColor: AppTheme.surfaceWhite,
          selectedColor: AppTheme.primaryColor,
          labelStyle: TextStyle(color: isSelected ? Colors.white : AppTheme.darkText),
          avatar: isSelected ? const Icon(Icons.check, size: 18, color: Colors.white) : null,
        );
      }).toList(),
    );
  }

  Widget _buildPricesRow() {
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            initialValue: _buyingPrice > 0 ? _buyingPrice.toString() : '',
            keyboardType: TextInputType.number,
            decoration: AppTheme.inputDecoration(label: 'Buying Price *', prefixIcon: Icons.attach_money),
            onChanged: (v) => _buyingPrice = double.tryParse(v) ?? 0,
            validator: (v) => v == null || double.tryParse(v) == null ? 'Valid price required' : null,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: TextFormField(
            initialValue: _sellingPrice > 0 ? _sellingPrice.toString() : '',
            keyboardType: TextInputType.number,
            decoration: AppTheme.inputDecoration(label: 'Selling Price *', prefixIcon: Icons.price_change),
            onChanged: (v) => _sellingPrice = double.tryParse(v) ?? 0,
            validator: (v) => v == null || double.tryParse(v) == null ? 'Valid price required' : null,
          ),
        ),
      ],
    );
  }

  Widget _buildImeiSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _manualImeiController,
                decoration: AppTheme.inputDecoration(label: 'Manual IMEI', prefixIcon: Icons.sim_card),
                onFieldSubmitted: (_) => _addManualImei(),
              ),
            ),
            IconButton(onPressed: _addManualImei, icon: const Icon(Icons.add), color: AppTheme.primaryColor),
            IconButton(
              onPressed: _imeiList.isEmpty ? null : _clearAllImeis,
              icon: const Icon(Icons.clear_all),
              color: AppTheme.errorColor,
            ),
            IconButton(
              onPressed: _startScanner,
              icon: const Icon(Icons.qr_code_scanner),
              color: AppTheme.primaryColor,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_imeiList.isNotEmpty)
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.borderLight),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _imeiList.length,
              itemBuilder: (ctx, idx) => ListTile(
                dense: true,
                leading: Text('${idx + 1}'),
                title: Text(_imeiList[idx], style: const TextStyle(fontFamily: 'monospace')),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20),
                  onPressed: () => _removeImei(idx),
                ),
              ),
            ),
          ),
        if (_imeiList.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(child: Text('No IMEIs added. Use manual entry or QR scan.')),
          ),
      ],
    );
  }

  Widget _buildStatusDropdown() {
    return DropdownButtonFormField<String>(
      value: _status,
      decoration: AppTheme.inputDecoration(label: 'Status'),
      items: ['active', 'inactive', 'sold', 'damaged']
          .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
          .toList(),
      onChanged: (v) => setState(() => _status = v!),
    );
  }

  Widget _buildImagePicker() {
    return GestureDetector(
      onTap: _pickImage,
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderLight),
          color: AppTheme.surfaceWhite,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: _imageFile != null
              ? Image.file(_imageFile!, fit: BoxFit.cover)
              : widget.product?.imageFile != null
              ? Image.network(widget.product!.imageFile!, fit: BoxFit.cover)
              : Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add_photo_alternate, color: AppTheme.greyText),
                const SizedBox(height: 8),
                Text('Tap to add product image', style: AppTheme.bodyText),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScannerOverlay() {
    return Stack(
      children: [
        Container(color: Colors.black.withOpacity(0.85)),
        Center(
          child: Container(
            width: MediaQuery.of(context).size.width * 0.85,
            height: MediaQuery.of(context).size.width * 0.85,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [BoxShadow(color: AppTheme.primaryColor.withOpacity(0.5), blurRadius: 20, spreadRadius: 2)],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: MobileScanner(
                controller: _scannerController,
                onDetect: _onScanComplete,
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 40,
          left: 0,
          right: 0,
          child: Center(
            child: ElevatedButton.icon(
              onPressed: _stopScanner,
              icon: const Icon(Icons.close),
              label: const Text('Cancel Scan'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ),
        ),
        Positioned(
          top: 60,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), borderRadius: BorderRadius.circular(20)),
              child: const Text('Align IMEI barcode inside the frame', style: TextStyle(color: Colors.white)),
            ),
          ),
        ),
      ],
    );
  }
}
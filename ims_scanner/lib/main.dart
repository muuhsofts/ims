import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'config/app_routes.dart';
import 'models/product_model.dart';
import 'providers/auth_provider.dart';
import 'providers/product_provider.dart';
import 'providers/product_category_provider.dart';
import 'providers/dashboard_provider.dart';   // <-- add this
import 'services/storage_service.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/products/products_screen.dart';
import 'screens/products/add_edit_product_screen.dart';
import 'screens/products/product_detail_screen.dart';
import 'screens/categories/categories_screen.dart';
import 'screens/scan/scan_screen.dart';
import 'screens/profile/profile_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => ProductCategoryProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()), // new
      ],
      child: MaterialApp(
        title: 'Mobile Scanner',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        initialRoute: AppRoutes.splash,
        onGenerateRoute: (settings) {
          switch (settings.name) {
            case AppRoutes.splash:
              return MaterialPageRoute(builder: (_) => const SplashScreen());
            case AppRoutes.login:
              return MaterialPageRoute(builder: (_) => const LoginScreen());
            case AppRoutes.forgotPassword:
              return MaterialPageRoute(builder: (_) => const ForgotPasswordScreen());
            case AppRoutes.resetPassword:
              final email = settings.arguments as String;
              return MaterialPageRoute(builder: (_) => ResetPasswordScreen(email: email));
            case AppRoutes.dashboard:
              return MaterialPageRoute(builder: (_) => const DashboardScreen());
            case AppRoutes.products:
              return MaterialPageRoute(builder: (_) => const ProductsScreen());
            case AppRoutes.createProduct:
              final args = settings.arguments as Map<String, dynamic>?;
              return MaterialPageRoute(builder: (_) => AddEditProductScreen(preScannedImei: args?['imei']));
            case AppRoutes.editProduct:
              final product = settings.arguments as Product;
              return MaterialPageRoute(builder: (_) => AddEditProductScreen(product: product));
            case AppRoutes.productDetail:
              final product = settings.arguments as Product;
              return MaterialPageRoute(builder: (_) => ProductDetailScreen(product: product));
            case AppRoutes.categories:
              return MaterialPageRoute(builder: (_) => const CategoriesScreen());
            case AppRoutes.scan:
              return MaterialPageRoute(builder: (_) => const ScanScreen());
            case AppRoutes.profile:
              return MaterialPageRoute(builder: (_) => const ProfileScreen());
            default:
              return MaterialPageRoute(builder: (_) => const SplashScreen());
          }
        },
      ),
    );
  }
}
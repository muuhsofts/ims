<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\UserSessionController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\AuditTrailController;
use App\Http\Controllers\Api\FailedLoginAttemptController;
use App\Http\Controllers\Api\OTPController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\TransferRequestController;
use App\Http\Controllers\Api\CollectionCenterController;
use App\Http\Controllers\Api\CollectionCenterInventoryController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\DistributionController;
use App\Http\Controllers\Api\AgentSalesController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DashboardAnalyticsReportController;
use App\Http\Controllers\Api\AgentAnalyticsReportController;
use App\Http\Controllers\Api\BranchOwnerAnalyticsReportController;
use App\Http\Controllers\Api\BranchOwnerReportController;
/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

/*
|--------------------------------------------------------------------------
| v1 – Authentication, Users, Roles, Audit, OTP, Failed Logins
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->group(function () {

    // ====================== PUBLIC ROUTES ======================
    // These are open to everyone (no auth required)

    // Public Auth Routes - Strict rate limiting
    Route::prefix('auth')->middleware('throttle:auth')->group(function () {
        Route::post('register',        [AuthController::class, 'register']);
        Route::post('login',           [AuthController::class, 'login']);
        Route::post('verify-otp',      [AuthController::class, 'verifyOTP']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password',  [AuthController::class, 'resetPassword']);
    });

    // Public Verification Routes - Strict rate limiting
    Route::prefix('verification')->middleware('throttle:auth')->group(function () {
        Route::post('send-otp',     [VerificationController::class, 'sendOTP']);
        Route::post('verify',       [VerificationController::class, 'verifyWithOTP']);
        Route::post('verify-token', [VerificationController::class, 'verifyByToken']);
        Route::post('resend-otp',   [VerificationController::class, 'resendOTP']);
        Route::get('status',        [VerificationController::class, 'checkStatus']);
    });

    // ====================== PROTECTED ROUTES ======================
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

        // Auth (me, logout, profile)
        Route::prefix('auth')->group(function () {
            Route::post('logout',          [AuthController::class, 'logout']);
            Route::get('me',               [AuthController::class, 'me']);
            Route::put('profile',          [AuthController::class, 'updateProfile']);
            Route::post('change-password', [AuthController::class, 'changePassword']);
            Route::get('permissions',      [AuthController::class, 'permissions']);
        });

        // Sessions
        Route::prefix('sessions')->group(function () {
            Route::get('/',          [UserSessionController::class, 'index']);
            Route::delete('/all',    [UserSessionController::class, 'destroyAll']);
            Route::delete('/others', [UserSessionController::class, 'destroyOthers']);
            Route::delete('/{id}',   [UserSessionController::class, 'destroy']);
        });

        // Users
        Route::prefix('users')->group(function () {
    Route::get('/trashed',              [UserManagementController::class, 'trashed']);
     // Restore and force delete – these are fine where they are (more specific)
    Route::patch('/{id}/restore',       [UserManagementController::class, 'restore']);
    Route::post('/{id}/resend-otp', [UserManagementController::class, 'resendOtp']);
    Route::delete('/{id}/force',        [UserManagementController::class, 'forceDelete']);
    Route::get('/dropdown', [UserManagementController::class, 'Userdropdown']);
    Route::get('/sales-agents/dropdown', [UserManagementController::class, 'salesAgentDropdown']);

    Route::get('/',                     [UserManagementController::class, 'index']);
    Route::post('/',                    [UserManagementController::class, 'store']);
    Route::get('/stats',                [UserManagementController::class, 'stats']);
    Route::get('/{id}',                 [UserManagementController::class, 'show']);
    Route::put('/{id}',                 [UserManagementController::class, 'update']);
    Route::delete('/{id}',              [UserManagementController::class, 'destroy']);
    Route::patch('/{id}/activate',      [UserManagementController::class, 'activate']);
    Route::patch('/{id}/deactivate',    [UserManagementController::class, 'deactivate']);
    Route::patch('/{id}/suspend',       [UserManagementController::class, 'suspend']);
    Route::patch('/{id}/role',          [UserManagementController::class, 'assignRole']);
    Route::post('/{id}/reset-password', [UserManagementController::class, 'resetUserPassword']);
    Route::post('/{id}/resend-otp',     [UserManagementController::class, 'resendOtp']);

   
});

        // Roles & Permissions
        Route::prefix('roles')->group(function () {
            Route::get('/',                         [RolePermissionController::class, 'index']);
            Route::post('/',                        [RolePermissionController::class, 'store']);
            Route::get('/dropdown',                 [RolePermissionController::class, 'getRolesDropdown']);
            Route::get('/stats',                    [RolePermissionController::class, 'getStats']);
            Route::get('/{id}',                     [RolePermissionController::class, 'show']);
            Route::put('/{id}',                     [RolePermissionController::class, 'update']);
            Route::delete('/{id}',                  [RolePermissionController::class, 'destroy']);
            Route::get('/{id}/permissions',         [RolePermissionController::class, 'getRolePermissions']);
            Route::post('/{id}/permissions/assign', [RolePermissionController::class, 'assignPermissionsToRole']);
            Route::post('/{id}/permissions/sync',   [RolePermissionController::class, 'syncRolePermissions']);
            Route::post('/{id}/permissions/revoke', [RolePermissionController::class, 'revokePermissionFromRole']);
        });

        Route::prefix('permissions')->group(function () {
            Route::get('/',        [RolePermissionController::class, 'getPermissions']);
            Route::post('/',       [RolePermissionController::class, 'createPermission']);
            Route::get('/{id}',    [RolePermissionController::class, 'getPermission']);
            Route::put('/{id}',    [RolePermissionController::class, 'updatePermission']);
            Route::delete('/{id}', [RolePermissionController::class, 'deletePermission']);
        });

        // Audit Trails
        Route::prefix('audit-trails')->group(function () {
            Route::get('/',             [AuditTrailController::class, 'index']);
            Route::get('/stats',        [AuditTrailController::class, 'stats']);
            Route::get('/modules',      [AuditTrailController::class, 'getModules']);
            Route::get('/actions',      [AuditTrailController::class, 'getActions']);
            Route::get('/export/csv',   [AuditTrailController::class, 'exportCsv']);
            Route::get('/export/excel', [AuditTrailController::class, 'exportExcel']);
            Route::get('/export/pdf',   [AuditTrailController::class, 'exportPdf']);
        });

        // Failed Login Attempts
        Route::prefix('failed-logins')->group(function () {
            Route::get('/',         [FailedLoginAttemptController::class, 'index']);
            Route::delete('/clear', [FailedLoginAttemptController::class, 'clear']);
            Route::post('/block',   [FailedLoginAttemptController::class, 'block']);
            Route::post('/unblock', [FailedLoginAttemptController::class, 'unblock']);
        });

        // OTP Management
        Route::prefix('otps')->group(function () {
            Route::get('/',                [OTPController::class, 'index']);
            Route::get('/stats',           [OTPController::class, 'stats']);
            Route::delete('/cleanup',      [OTPController::class, 'cleanup']);
            Route::delete('/cleanup-used', [OTPController::class, 'cleanupUsed']);
        });

    }); // End Protected Routes (auth:sanctum + throttle:api)
}); // End v1

/*
|--------------------------------------------------------------------------
| v2 to v14 – Protected Resource Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // v2 – Product Categories
   Route::prefix('v2')->group(function () {
    Route::prefix('product-categories')->group(function () {

        // Fixed method name (typo corrected)
        Route::get('/dropdown', [ProductCategoryController::class, 'productCategoryDropdown']);

        Route::get('/',          [ProductCategoryController::class, 'index']);
        Route::post('/',         [ProductCategoryController::class, 'store']);
        Route::get('/{id}',      [ProductCategoryController::class, 'show']);
        Route::put('/{id}',      [ProductCategoryController::class, 'update']);
        Route::delete('/{id}',   [ProductCategoryController::class, 'destroy']);
        Route::patch('/{id}/activate',   [ProductCategoryController::class, 'activate']);
        Route::patch('/{id}/deactivate', [ProductCategoryController::class, 'deactivate']);
        Route::patch('/{id}/toggle-status', [ProductCategoryController::class, 'toggleStatus']);
    });
});

    // v3 – Products
    // v3 – Products
Route::prefix('v3')->group(function () {
    Route::prefix('products')->group(function () {
        Route::get('/dropdown',               [ProductController::class, 'Productdropdown']);     
        Route::get('/scan/imei/{imei}',       [ProductController::class, 'scanByImei']);
        Route::post('/scan/imei',             [ProductController::class, 'scanImeiPost']);
        Route::patch('/{id}/assign-imei',     [ProductController::class, 'assignImei']);
        Route::get('/',                       [ProductController::class, 'index']);
        Route::post('/',                      [ProductController::class, 'store']);
        Route::get('/{id}',                   [ProductController::class, 'show']);
        Route::put('/{id}',                   [ProductController::class, 'update']);
        Route::delete('/{id}',                [ProductController::class, 'destroy']);
        Route::patch('/{id}/restore',         [ProductController::class, 'restore']);
        Route::delete('/{id}/force',          [ProductController::class, 'forceDelete']);
        Route::patch('/{id}/status',          [ProductController::class, 'changeStatus']);
    });
});

    // v4 – Suppliers
    Route::prefix('v4')->group(function () {
        Route::prefix('suppliers')->group(function () {

            Route::get('/dropdown', [SupplierController::class, 'Suppliersdropdown']);

            Route::get('/',                     [SupplierController::class, 'index']);
            Route::post('/',                    [SupplierController::class, 'store']);
            Route::get('/{id}',                 [SupplierController::class, 'show']);
            Route::put('/{id}',                 [SupplierController::class, 'update']);
            Route::delete('/{id}',              [SupplierController::class, 'destroy']);
            Route::patch('/{id}/restore',       [SupplierController::class, 'restore']);
            Route::delete('/{id}/force',        [SupplierController::class, 'forceDelete']);
            Route::patch('/{id}/status',        [SupplierController::class, 'changeStatus']);
        });
    });

    // v5 – Warehouses
Route::prefix('v5')->group(function () {
    Route::prefix('warehouses')->group(function () {
        Route::get('/dropdown',             [WarehouseController::class, 'Warehousesdropdown']);  
        Route::get('/',                     [WarehouseController::class, 'index']);
        Route::post('/',                    [WarehouseController::class, 'store']);
        Route::get('/{id}',                 [WarehouseController::class, 'show']);
        Route::put('/{id}',                 [WarehouseController::class, 'update']);
        Route::delete('/{id}',              [WarehouseController::class, 'destroy']);
        Route::patch('/{id}/restore',       [WarehouseController::class, 'restore']);
        Route::delete('/{id}/force',        [WarehouseController::class, 'forceDelete']);
        Route::patch('/{id}/status',        [WarehouseController::class, 'changeStatus']);
    });
});

    // v6 – Purchases
    Route::prefix('v6')->group(function () {
        Route::prefix('purchases')->group(function () {
            Route::get('/',                     [PurchaseController::class, 'index']);
            Route::post('/',                    [PurchaseController::class, 'store']);
            Route::get('/{id}',                 [PurchaseController::class, 'show']);
            Route::put('/{id}',                 [PurchaseController::class, 'update']);
            Route::patch('/{id}/status',        [PurchaseController::class, 'updateStatus']);
            Route::delete('/{id}',              [PurchaseController::class, 'destroy']);
        });
    });

    // v7 – Inventory
     Route::prefix('v7')->group(function () {
    Route::prefix('inventory')->group(function () {
        Route::get('/product-in/inventory/dropdown', [ProductController::class, 'productsInInventoryDropdown']); 
        Route::get('/',                  [InventoryController::class, 'index']);
        Route::post('/',                 [InventoryController::class, 'store']);
        Route::get('/{id}',              [InventoryController::class, 'show']);
        Route::put('/{id}',              [InventoryController::class, 'update']);
        Route::delete('/{id}',           [InventoryController::class, 'destroy']);
    });
});

    // v8 – Transfer Requests
    Route::prefix('v8')->group(function () {
        Route::prefix('transfer-requests')->group(function () {
            Route::get('/',                     [TransferRequestController::class, 'index']);
            Route::post('/',                    [TransferRequestController::class, 'store']);
            Route::get('/{id}',                 [TransferRequestController::class, 'show']);
            Route::patch('/{id}/approve',       [TransferRequestController::class, 'approve']);
            Route::patch('/{id}/reject',        [TransferRequestController::class, 'reject']);
            Route::patch('/{id}/confirm',       [TransferRequestController::class, 'confirmReceived']);
            Route::delete('/{id}',              [TransferRequestController::class, 'destroy']);
            Route::get('/{id}/available-products', [TransferRequestController::class, 'availableProducts']);
            Route::post('/{id}/process',           [TransferRequestController::class, 'processTransfer']);
            Route::post('/{id}/scan-receipt',      [TransferRequestController::class, 'scanReceipt']);
        });
    });

         // v9 – Collection Centers & Stock
    Route::prefix('v9')->group(function () {
        
        // COLLECTION CENTERS
        Route::prefix('collection-centers')->group(function () {
            Route::get('/dropdown',             [CollectionCenterController::class, 'CCdropdown']);
            Route::get('/',                     [CollectionCenterController::class, 'index']);
            Route::post('/',                    [CollectionCenterController::class, 'store']);
            Route::get('/{id}',                 [CollectionCenterController::class, 'show']);
            Route::put('/{id}',                 [CollectionCenterController::class, 'update']);
            Route::delete('/{id}',              [CollectionCenterController::class, 'destroy']);
            Route::patch('/{id}/restore',       [CollectionCenterController::class, 'restore']);
        });

       // COLLECTION CENTER INVENTORIES
Route::prefix('collection-center-inventories')->group(function () {
    // Confirm receipt by ID (branch owner only)
    Route::post('/{id}/confirm', [CollectionCenterInventoryController::class, 'confirmInventoryReceipt']);

    // Confirm receipt for logged‑in owner's own center (no ID)
    Route::post('/my/confirm', [CollectionCenterInventoryController::class, 'confirmMyReceipt']);

    // ✅ NEW: Get products in the logged‑in branch owner's own collection centre
    Route::get('/my-products', [CollectionCenterInventoryController::class, 'getMyProductsDropdown']);

    // Other CRUD routes...
    Route::get('/', [CollectionCenterInventoryController::class, 'index']);
    Route::post('/', [CollectionCenterInventoryController::class, 'store']);
    Route::get('/{id}', [CollectionCenterInventoryController::class, 'show']);
    Route::put('/{id}', [CollectionCenterInventoryController::class, 'update']);
    Route::delete('/{id}', [CollectionCenterInventoryController::class, 'destroy']);
});

        // STOCK MOVEMENTS (only once)
        Route::prefix('stock-movements')->group(function () {
            Route::get('/',                     [StockMovementController::class, 'index']);
            Route::post('/',                    [StockMovementController::class, 'store']);
            Route::get('/{id}',                 [StockMovementController::class, 'show']);
            Route::put('/{id}',                 [StockMovementController::class, 'update']);
            Route::delete('/{id}',              [StockMovementController::class, 'destroy']);
        });
    });
    

    // v10 – Distributions
    Route::prefix('v10')->group(function () {
    Route::prefix('distributions')->group(function () {
        Route::get('/',                     [DistributionController::class, 'index']);
        Route::post('/',                    [DistributionController::class, 'store']);
        Route::get('/{id}',                 [DistributionController::class, 'show']);
        Route::patch('/{id}/confirm',       [DistributionController::class, 'confirmReceipt']);
        Route::post('/confirm-by-imei',     [DistributionController::class, 'confirmByImei']);
    });

    Route::get('/collection-center/stock',  [DistributionController::class, 'getAvailableStock']);
   });

    // v11 – Agent Sales
    Route::prefix('v11')->group(function () {
        Route::get('/agent/stock',          [AgentSalesController::class, 'availableStock']);
        Route::post('/agent/scan',          [AgentSalesController::class, 'scanProduct']);
        Route::post('/agent/sale-product',          [AgentSalesController::class, 'saleProduct']);
        Route::post('/agent/return',        [AgentSalesController::class, 'returnDamaged']);
        Route::get('/agent/sales',          [AgentSalesController::class, 'mySales']);
        Route::get('/agent/sales/{id}',     [AgentSalesController::class, 'showSale']);
    });

    // v12 – Customers
    Route::prefix('v12')->group(function () {
    Route::get('/customers/my', [CustomerController::class, 'myCustomers']);  
    Route::patch('/customers/{id}/restore', [CustomerController::class, 'restore']);
    Route::apiResource('customers', CustomerController::class);
});

    // v13 – Receipts
    Route::prefix('v13')->group(function () {
        Route::get('/receipts',           [ReceiptController::class, 'index']);
        Route::get('/receipts/{id}',      [ReceiptController::class, 'show']);
        Route::get('/receipts/order/{saleId}', [ReceiptController::class, 'bySale']);
    });
   
    // v14 – Reports & Dashboard
Route::prefix('v14')->group(function () {
    
   // Reports
    Route::prefix('reports')->group(function () {
        
        // Stock Reports
        Route::get('stock', [ReportController::class, 'stockReport']);
        
        // 🆕 Branch Owner Stock Reports
        Route::get('branch/stock', [BranchOwnerReportController::class, 'branchStockReport']);
        Route::get('branch/agent-stock', [BranchOwnerReportController::class, 'branchAgentStockReport']);
        Route::get('branch/agent-products', [BranchOwnerReportController::class, 'branchAgentProductsReport']);
        
        // Purchase Reports
        Route::get('purchases', [ReportController::class, 'purchasesReport']);
        
        // Sales Reports
        Route::get('sales', [ReportController::class, 'salesReport']);
        Route::get('sales/weekly', [ReportController::class, 'weeklySalesReport']);
        Route::get('sales/monthly', [ReportController::class, 'monthlySalesReport']);
        Route::get('sales/yearly', [ReportController::class, 'yearlySalesReport']);
        Route::get('sales/custom', [ReportController::class, 'customSalesReport']);
  

    });

    

    // Dashboard Analytics
    Route::prefix('analytics')->group(function () {
        Route::get('/dashboard', [DashboardAnalyticsReportController::class, 'index']);
         Route::get('/agent-dashboard', [AgentAnalyticsReportController::class, 'index']);
         Route::get('/branch-owner-dashboard', [BranchOwnerAnalyticsReportController::class, 'index']);

    });

});


    // v14 – Invoices
Route::prefix('v15')->group(function () {
    Route::get('/invoices',          [InvoiceController::class, 'index']);
    Route::get('/invoices/{id}',     [InvoiceController::class, 'show']);
    Route::get('/invoices/download/{id}', [InvoiceController::class, 'download']);
    Route::get('/invoices/sale/{saleId}', [InvoiceController::class, 'bySale']);
});
});
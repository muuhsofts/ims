<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\StockMovement;
use App\Models\ProductCategory;
use App\Models\CollectionCenter;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class StockMovementController extends BaseApiController
{
    use Auditable;

    /**
     * List stock movements with filters, search, pagination and full attributes.
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('stock_movements.view');
        if ($perm) return $perm;

        try {
            $query = StockMovement::with([
                'product.category',
                'performer',
                'request.requester',
                'collectionCenter'
            ]);

            // Simple filters
            if ($request->filled('product_id')) {
                $query->where('product_id', $request->product_id);
            }
            if ($request->filled('movement_type')) {
                $query->where('movement_type', $request->movement_type);
            }
            if ($request->filled('request_id')) {
                $query->where('request_id', $request->request_id);
            }
            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('notes', 'LIKE', "%{$search}%")
                      ->orWhere('movement_type', 'LIKE', "%{$search}%")
                      ->orWhereHas('product', function ($pq) use ($search) {
                          $pq->where('imei', 'LIKE', "%{$search}%")
                             ->orWhere('sku', 'LIKE', "%{$search}%")
                             ->orWhereHas('category', function ($cq) use ($search) {
                                 $cq->where('category_name', 'LIKE', "%{$search}%")
                                    ->orWhere('model', 'LIKE', "%{$search}%");
                             });
                      });
                });
            }

            $movements = $query->orderBy('created_at', 'desc')
                              ->paginate($request->get('per_page', 20));

            // ------------------------------------------------------------
            // 1. Map product SKU -> ProductCategory (brand + model)
            // ------------------------------------------------------------
            $skus = $movements->getCollection()
                ->pluck('product.sku')
                ->filter()
                ->unique()
                ->values()
                ->toArray();

            $skuToCategoryMap = [];
            if (!empty($skus)) {
                $matchedCategories = ProductCategory::where(function ($q) use ($skus) {
                    foreach ($skus as $sku) {
                        $q->orWhereJsonContains('sku', $sku);
                    }
                })->get(['sku', 'category_name', 'model']);

                foreach ($matchedCategories as $cat) {
                    $catSkus = is_array($cat->sku) ? $cat->sku : json_decode($cat->sku, true);
                    if (is_array($catSkus)) {
                        foreach ($catSkus as $catSku) {
                            if (!isset($skuToCategoryMap[$catSku])) {
                                $skuToCategoryMap[$catSku] = [
                                    'brand' => $cat->category_name,
                                    'model' => $cat->model,
                                ];
                            }
                        }
                    }
                }
            }

            // ------------------------------------------------------------
            // 2. Map Collection Center ID -> Requester Name (from users)
            // ------------------------------------------------------------
            $ccIds = $movements->getCollection()
                ->where('to_type', 'collection_center')
                ->pluck('to_id')
                ->filter()
                ->unique()
                ->values()
                ->toArray();

            $ccIdToUserName = [];
            if (!empty($ccIds)) {
                $centers = CollectionCenter::whereIn('cc_id', $ccIds)->with('owner')->get();
                foreach ($centers as $center) {
                    if ($center->owner && $center->owner->name) {
                        $ccIdToUserName[$center->cc_id] = $center->owner->name;
                    }
                }
                $remainingIds = array_diff($ccIds, array_keys($ccIdToUserName));
                if (!empty($remainingIds)) {
                    $users = User::whereIn('cc_id', $remainingIds)->whereNotNull('name')->get();
                    foreach ($users as $user) {
                        if (!isset($ccIdToUserName[$user->cc_id])) {
                            $ccIdToUserName[$user->cc_id] = $user->name;
                        }
                    }
                }
            }

            // ------------------------------------------------------------
            // 3. Transform each movement
            // ------------------------------------------------------------
            $data = $movements->through(function ($movement) use ($skuToCategoryMap, $ccIdToUserName) {
                $sku = $movement->product?->sku;
                $brand = null;
                $model = null;
                if ($sku && isset($skuToCategoryMap[$sku])) {
                    $brand = $skuToCategoryMap[$sku]['brand'];
                    $model = $skuToCategoryMap[$sku]['model'];
                }

                // Fallback to product's direct category if no SKU match
                if (!$brand) {
                    $brand = $movement->product?->category?->category_name ?? 'Unknown';
                }
                if (!$model) {
                    $model = $movement->product?->category?->model 
                          ?? $movement->product?->category?->category_name ?? 'Unknown';
                }

                // Determine requester name
                $requesterName = null;
                if ($movement->to_type === 'collection_center' && isset($ccIdToUserName[$movement->to_id])) {
                    $requesterName = $ccIdToUserName[$movement->to_id];
                } elseif ($movement->request && $movement->request->requester) {
                    $requesterName = $movement->request->requester->name;
                } elseif ($movement->request_id) {
                    $requesterName = 'Request #' . substr($movement->request_id, 0, 8);
                } else {
                    $requesterName = 'N/A';
                }

                return [
                    'movement_id'   => $movement->movement_id,
                    'request_id'    => $movement->request_id,
                    'product_id'    => $movement->product_id,
                    'reference_id'  => $movement->reference_id,

                    'product_name'  => $movement->product_display_name,
                    'imei'          => $movement->product?->imei,
                    'sku'           => $movement->product?->sku,
                    'brand'         => $brand,
                    'model'         => $model,

                    'movement_type'             => $movement->movement_type,
                    'movement_type_description' => $movement->movement_type_description,
                    'quantity'                  => $movement->quantity,

                    'from_type' => $movement->from_type,
                    'from_id'   => $movement->from_id,
                    'from_name' => $movement->from_name,
                    'to_type'   => $movement->to_type,
                    'to_id'     => $movement->to_id,
                    'to_name'   => $movement->to_name,

                    'performed_by'  => $movement->performer?->name,
                    'request_name'  => $requesterName,
                    'requester_name'=> $requesterName,

                    'created_at'    => $movement->created_at->format('Y-m-d H:i:s'),
                    'notes'         => $movement->notes,
                ];
            });

            return $this->successResponse([
                'current_page' => $movements->currentPage(),
                'data'         => $data->items(),
                'total'        => $movements->total(),
                'per_page'     => $movements->perPage(),
                'last_page'    => $movements->lastPage(),
            ], 'Stock movements retrieved');

        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch movements: ' . $e->getMessage());
        }
    }

    /**
     * Show a single stock movement with full details.
     */
    public function show($id)
    {
        $perm = $this->checkPermission('stock_movements.view');
        if ($perm) return $perm;

        try {
            $movement = StockMovement::with([
                'product.category',
                'performer',
                'request.requester',
                'collectionCenter'
            ])->findOrFail($id);

            $this->logAudit('view_stock_movement', 'stock_movement', $movement->movement_id, 'Viewed movement');

            $sku = $movement->product?->sku;
            $brand = null;
            $model = null;
            if ($sku) {
                $category = ProductCategory::whereJsonContains('sku', $sku)->first();
                if ($category) {
                    $brand = $category->category_name;
                    $model = $category->model;
                }
            }
            if (!$brand) {
                $brand = $movement->product?->category?->category_name ?? 'Unknown';
            }
            if (!$model) {
                $model = $movement->product?->category?->model 
                      ?? $movement->product?->category?->category_name ?? 'Unknown';
            }

            $requesterName = null;
            if ($movement->to_type === 'collection_center' && $movement->to_id) {
                $center = CollectionCenter::with('owner')->find($movement->to_id);
                if ($center && $center->owner && $center->owner->name) {
                    $requesterName = $center->owner->name;
                } else {
                    $user = User::where('cc_id', $movement->to_id)->first();
                    $requesterName = $user?->name;
                }
            }
            if (!$requesterName && $movement->request && $movement->request->requester) {
                $requesterName = $movement->request->requester->name;
            } elseif (!$requesterName && $movement->request_id) {
                $requesterName = 'Request #' . substr($movement->request_id, 0, 8);
            } else {
                $requesterName = 'N/A';
            }

            $transformed = [
                'movement_id'   => $movement->movement_id,
                'request_id'    => $movement->request_id,
                'product_id'    => $movement->product_id,
                'reference_id'  => $movement->reference_id,
                'product_name'  => $movement->product_display_name,
                'imei'          => $movement->product?->imei,
                'sku'           => $movement->product?->sku,
                'brand'         => $brand,
                'model'         => $model,
                'movement_type' => $movement->movement_type,
                'movement_type_description' => $movement->movement_type_description,
                'quantity'      => $movement->quantity,
                'from_type'     => $movement->from_type,
                'from_id'       => $movement->from_id,
                'from_name'     => $movement->from_name,
                'to_type'       => $movement->to_type,
                'to_id'         => $movement->to_id,
                'to_name'       => $movement->to_name,
                'performed_by'  => $movement->performer?->name,
                'request_name'  => $requesterName,
                'requester_name'=> $requesterName,
                'created_at'    => $movement->created_at->format('Y-m-d H:i:s'),
                'notes'         => $movement->notes,
            ];

            return $this->successResponse($transformed, 'Stock movement details');
        } catch (\Exception $e) {
            return $this->notFound('Movement not found');
        }
    }

    /**
     * Create a manual stock movement entry.
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('stock_movements.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $validated = $request->validate([
                'request_id'     => 'nullable|string|exists:transfer_requests,request_id',
                'product_id'     => 'required|string|exists:products,product_id',
                'from_type'      => 'required|in:warehouse,collection_center,sales_agent',
                'from_id'        => 'required|string',
                'to_type'        => 'required|in:warehouse,collection_center,sales_agent',
                'to_id'          => 'required|string',
                'quantity'       => 'required|integer|min:1',
                'movement_type'  => 'required|in:purchase,transfer,sale,return,adjustment,loss',
                'reference_id'   => 'nullable|string',
                'notes'          => 'nullable|string',
            ]);

            DB::beginTransaction();
            $movement = StockMovement::create([
                'request_id'    => $validated['request_id'] ?? null,
                'product_id'    => $validated['product_id'],
                'from_type'     => $validated['from_type'],
                'from_id'       => $validated['from_id'],
                'to_type'       => $validated['to_type'],
                'to_id'         => $validated['to_id'],
                'quantity'      => $validated['quantity'],
                'movement_type' => $validated['movement_type'],
                'reference_id'  => $validated['reference_id'] ?? null,
                'notes'         => $validated['notes'] ?? null,
                'performed_by'  => $authUser->id,
                'created_at'    => now(),
            ]);
            DB::commit();

            $this->logAudit('create_stock_movement', 'stock_movement', $movement->movement_id, "Created movement for product {$movement->product_id}");
            return $this->created($movement->load(['product', 'performer', 'request']), 'Stock movement created');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create movement: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing stock movement.
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('stock_movements.edit');
        if ($perm) return $perm;

        try {
            $movement = StockMovement::findOrFail($id);
            $validated = $request->validate([
                'request_id'     => 'nullable|string|exists:transfer_requests,request_id',
                'product_id'     => 'sometimes|string|exists:products,product_id',
                'from_type'      => 'sometimes|in:warehouse,collection_center,sales_agent',
                'from_id'        => 'sometimes|string',
                'to_type'        => 'sometimes|in:warehouse,collection_center,sales_agent',
                'to_id'          => 'sometimes|string',
                'quantity'       => 'sometimes|integer|min:1',
                'movement_type'  => 'sometimes|in:purchase,transfer,sale,return,adjustment,loss',
                'reference_id'   => 'nullable|string',
                'notes'          => 'nullable|string',
            ]);

            $movement->update($validated);
            $this->logAudit('update_stock_movement', 'stock_movement', $movement->movement_id, "Updated movement for product {$movement->product_id}");
            return $this->successResponse($movement->load(['product', 'performer', 'request']), 'Stock movement updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update movement: ' . $e->getMessage());
        }
    }

    /**
     * Delete a stock movement record.
     */
    public function destroy($id)
    {
        $perm = $this->checkPermission('stock_movements.delete');
        if ($perm) return $perm;

        try {
            $movement = StockMovement::findOrFail($id);
            $movement->delete();
            $this->logAudit('delete_stock_movement', 'stock_movement', $id, 'Deleted stock movement');
            return $this->successResponse(null, 'Stock movement deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete movement: ' . $e->getMessage());
        }
    }
}
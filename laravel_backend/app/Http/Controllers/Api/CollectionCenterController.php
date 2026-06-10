<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CollectionCenter;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class CollectionCenterController extends BaseApiController
{
    use Auditable;

    /**
     * List all collection centers
     * Permission: collection_centers.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('collection_centers.view');
        if ($perm) return $perm;

        try {
            $query = CollectionCenter::with('owner');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('cc_name', 'LIKE', "%{$search}%")
                      ->orWhere('location', 'LIKE', "%{$search}%");
                });
            }

            $centers = $query->orderBy('created_at', 'desc')
                ->paginate(15);

            return $this->successResponse($centers, 'Collection centers retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch collection centers');
        }
    }
    

    /**
 * Get collection centers as dropdown
 * Permission: collection_centers.view
 */
public function CCdropdown(Request $request)
{
    $perm = $this->checkPermission('collection_centers.view');
    if ($perm) return $perm;

    try {
        $centers = CollectionCenter::select('cc_id', 'cc_name', 'location')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn($q) => $q->where('cc_name', 'LIKE', "%{$s}%")
                                      ->orWhere('location', 'LIKE', "%{$s}%"));
            })
            ->orderBy('cc_name')
            ->get()
            ->map(fn($center) => [
                'id'    => $center->cc_id,
                'label' => $center->cc_name . ($center->location ? ' — ' . $center->location : ''),
            ]);

        return $this->successResponse($centers, 'Collection centers dropdown retrieved');
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch collection centers dropdown: ' . $e->getMessage());
    }
}

    /**
     * Show single center
     * Permission: collection_centers.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('collection_centers.view');
        if ($perm) return $perm;

        try {
            $center = CollectionCenter::with('owner')->findOrFail($id);
            return $this->successResponse($center, 'Collection center retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Collection center not found');
        }
    }

    /**
     * Create center (cc_name UNIQUE)
     * Permission: collection_centers.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('collection_centers.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $validated = $request->validate([
                'cc_name'  => 'required|string|max:255|unique:collection_centers,cc_name',
                'location' => 'nullable|string',
                'owner_id' => 'required|string|exists:users,id',
                'status'   => 'sometimes|in:active,inactive,on_maintenance',
            ]);

            DB::beginTransaction();

            $center = CollectionCenter::create([
                'cc_name'  => $validated['cc_name'],
                'location' => $validated['location'] ?? null,
                'owner_id' => $validated['owner_id'],
                'status'   => $validated['status'] ?? 'active',
            ]);

            DB::commit();

            $this->logAudit(
                'create_collection_center',
                'collection_center',
                $center->cc_id,
                "Created center: {$center->cc_name}"
            );

            return $this->created(
                $center->load('owner'),
                'Collection center created'
            );
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Update center (cc_name UNIQUE except current)
     * Permission: collection_centers.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('collection_centers.edit');
        if ($perm) return $perm;

        try {
            $center = CollectionCenter::findOrFail($id);

            $validated = $request->validate([
                'cc_name'  => 'sometimes|string|max:255|unique:collection_centers,cc_name,' . $center->cc_id . ',cc_id',
                'location' => 'nullable|string',
                'owner_id' => 'sometimes|string|exists:users,id',
                'status'   => 'sometimes|in:active,inactive,on_maintenance',
            ]);

            DB::beginTransaction();

            $center->update($validated);

            DB::commit();

            $this->logAudit(
                'update_collection_center',
                'collection_center',
                $center->cc_id,
                "Updated center: {$center->cc_name}"
            );

            return $this->successResponse(
                $center->load('owner'),
                'Collection center updated'
            );
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Soft delete center
     * Permission: collection_centers.delete
     */
    public function destroy($id)
    {
        $perm = $this->checkPermission('collection_centers.delete');
        if ($perm) return $perm;

        try {
            $center = CollectionCenter::findOrFail($id);
            $center->delete();

            $this->logAudit(
                'delete_collection_center',
                'collection_center',
                $id,
                "Deleted center: {$center->cc_name}"
            );

            return $this->successResponse(null, 'Collection center deleted');
        } catch (\Exception $e) {
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Restore soft-deleted center
     * Permission: collection_centers.restore
     */
    public function restore($id)
    {
        $perm = $this->checkPermission('collection_centers.restore');
        if ($perm) return $perm;

        try {
            $center = CollectionCenter::withTrashed()->findOrFail($id);
            $center->restore();

            $this->logAudit(
                'restore_collection_center',
                'collection_center',
                $id,
                "Restored center: {$center->cc_name}"
            );

            return $this->successResponse(
                $center->load('owner'),
                'Collection center restored'
            );
        } catch (\Exception $e) {
            return $this->serverError($e->getMessage());
        }
    }
}
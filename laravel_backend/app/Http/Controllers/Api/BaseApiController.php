<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class BaseApiController extends Controller
{
    /**
     * Get the authenticated user.
     */
    protected function authUser()
    {
        return Auth::user();
    }

    // in BaseApiController.php

protected function isBranchOwner(): bool
{
    return $this->hasAnyRole(['BRANCH_OWNER']);
}

protected function isStockController(): bool
{
    return $this->hasAnyRole(['STOCK_CONTROLLER']);
}

    /**
     * Check if the authenticated user has a specific permission.
     * (Checks both role-based permissions via permission_role and direct user permissions via permission_user)
     *
     * @param string $permission
     * @return bool
     */
    protected function userCan(string $permission): bool
    {
        $user = $this->authUser();
        if (!$user) {
            return false;
        }

        // Direct user permissions
        if ($user->permissions()->where('name', $permission)->exists()) {
            return true;
        }

        // Role-based permissions
        if ($user->role && $user->role->permissions()->where('name', $permission)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Check permission and return a forbidden JSON response if lacking.
     *
     * @param string $permission
     * @return \Illuminate\Http\JsonResponse|null
     */
    protected function checkPermission(string $permission): ?JsonResponse
    {
        if (!$this->userCan($permission)) {
            return $this->forbidden('Missing permission: ' . $permission);
        }
        return null;
    }

    /**
     * Check if user has any of the given roles.
     *
     * @param array $roleNames
     * @return bool
     */
    protected function hasAnyRole(array $roleNames): bool
    {
        $user = $this->authUser();
        if (!$user || !$user->role) {
            return false;
        }
        return in_array($user->role->name, $roleNames);
    }

    /**
     * Check if user has full access (Administrator or Manager).
     *
     * @return bool
     */
    protected function hasFullAccess(): bool
    {
        return $this->hasAnyRole(['ADMINISTRATOR', 'MANAGER']);
    }

    /**
     * =========================
     * SUCCESS RESPONSES
     * =========================
     */

    protected function successResponse($data = null, string $message = 'Success', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }

    protected function created($data = null, string $message = 'Resource created successfully'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], 201);
    }

    protected function noContent(string $message = 'No content'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => null
        ], 204);
    }

    /**
     * =========================
     * ERROR RESPONSES
     * =========================
     */

    protected function errorResponse(string $message, int $statusCode = 400, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $statusCode);
    }

    protected function badRequest(string $message = 'Bad request'): JsonResponse
    {
        return $this->errorResponse($message, 400);
    }

    protected function validationError($errors): JsonResponse
    {
        return $this->errorResponse('Validation failed', 422, $errors);
    }

    protected function unauthorized(string $message = 'Unauthorized access'): JsonResponse
    {
        return $this->errorResponse($message, 401);
    }

    protected function forbidden(string $message = 'Forbidden'): JsonResponse
    {
        return $this->errorResponse($message, 403);
    }

    protected function notFound(string $message = 'Resource not found'): JsonResponse
    {
        return $this->errorResponse($message, 404);
    }

    protected function conflict(string $message = 'Conflict occurred'): JsonResponse
    {
        return $this->errorResponse($message, 409);
    }

    protected function tooManyRequests(string $message = 'Too many requests'): JsonResponse
    {
        return $this->errorResponse($message, 429);
    }

    protected function requestTimeout(string $message = 'Request timeout'): JsonResponse
    {
        return $this->errorResponse($message, 408);
    }

    protected function badGateway(string $message = 'Bad gateway'): JsonResponse
    {
        return $this->errorResponse($message, 502);
    }

    protected function serviceUnavailable(string $message = 'Service unavailable'): JsonResponse
    {
        return $this->errorResponse($message, 503);
    }

    protected function gatewayTimeout(string $message = 'Gateway timeout'): JsonResponse
    {
        return $this->errorResponse($message, 504);
    }

    protected function networkError(string $message = 'Network error'): JsonResponse
    {
        return $this->errorResponse($message, 520);
    }

    protected function serverError(string $message = 'Internal server error'): JsonResponse
    {
        return $this->errorResponse($message, 500);
    }
}
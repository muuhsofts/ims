<?php

namespace App\Http\Controllers\Api;

use App\Models\UserSession;
use App\Traits\Auditable;
use Illuminate\Http\Request;

class UserSessionController extends BaseApiController
{
    use Auditable;

    /**
     * List all sessions for the authenticated user.
     */
    public function index(Request $request)
    {
        try {
            $sessions = $request->user()
                ->sessions()
                ->orderBy('last_activity', 'desc')
                ->get();

            return $this->successResponse($sessions, 'Sessions retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch sessions');
        }
    }

    /**
     * Revoke a specific session (by its ID) for the authenticated user.
     */
    public function destroy(Request $request, $sessionId)
    {
        try {
            $session = UserSession::where('user_id', $request->user()->id)
                ->where('id', $sessionId)
                ->firstOrFail();

            $session->delete();

            $this->logAudit('revoke_session', 'user_session', $sessionId, "Revoked session ID: {$sessionId}");
            return $this->successResponse(null, 'Session revoked successfully');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return $this->notFound('Session not found');
        } catch (\Exception $e) {
            return $this->serverError('Failed to revoke session');
        }
    }

    /**
     * Revoke all sessions for the authenticated user (including current? Usually current session is kept, but this method deletes all – careful).
     * Note: This will log the user out from all devices.
     */
    public function destroyAll(Request $request)
    {
        try {
            $count = $request->user()->sessions()->count();
            $request->user()->sessions()->delete();

            $this->logAudit('revoke_all_sessions', 'user_session', null, "Revoked all {$count} session(s)");
            return $this->successResponse(null, "All {$count} session(s) revoked successfully");
        } catch (\Exception $e) {
            return $this->serverError('Failed to revoke sessions');
        }
    }

    /**
     * Revoke all sessions except the current one.
     */
    public function destroyOthers(Request $request)
    {
        try {
            $currentTokenId = $request->user()->currentAccessToken()->id;

            $count = $request->user()
                ->sessions()
                ->where('token', '!=', $currentTokenId)
                ->count();

            $request->user()
                ->sessions()
                ->where('token', '!=', $currentTokenId)
                ->delete();

            $this->logAudit('revoke_other_sessions', 'user_session', null, "Revoked {$count} other session(s)");
            return $this->successResponse(null, "Revoked {$count} other session(s) successfully");
        } catch (\Exception $e) {
            return $this->serverError('Failed to revoke other sessions');
        }
    }
}
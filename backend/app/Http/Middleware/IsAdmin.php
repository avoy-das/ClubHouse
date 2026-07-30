<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class IsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json([
                'message' => 'Access denied. Admins only.',
            ], 403);
        }

        return $next($request);
    }
}